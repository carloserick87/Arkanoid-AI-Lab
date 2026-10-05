// Niveles generados por fórmula determinista.
// Usa constantes de game.js: solo se leen dentro de funciones, llamadas cuando ya existen.

const MAX_LEVEL = 10;
const LEVEL_SPEED_STEP = 16;      // px/s extra por nivel

// 6, 6, 7, 7, 8, 8, 9, 9, 10, 10
function levelRows( level ) {
  return Math.min( 5 + Math.ceil( level / 2 ), 10 );
}

// 360 px/s en el nivel 1 … 504 px/s en el nivel 10
function ballSpeed( level ) {
  return BALL_SPEED + ( level - 1 ) * LEVEL_SPEED_STEP;
}

function createLevelBricks( level ) {
  const bricks = [];
  const rows = levelRows( level );
  for ( let row = 0; row < rows; row++ ) {
    for ( let col = 0; col < BRICK_COLS; col++ ) {
      const m = Math.min( col, BRICK_COLS - 1 - col ); // columna espejo: simetría izquierda/derecha
      if ( level !== 1 && ( row + m + level ) % 4 === 0 ) continue;
      bricks.push( {
        x: BRICK_OFFSET_X + col * BRICK_W,
        y: BRICK_OFFSET_Y + row * BRICK_H,
        color: ROW_COLORS[ ( row + level - 1 ) % ROW_COLORS.length ],
        alive: true,
      } );
    }
  }
  return bricks;
}
