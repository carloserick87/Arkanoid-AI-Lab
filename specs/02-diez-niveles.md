# SPEC 02 — Diez niveles con progresión

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-10-05
> **Objective:** Al romper todos los ladrillos se pasa al siguiente de 10 niveles generados por fórmula, con más filas y bola más rápida en cada uno, y la victoria final llega tras el nivel 10.

## Alcance

**Dentro:**

- 10 niveles generados por una fórmula determinista: el nivel N es siempre igual en todas las partidas.
- El nivel 1 es idéntico al del MVP: 6 filas × 10 columnas, completo.
- Del nivel 2 en adelante: más filas según el nivel, huecos con patrón simétrico y colores rotados.
- Velocidad de la bola según el nivel: 360 px/s en el nivel 1 y +16 px/s por nivel (504 px/s en el nivel 10). Constante dentro del nivel.
- Nuevo archivo `levels.js` (script clásico) cargado antes de `game.js`.
- Nueva fase `levelClear`: al vaciar un nivel del 1 al 9 aparece el overlay "¡Nivel N superado!" con la puntuación y "Clic o Espacio para continuar".
- Al continuar, se carga el nivel N+1 en fase `serve`, con la bola pegada a la pala.
- Puntuación y vidas se arrastran entre niveles.
- Al vaciar el nivel 10: overlay "¡Victoria!" con la puntuación final.
- Game Over: el overlay muestra la puntuación y el nivel alcanzado.
- Reinicio desde "¡Victoria!" o "Game Over": nivel 1, 0 puntos, 3 vidas.
- HUD: texto `Nivel N/10` centrado en la franja superior.
- Parámetro de URL `?level=N` (entero 1–10) para empezar en el nivel N. Valor ausente o inválido → nivel 1.

**Fuera de alcance (para futuras specs):**

- Niveles diseñados a mano.
- Niveles aleatorios.
- Ladrillos de varios golpes e irrompibles (incluido el `gray`).
- Vida extra al superar un nivel.
- Reintentar el nivel actual tras Game Over.
- Pala más corta por nivel.
- Aceleración de la bola dentro de un nivel.
- Guardar el progreso o el nivel alcanzado (persistencia).
- Menú de selección de nivel.
- Bonus de puntos por completar nivel.

## Modelo de datos

```js
// levels.js
const MAX_LEVEL = 10;
const LEVEL_SPEED_STEP = 16;      // px/s extra por nivel

function levelRows(level)         // min(5 + Math.ceil(level / 2), 10) → 6,6,7,7,8,8,9,9,10,10
function ballSpeed(level)         // BALL_SPEED + (level - 1) * LEVEL_SPEED_STEP → 360..504
function createLevelBricks(level) // → [{ x, y, color, alive: true }]
```

Fórmula de `createLevelBricks(level)`:

- Filas: `levelRows(level)`. Columnas: `BRICK_COLS` (10). Misma posición y tamaño de ladrillo que en el MVP (`BRICK_OFFSET_X`, `BRICK_OFFSET_Y`, `BRICK_W`, `BRICK_H`).
- Columna espejo: `m = Math.min(col, BRICK_COLS - 1 - col)` (0–4). Garantiza simetría izquierda/derecha.
- Hay ladrillo si `level === 1` o `(row + m + level) % 4 !== 0`.
- Color: `ROW_COLORS[(row + level - 1) % ROW_COLORS.length]`. En el nivel 1 coincide con el MVP.
- Con 10 filas el último ladrillo acaba en y = 80 + 10×32 = 400, lejos de la pala (y = 560).

Cambios en `game.js`:

```js
const state = {
  phase: 'serve',                 // 'serve' | 'playing' | 'levelClear' | 'won' | 'lost'
  level: 1,                       // 1..MAX_LEVEL
  // ...resto igual que en SPEC 01
};
```

- `createBricks()` se sustituye por `createLevelBricks(state.level)`.
- Los usos de `BALL_SPEED` en el lanzamiento y en el rebote con la pala pasan a `ballSpeed(state.level)`.
- `BALL_SPEED` se mantiene como velocidad base del nivel 1.
- `levels.js` depende de las constantes de `game.js`. Solo las lee dentro de funciones, que se llaman cuando ya existen.

## Plan de implementación

1. Crear `levels.js` con `MAX_LEVEL`, `LEVEL_SPEED_STEP`, `levelRows`, `ballSpeed` y `createLevelBricks`. Cargarlo en `index.html` entre `assets/spritesheet.js` y `game.js`. En `game.js`, añadir `state.level = 1` y sustituir `createBricks()` por `createLevelBricks(state.level)` (inicio y reinicio). Prueba manual: el nivel 1 se ve y se juega igual que en el MVP.
2. Leer `?level=N` con `URLSearchParams` al arrancar. Si es un entero de 1 a 10, fijar `state.level` antes de crear los ladrillos. Si no, nivel 1. Prueba manual: abrir `index.html?level=1` a `?level=10` y ver la disposición de cada nivel. `?level=abc` y `?level=11` muestran el nivel 1.
3. Sustituir `BALL_SPEED` por `ballSpeed(state.level)` en `launchBall` y en el rebote con la pala. Añadir `Nivel N/10` centrado en el HUD. Prueba manual: con `?level=10` la bola va visiblemente más rápida y el HUD dice `Nivel 10/10`.
4. Añadir la fase `levelClear`. Al romper el último ladrillo: si `state.level < MAX_LEVEL`, fase `levelClear` y overlay "¡Nivel N superado!" con la puntuación y "Clic o Espacio para continuar". Si es el nivel 10, `endGame('won')`. Clic o Espacio en `levelClear`: `state.level++`, nuevos ladrillos, `state.explosions = []`, fase `serve`, ocultar overlay. Puntos y vidas no cambian. Prueba manual: con `?level=9`, vaciar el nivel, continuar y llegar al 10 con los mismos puntos y vidas.
5. Ajustar el fin de partida. "Game Over" muestra además `Nivel alcanzado: N`. El reinicio desde "¡Victoria!" o "Game Over" fija `state.level = 1` además de lo que ya restaura. Prueba manual: perder en el nivel 3 y ver "Nivel alcanzado: 3". Reiniciar y empezar en el nivel 1 con 0 puntos y 3 vidas.

## Criterios de aceptación

- [ x] Abrir `index.html` muestra el nivel 1 con 60 ladrillos en 6 filas de 10, igual que en el MVP, sin errores en la consola.
- [ x] El HUD muestra `Nivel N/10` con el nivel actual.
- [ x] `index.html?level=N` (N de 1 a 10) empieza en el nivel N.
- [ x] `index.html?level=0`, `?level=11` y `?level=abc` empiezan en el nivel 1.
- [ x] El número de filas por nivel es 6, 6, 7, 7, 8, 8, 9, 9, 10, 10 (niveles 1 a 10).
- [ x] Del nivel 2 al 10, la disposición de ladrillos es simétrica respecto al centro y tiene huecos.
- [ x] Recargar la página con el mismo `?level=N` muestra exactamente la misma disposición y colores.
- [ x] Ningún nivel usa ladrillos `gray`.
- [ x] La velocidad de la bola es 360 px/s en el nivel 1 y 504 px/s en el nivel 10 (`ballSpeed(1)` y `ballSpeed(10)` en la consola).
- [ x] Al vaciar un nivel del 1 al 9 aparece "¡Nivel N superado!" con la puntuación, y la bola deja de moverse.
- [ x] Desde ese overlay, clic o Espacio carga el nivel N+1 con la bola pegada a la pala.
- [ x] La puntuación y las vidas al empezar el nivel N+1 son las mismas que al terminar el nivel N.
- [ x] Al vaciar el nivel 10 aparece "¡Victoria!" con la puntuación final.
- [ x] El overlay "Game Over" muestra la puntuación y `Nivel alcanzado: N`.
- [ x] Desde "¡Victoria!" o "Game Over", clic o Espacio reinicia en el nivel 1 con 0 puntos y 3 vidas.
- [ x] El proyecto sigue sin dependencias externas ni paso de build, y funciona con `file://`.

## Decisiones

- **Sí:** niveles generados por fórmula. Lo pidió el usuario. Pocos datos y fácil de ampliar.
- **No:** niveles dibujados a mano. Más control, pero más datos que mantener. Puede ir en otra spec.
- **Sí:** fórmula determinista. Cada nivel es reproducible y se puede verificar a mano.
- **No:** aleatoriedad, con o sin semilla. Impide verificar los niveles y la semilla exige un PRNG propio.
- **Sí:** el nivel 1 es el del MVP. No rompe los criterios de SPEC 01.
- **Sí:** filas `min(5 + ceil(N/2), 10)`. Crecen de forma suave y el muro acaba en y = 400, lejos de la pala.
- **Sí:** huecos con columna espejo. Disposición simétrica, como en el Arkanoid clásico.
- **Sí:** colores rotados por nivel con `ROW_COLORS`, sin `gray`. El `gray` se reserva para ladrillos especiales.
- **Sí:** +16 px/s por nivel (360 → 504). Con `dt` máximo de 1/30 s avanza 16,8 px por frame, menos que la suma de la bola y la pala (30 px) o un ladrillo (48 px), así que no hay túnel.
- **No:** +10 % por nivel. Llega a ~849 px/s y exigiría sub-pasos contra el túnel.
- **No:** pala más corta. Rompe el tamaño nativo del sprite.
- **Sí:** overlay entre niveles con espera a clic o Espacio. Reutiliza el overlay existente y da un respiro al jugador.
- **No:** pausa automática o transición inmediata.
- **Sí:** puntos y vidas acumulados. Game Over reinicia desde el nivel 1. Lo pidió el usuario.
- **No:** vida extra por nivel ni reintento del nivel actual.
- **Sí:** `levels.js` separado, como script clásico. Mantiene `game.js` enfocado y funciona con `file://`.
- **No:** ES modules. Igual que en SPEC 01.
- **Sí:** parámetro `?level=N` para pruebas. Permite verificar los niveles altos y la victoria final sin jugar los anteriores.
- **No:** tecla de depuración para saltar de nivel. Se puede pulsar sin querer durante la partida.
- **Sí:** el reinicio siempre vuelve al nivel 1, aunque se empezara con `?level=N`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Túnel a 504 px/s con un `dt` grande | `dt` limitado a 1/30 s: 16,8 px por frame, menos que la pala más la bola (30 px) y un ladrillo más la bola (48 px). |
| `levels.js` usa constantes de `game.js` que aún no existen | Solo se leen dentro de funciones, llamadas después de cargar `game.js`. |
| Un nivel con huecos queda sin ladrillos o casi vacío | La regla `% 4` quita como mucho una de cada cuatro celdas. Se comprueba con `?level=N` en cada nivel. |
| Clic o Espacio de más salta el overlay de nivel sin verlo | Espacio ignora `e.repeat`, como en SPEC 01. El overlay solo avanza con una pulsación nueva. |
| Explosiones del nivel anterior visibles en el siguiente | Se vacía `state.explosions` al cargar cada nivel. |

## Lo que **no** está en esta spec

- Niveles diseñados a mano o aleatorios.
- Ladrillos de varios golpes o irrompibles.
- Vida extra o bonus por nivel.
- Reintentar el nivel tras Game Over.
- Pala más corta o aceleración dentro del nivel.
- Persistencia del progreso.
- Menú de selección de nivel.

Cada una de estas, si llega, va en su propia spec.
