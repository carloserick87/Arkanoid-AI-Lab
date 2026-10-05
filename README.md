# Arkanoid

Juego de Arkanoid/Breakout para el navegador hecho con HTML, CSS y JavaScript, con **cero dependencias**: sin npm, sin bundler y sin paso de build.

## Cómo jugar

1. Abre `index.html` directamente en el navegador (`file://` funciona), o sirve la raíz del repo con cualquier servidor estático:

   ```bash
   python3 -m http.server
   ```

2. Para empezar en un nivel concreto añade `?level=N` (1–10) a la URL, por ejemplo `index.html?level=5`.

## Controles

| Acción | Teclado | Ratón / táctil |
| --- | --- | --- |
| Mover la paleta | ← / → o A / D | Mover el ratón, botones ◀ / ▶ |
| Lanzar / continuar / reiniciar | Espacio | Clic, botón ● |
| Pausa | P o Esc | Botón ❚❚ |

Los botones táctiles solo se muestran en pantallas táctiles. Desde el menú de pausa también puedes saltar a cualquier nivel.

## Reglas

- Empiezas con 3 vidas; pierdes una cada vez que la bola cae por debajo de la paleta.
- Cada ladrillo roto suma 10 puntos.
- Al romper todos los ladrillos pasas al siguiente nivel; superar el nivel 10 gana la partida.
- Los 10 niveles se generan con una fórmula determinista: cada nivel tiene más filas (de 6 a 10), un patrón simétrico de huecos y una bola más rápida (de 360 a 504 px/s).

## Estructura

```
index.html              Página de entrada (debe quedarse en la raíz)
style.css               Estilos, overlay y controles táctiles
levels.js               Generación de niveles y velocidad por nivel
game.js                 Estado, input, lógica, render y bucle principal
assets/
  spritesheet.js        Datos de sprites y funciones de dibujo
  spritesheet-breakout.png
  sounds/               Sonidos de rebote y de ladrillo roto
specs/                  Especificaciones de cada funcionalidad
```

Los scripts son clásicos (no módulos ES) y comparten globales, así que el orden de carga en `index.html` importa: `spritesheet.js` → `levels.js` → `game.js`.

## Desarrollo guiado por specs

Cada funcionalidad empieza como una spec en `specs/`, escrita en español, y no se escribe código sin una spec aprobada.

| Spec | Descripción | Estado |
| --- | --- | --- |
| [01](specs/01-mvp-jugable.md) | MVP jugable de Arkanoid | Implementado |
| [02](specs/02-diez-niveles.md) | Diez niveles con progresión | Implementado |

No hay tests automatizados: cada paso se verifica manualmente en el navegador según el plan de su spec.
