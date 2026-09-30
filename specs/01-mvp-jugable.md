# SPEC 01 — MVP jugable de Arkanoid

> **Status:** Borrador
> **Depends on:** —
> **Date:** 2026-09-29
> **Objective:** Un nivel único de Arkanoid jugable en el navegador, con pala, bola, ladrillos, 3 vidas, puntuación y overlay de victoria/game over.

## Alcance

**Dentro:**

- Página de entrada `index.html` en la raíz, con un canvas fijo de 800×600 px centrado.
- Un único nivel de 6 filas × 10 columnas de ladrillos, una fila por color.
- Pala controlada con ratón y teclado a la vez (flechas ←/→ y A/D).
- Bola pegada a la pala al inicio y tras perder una vida; se lanza con Espacio o clic.
- Rebote especular en paredes y ladrillos; en la pala, ángulo según el punto de impacto. Velocidad de la bola constante.
- Cada ladrillo se rompe de un golpe y suma 10 puntos.
- Animación de explosión del ladrillo (`EXPLOSION_FRAMES`, 150 ms).
- Sonidos: `ball-bounce.mp3` al rebotar en paredes y pala; `break-sound.mp3` al romper un ladrillo.
- 3 vidas. Si la bola cae por debajo del canvas, se pierde una vida.
- HUD dentro del canvas con la puntuación y las vidas.
- Overlay HTML de victoria (sin ladrillos) y de game over (0 vidas), con la puntuación final.
- Reinicio desde el overlay con clic o Espacio.

**Fuera de alcance (para futuras specs):**

- Varios niveles.
- Power-ups y ladrillos de varios golpes (incluido el `gray`).
- Pausa.
- High-scores y cualquier persistencia.
- Controles táctiles y versión móvil.
- Canvas responsive o escalado.
- Pantalla de inicio o menú.
- Aumento de velocidad progresivo.

## Modelo de datos

```js
// Constantes (game.js)
const CANVAS_W = 800;
const CANVAS_H = 600;

const BRICK_COLS = 10;
const BRICK_ROWS = 6;
const BRICK_W = 64;               // 2× el sprite de 32×16
const BRICK_H = 32;
const BRICK_OFFSET_X = 80;        // (800 - 10*64) / 2
const BRICK_OFFSET_Y = 80;
const ROW_COLORS = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green'];

const PADDLE_W = 162;             // tamaño nativo del sprite
const PADDLE_H = 14;
const PADDLE_Y = CANVAS_H - 40;
const PADDLE_SPEED = 480;         // px/s con teclado

const BALL_SIZE = 16;
const BALL_SPEED = 360;           // px/s, constante
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60° respecto a la vertical

const START_LIVES = 3;
const POINTS_PER_BRICK = 10;

// Estado del juego
const state = {
  phase: 'serve',                 // 'serve' | 'playing' | 'won' | 'lost'
  score: 0,
  lives: START_LIVES,
  paddle: { x: 0 },               // x = borde izquierdo
  ball: { x: 0, y: 0, vx: 0, vy: 0 }, // x, y = esquina superior izquierda
  bricks: [ /* { x, y, color, alive: true } */ ],
  explosions: [ /* { x, y, color, start } */ ], // start = timestamp en ms
  input: { left: false, right: false },
};
```

Convenciones:

- Origen de coordenadas arriba a la izquierda.
- Velocidades en px/s, multiplicadas por `dt` (segundos) en cada frame. `dt` limitado a 1/30 s para evitar saltos tras cambiar de pestaña.
- En la fase `serve`, la bola sigue a la pala, centrada sobre ella.
- El ratón fija la pala con su centro en el cursor. El teclado la desplaza. Gana la última entrada. La pala siempre queda dentro del canvas.

## Plan de implementación

1. Crear `index.html` (canvas `#game` de 800×600 y un `#overlay` oculto), `style.css` (fondo oscuro, canvas centrado, overlay posicionado sobre el canvas) y `game.js` con el bucle `requestAnimationFrame` que limpia el canvas. Cargar `assets/spritesheet.js` antes de `game.js` y arrancar el bucle desde `loadSpritesheet`. Prueba manual: abrir la página y ver el canvas vacío, sin errores en la consola.
2. Añadir la pala: dibujo con `drawSprite(ctx, 'paddle', ...)`, control con teclado (←/→, A/D) y ratón (`mousemove` sobre el canvas), limitada a los bordes. Prueba manual: mover la pala con ambos métodos.
3. Añadir la bola: fase `serve` pegada a la pala; lanzamiento con Espacio o clic hacia arriba; rebote en las paredes izquierda, derecha y superior; rebote en la pala con ángulo según el impacto (`offset` normalizado de -1 a 1 × `MAX_BOUNCE_ANGLE`, manteniendo `BALL_SPEED`). Si la bola cae por abajo, vuelve a `serve`. Prueba manual: lanzar y rebotar.
4. Añadir los ladrillos: generar la cuadrícula de 6×10 desde `ROW_COLORS`, dibujarlos con `drawSprite(ctx, 'block_<color>', ...)`, colisión AABB bola-ladrillo (un ladrillo como máximo por frame; se invierte `vx` o `vy` según el eje de menor penetración), `alive = false` y `score += 10`. Prueba manual: romper ladrillos.
5. Añadir las explosiones y los sonidos: al romper un ladrillo, se añade la entrada a `state.explosions` y se dibujan los 4 frames con `drawFrame` durante `EXPLOSION_DURATION`; después se elimina. Crear `new Audio()` para los dos mp3 y reproducirlos en los eventos del alcance (`currentTime = 0` antes de `play()`, e ignorar el rechazo de la promesa). Prueba manual: ver la animación y oír los sonidos.
6. Añadir las vidas y el HUD: perder una vida cuando la bola cae; dibujar `Puntos: N` y `Vidas: N` en la franja superior (y < 60). Prueba manual: dejar caer la bola y ver cómo bajan las vidas.
7. Añadir el overlay y el reinicio: con 0 vidas, fase `lost` y overlay "Game Over". Sin ladrillos vivos, fase `won` y overlay "¡Victoria!". Ambos muestran la puntuación final y "Clic o Espacio para jugar de nuevo". Al reiniciar se restauran la puntuación, las vidas y los ladrillos, se vuelve a `serve` y se oculta el overlay. Prueba manual: ganar y perder, y reiniciar.

## Criterios de aceptación

- [ x ] Abrir `index.html` (con doble clic o con `python3 -m http.server`) muestra el juego sin errores en la consola.
- [ x ] El canvas mide exactamente 800×600 px y está centrado en la ventana.
- [ x ] Se ven 60 ladrillos en 6 filas de 10, cada fila de un color distinto.
- [ x ] La pala se mueve con el ratón y con ←/→ y A/D, y ambos métodos funcionan en la misma partida.
- [ x ] La pala nunca sale del canvas.
- [ x ] Al empezar y tras perder una vida, la bola está pegada a la pala y sale al pulsar Espacio o hacer clic.
- [ ] La bola rebota en las paredes izquierda, derecha y superior, y suena `ball-bounce.mp3`.
- [ x ] Golpear la pala cerca del borde desvía la bola más que golpearla en el centro.
- [ ] Romper un ladrillo lo elimina, suma exactamente 10 puntos, reproduce `break-sound.mp3` y muestra la animación de explosión.
- [ x ] Si la bola cae por debajo del canvas, las vidas bajan en 1.
- [ x ] El HUD muestra la puntuación y las vidas actuales.
- [ x ] Con 0 vidas aparece el overlay "Game Over" con la puntuación final.
- [ x ] Al romper los 60 ladrillos aparece el overlay "¡Victoria!" con 600 puntos.
- [ ] Desde cualquier overlay, un clic o Espacio reinicia con 0 puntos, 3 vidas y 60 ladrillos.
- [ ] El proyecto no tiene dependencias externas ni paso de build.

## Decisiones

- **Sí:** tres archivos (`index.html`, `style.css`, `game.js`) como scripts clásicos. Mantienen el estilo de `spritesheet.js` y funcionan con `file://`.
- **No:** varios archivos en `src/`. Es demasiada estructura para el tamaño del MVP.
- **No:** ES modules. Requieren un servidor local.
- **Sí:** canvas fijo de 800×600 px. Lo pidió el usuario.
- **No:** canvas responsive. Queda para otra spec.
- **Sí:** 6×10 ladrillos de 64×32 (2× el sprite), centrados. Encajan en 800 px con márgenes de 80 px.
- **Sí:** una fila por color, sin `gray`. Sus `EXPLOSION_FRAMES` repiten los de `red`, y el gray suele ser el ladrillo irrompible (fuera de alcance).
- **Sí:** pala al tamaño nativo del sprite (162×14), para evitar la distorsión.
- **Sí:** rebote especular en paredes y ladrillos, y ángulo por impacto en la pala. Da una física predecible y control al jugador, como en el Arkanoid clásico.
- **No:** rebote especular también en la pala. Quita control al jugador.
- **Sí:** velocidad constante de la bola.
- **No:** aceleración progresiva. Queda fuera del MVP.
- **Sí:** movimiento basado en `dt` (px/s). Así el juego va igual a 60 Hz y a 144 Hz.
- **Sí:** ratón y teclado a la vez, gana la última entrada. Lo pidió el usuario.
- **Sí:** overlay como `div` HTML sobre el canvas. Es sencillo de maquetar con CSS y se separa del render del juego.
- **Sí:** reinicio con clic o Espacio desde el overlay.
- **No:** pausa. Fuera del MVP.
- **Sí:** 10 puntos por ladrillo, sin bonus. Lo pidió el usuario.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El navegador bloquea el audio antes de la primera interacción | Los sonidos solo suenan tras el lanzamiento (clic o tecla). Se ignora el rechazo de `play()`. |
| Sonidos solapados al encadenar rebotes rápidos | Se hace `currentTime = 0` antes de cada `play()`. Si no basta, se clona el `Audio` en otra spec. |
| Túnel: la bola atraviesa un ladrillo con un `dt` grande | Se limita `dt` a 1/30 s. A 360 px/s el avance máximo es de 12 px por frame, menos que `BALL_SIZE` y `BRICK_H`. |
| La bola queda atrapada rebotando en horizontal | El ángulo en la pala está acotado a 60° respecto a la vertical, así que siempre hay componente vertical. |
| El spritesheet no carga (ruta relativa) | `index.html` está en la raíz, como exige la ruta de `spritesheet.js`. |

## Lo que **no** está en esta spec

- Varios niveles.
- Power-ups y ladrillos irrompibles o de varios golpes.
- Pausa.
- High-scores y persistencia.
- Controles táctiles o versión móvil.
- Escalado o canvas responsive.
- Menú o pantalla de inicio.

Cada una de estas, si llega, va en su propia spec.
