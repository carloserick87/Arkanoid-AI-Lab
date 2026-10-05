const CANVAS_W = 800;
const CANVAS_H = 600;

const BRICK_COLS = 10;
const BRICK_ROWS = 6;
const BRICK_W = 64;               // 2× el sprite de 32×16
const BRICK_H = 32;
const BRICK_OFFSET_X = 80;        // (800 - 10*64) / 2
const BRICK_OFFSET_Y = 80;
const ROW_COLORS = [ 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green' ];

const PADDLE_W = 81;              // mitad del sprite nativo (162)
const PADDLE_H = 14;
const PADDLE_Y = CANVAS_H - 40;
const PADDLE_SPEED = 480;         // px/s con teclado

const BALL_SIZE = 16;
const BALL_SPEED = 360;           // px/s, constante
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60° respecto a la vertical

const START_LIVES = 3;
const LIFE_ICON_GAP = 6;          // separación entre bolas del HUD
const POINTS_PER_BRICK = 10;

const MAX_DT = 1 / 30;

const state = {
  phase: 'serve',                 // 'serve' | 'playing' | 'paused' | 'levelClear' | 'won' | 'lost'
  pausedFrom: null,               // fase a la que vuelve al reanudar ('serve' | 'playing')
  level: 1,                       // 1..MAX_LEVEL
  score: 0,
  lives: START_LIVES,
  paddle: { x: ( CANVAS_W - PADDLE_W ) / 2 }, // x = borde izquierdo
  ball: { x: 0, y: 0, vx: 0, vy: 0 }, // x, y = esquina superior izquierda
  bricks: [],                     // { x, y, color, alive }
  explosions: [],                 // { x, y, color, start }, start = timestamp en ms
  input: { left: false, right: false },
};

// ?level=N (entero 1..MAX_LEVEL) para empezar en el nivel N; si no, nivel 1
const startLevel = Number( new URLSearchParams( location.search ).get( 'level' ) );
if ( Number.isInteger( startLevel ) && startLevel >= 1 && startLevel <= MAX_LEVEL ) {
  state.level = startLevel;
}

state.bricks = createLevelBricks( state.level );

const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );
const overlay = document.getElementById( 'overlay' );

const bounceSound = new Audio( 'assets/sounds/ball-bounce.mp3' );
const breakSound = new Audio( 'assets/sounds/break-sound.mp3' );

function playSound( sound ) {
  sound.currentTime = 0;
  sound.play().catch( () => {} );
}

let lastTime = 0;

function clampPaddle() {
  state.paddle.x = Math.max( 0, Math.min( state.paddle.x, CANVAS_W - PADDLE_W ) );
}

function launchBall() {
  if ( state.phase !== 'serve' ) return;
  state.ball.vx = 0;
  state.ball.vy = -ballSpeed( state.level );
  state.phase = 'playing';
}

function showOverlay( title, lines, extra = [] ) {
  const heading = document.createElement( 'h1' );
  heading.textContent = title;
  const paragraphs = lines.map( ( text ) => {
    const p = document.createElement( 'p' );
    p.textContent = text;
    return p;
  } );
  overlay.replaceChildren( heading, ...paragraphs, ...extra );
  overlay.hidden = false;
}

function endGame( phase ) {
  state.phase = phase;
  const lines = [ `Puntuación: ${ state.score }` ];
  if ( phase === 'lost' ) lines.push( `Nivel alcanzado: ${ state.level }` );
  lines.push( 'Clic o Espacio para jugar de nuevo' );
  showOverlay( phase === 'won' ? '¡Victoria!' : 'Game Over', lines );
}

function clearLevel() {
  state.phase = 'levelClear';
  showOverlay( `¡Nivel ${ state.level } superado!`, [
    `Puntuación: ${ state.score }`,
    'Clic o Espacio para continuar',
  ] );
}

// Puntos y vidas se mantienen entre niveles
function nextLevel() {
  if ( state.phase !== 'levelClear' ) return;
  state.level++;
  state.bricks = createLevelBricks( state.level );
  state.explosions = [];
  state.phase = 'serve';
  overlay.hidden = true;
}

function isGameOver() {
  return state.phase === 'won' || state.phase === 'lost';
}

function restart() {
  if ( !isGameOver() ) return;
  state.level = 1;
  state.score = 0;
  state.lives = START_LIVES;
  state.bricks = createLevelBricks( state.level );
  state.phase = 'serve';
  overlay.hidden = true;
}

function canPause() {
  return state.phase === 'serve' || state.phase === 'playing';
}

function pause() {
  if ( !canPause() ) return;
  state.pausedFrom = state.phase;
  state.phase = 'paused';
  state.input.left = false;
  state.input.right = false;

  const resumeButton = document.createElement( 'button' );
  resumeButton.textContent = 'Continuar';
  resumeButton.addEventListener( 'click', resume );

  const levelLabel = document.createElement( 'p' );
  levelLabel.textContent = 'Cambiar de nivel (reinicia puntos y vidas):';

  const levelGrid = document.createElement( 'div' );
  levelGrid.className = 'level-grid';
  for ( let level = 1; level <= MAX_LEVEL; level++ ) {
    const button = document.createElement( 'button' );
    button.textContent = level;
    if ( level === state.level ) button.className = 'current';
    button.addEventListener( 'click', () => changeLevel( level ) );
    levelGrid.append( button );
  }

  showOverlay( 'Pausa', [], [ resumeButton, levelLabel, levelGrid ] );
}

function resume() {
  if ( state.phase !== 'paused' ) return;
  state.phase = state.pausedFrom;
  state.pausedFrom = null;
  overlay.hidden = true;
}

function togglePause() {
  if ( state.phase === 'paused' ) resume();
  else pause();
}

// Empezar en otro nivel: partida nueva desde ese nivel
function changeLevel( level ) {
  if ( state.phase !== 'paused' ) return;
  state.level = level;
  state.score = 0;
  state.lives = START_LIVES;
  state.bricks = createLevelBricks( level );
  state.explosions = [];
  state.phase = 'serve';
  state.pausedFrom = null;
  overlay.hidden = true;
}

// Espacio / botón táctil de acción: lanzar, continuar o reiniciar según la fase
function primaryAction() {
  if ( state.phase === 'paused' ) resume();
  else if ( isGameOver() ) restart();
  else if ( state.phase === 'levelClear' ) nextLevel();
  else launchBall();
}

const PAUSE_KEYS = [ 'KeyP', 'Escape' ];
const LEFT_KEYS = [ 'ArrowLeft', 'KeyA' ];
const RIGHT_KEYS = [ 'ArrowRight', 'KeyD' ];

function handleKey( e, pressed ) {
  if ( PAUSE_KEYS.includes( e.code ) ) {
    if ( pressed && !e.repeat ) togglePause();
  } else if ( state.phase === 'paused' ) {
    if ( e.code !== 'Space' ) return;
    if ( pressed && !e.repeat ) resume();
  } else if ( LEFT_KEYS.includes( e.code ) ) {
    state.input.left = pressed;
  } else if ( RIGHT_KEYS.includes( e.code ) ) {
    state.input.right = pressed;
  } else if ( e.code === 'Space' ) {
    if ( pressed && !e.repeat ) primaryAction();
  } else {
    return;
  }
  e.preventDefault();
}

document.addEventListener( 'keydown', ( e ) => handleKey( e, true ) );
document.addEventListener( 'keyup', ( e ) => handleKey( e, false ) );

// Ratón y táctil; el canvas puede estar escalado por CSS
function movePaddleTo( e ) {
  if ( state.phase === 'paused' ) return;
  const rect = canvas.getBoundingClientRect();
  state.paddle.x = ( e.clientX - rect.left ) * CANVAS_W / rect.width - PADDLE_W / 2;
  clampPaddle();
}

canvas.addEventListener( 'pointermove', movePaddleTo );
canvas.addEventListener( 'pointerdown', movePaddleTo );

canvas.addEventListener( 'click', launchBall );

// Botones táctiles de dirección: mover mientras se mantienen pulsados
function bindHoldButton( id, dir ) {
  const button = document.getElementById( id );
  const release = () => { state.input[ dir ] = false; };
  button.addEventListener( 'pointerdown', ( e ) => {
    e.preventDefault();
    if ( state.phase === 'paused' ) return;
    button.setPointerCapture( e.pointerId );
    state.input[ dir ] = true;
  } );
  button.addEventListener( 'pointerup', release );
  button.addEventListener( 'pointercancel', release );
  button.addEventListener( 'lostpointercapture', release );
  button.addEventListener( 'contextmenu', ( e ) => e.preventDefault() );
}

bindHoldButton( 'left-button', 'left' );
bindHoldButton( 'right-button', 'right' );
document.getElementById( 'action-button' ).addEventListener( 'click', primaryAction );
document.getElementById( 'pause-button' ).addEventListener( 'click', togglePause );
overlay.addEventListener( 'click', () => {
  if ( state.phase === 'levelClear' ) nextLevel();
  else restart();
} );

function stickBallToPaddle() {
  state.ball.x = state.paddle.x + ( PADDLE_W - BALL_SIZE ) / 2;
  state.ball.y = PADDLE_Y - BALL_SIZE;
}

// Un ladrillo como máximo por frame; se invierte el eje de menor penetración.
function collideBricks() {
  const ball = state.ball;
  for ( const brick of state.bricks ) {
    if ( !brick.alive ) continue;

    const overlapLeft = ball.x + BALL_SIZE - brick.x;
    const overlapRight = brick.x + BRICK_W - ball.x;
    const overlapTop = ball.y + BALL_SIZE - brick.y;
    const overlapBottom = brick.y + BRICK_H - ball.y;
    if ( overlapLeft <= 0 || overlapRight <= 0 || overlapTop <= 0 || overlapBottom <= 0 ) continue;

    const overlapX = Math.min( overlapLeft, overlapRight );
    const overlapY = Math.min( overlapTop, overlapBottom );
    if ( overlapX < overlapY ) {
      ball.vx = overlapLeft < overlapRight ? -Math.abs( ball.vx ) : Math.abs( ball.vx );
    } else {
      ball.vy = overlapTop < overlapBottom ? -Math.abs( ball.vy ) : Math.abs( ball.vy );
    }

    brick.alive = false;
    state.score += POINTS_PER_BRICK;
    return brick;
  }
  return null;
}

function updateBall( dt ) {
  const ball = state.ball;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Paredes
  let hitWall = false;
  if ( ball.x < 0 ) {
    ball.x = 0;
    ball.vx = Math.abs( ball.vx );
    hitWall = true;
  } else if ( ball.x + BALL_SIZE > CANVAS_W ) {
    ball.x = CANVAS_W - BALL_SIZE;
    ball.vx = -Math.abs( ball.vx );
    hitWall = true;
  }
  if ( ball.y < 0 ) {
    ball.y = 0;
    ball.vy = Math.abs( ball.vy );
    hitWall = true;
  }
  if ( hitWall ) playSound( bounceSound );

  const brick = collideBricks();
  if ( brick ) {
    state.explosions.push( { x: brick.x, y: brick.y, color: brick.color, start: performance.now() } );
    playSound( breakSound );
    if ( !state.bricks.some( ( b ) => b.alive ) ) {
      if ( state.level < MAX_LEVEL ) clearLevel();
      else endGame( 'won' );
      return;
    }
  }

  // Pala: ángulo según el punto de impacto
  if (
    ball.vy > 0 &&
    ball.y + BALL_SIZE >= PADDLE_Y &&
    ball.y < PADDLE_Y + PADDLE_H &&
    ball.x + BALL_SIZE > state.paddle.x &&
    ball.x < state.paddle.x + PADDLE_W
  ) {
    const ballCenter = ball.x + BALL_SIZE / 2;
    const paddleCenter = state.paddle.x + PADDLE_W / 2;
    const offset = Math.max( -1, Math.min( ( ballCenter - paddleCenter ) / ( PADDLE_W / 2 ), 1 ) );
    const angle = offset * MAX_BOUNCE_ANGLE;
    const speed = ballSpeed( state.level );
    ball.vx = speed * Math.sin( angle );
    ball.vy = -speed * Math.cos( angle );
    playSound( bounceSound );
    ball.y = PADDLE_Y - BALL_SIZE;
  }

  // Cae por abajo
  if ( ball.y > CANVAS_H ) {
    state.lives--;
    if ( state.lives <= 0 ) endGame( 'lost' );
    else state.phase = 'serve';
  }
}

function update( dt ) {
  if ( state.phase === 'paused' ) return;

  const dir = ( state.input.right ? 1 : 0 ) - ( state.input.left ? 1 : 0 );
  if ( dir !== 0 ) {
    state.paddle.x += dir * PADDLE_SPEED * dt;
    clampPaddle();
  }

  if ( state.phase === 'serve' ) {
    stickBallToPaddle();
  } else if ( state.phase === 'playing' ) {
    updateBall( dt );
  }

  const now = performance.now();
  state.explosions = state.explosions.filter( ( ex ) => now - ex.start < EXPLOSION_DURATION );
}

function renderExplosions() {
  const now = performance.now();
  for ( const ex of state.explosions ) {
    const frames = EXPLOSION_FRAMES[ ex.color ];
    const index = Math.min( Math.floor( ( now - ex.start ) / EXPLOSION_DURATION * frames.length ), frames.length - 1 );
    drawFrame( ctx, frames[ index ], ex.x, ex.y, BRICK_W, BRICK_H );
  }
}

// HUD en la franja superior (y < 60)
function renderHud() {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText( `Puntos: ${ state.score }`, 20, 30 );

  ctx.textAlign = 'center';
  ctx.fillText( `Nivel ${ state.level }/${ MAX_LEVEL }`, CANVAS_W / 2, 30 );

  // Vidas como sprites de la bola, alineadas a la derecha
  const livesRight = CANVAS_W - 20;
  const livesLeft = livesRight - state.lives * ( BALL_SIZE + LIFE_ICON_GAP ) + LIFE_ICON_GAP;
  for ( let i = 0; i < state.lives; i++ ) {
    const x = livesLeft + i * ( BALL_SIZE + LIFE_ICON_GAP );
    drawSprite( ctx, 'ball', x, 30 - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE );
  }
  ctx.textAlign = 'right';
  ctx.fillText( 'Vidas:', livesLeft - 10, 30 );
}

function render() {
  ctx.clearRect( 0, 0, CANVAS_W, CANVAS_H );
  for ( const brick of state.bricks ) {
    if ( brick.alive ) drawSprite( ctx, `block_${ brick.color }`, brick.x, brick.y, BRICK_W, BRICK_H );
  }
  renderExplosions();
  drawSprite( ctx, 'paddle', state.paddle.x, PADDLE_Y, PADDLE_W, PADDLE_H );
  drawSprite( ctx, 'ball', state.ball.x, state.ball.y, BALL_SIZE, BALL_SIZE );
  renderHud();
}

function loop( now ) {
  const dt = Math.max( 0, Math.min( ( now - lastTime ) / 1000, MAX_DT ) );
  lastTime = now;

  update( dt );
  render();

  requestAnimationFrame( loop );
}

loadSpritesheet( () => {
  lastTime = performance.now();
  requestAnimationFrame( loop );
} );
