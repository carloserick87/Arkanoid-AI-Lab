# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser Arkanoid/Breakout game in plain HTML, CSS and JavaScript with **zero dependencies** (no npm, no bundler, no build step, no test framework). The README is in Spanish. As of now, only assets exist; the game itself is not implemented yet.

## Running

No build. Open the HTML entry page in a browser, or serve the repo root with any static server (e.g. `python3 -m http.server`) and open it there.

## Existing assets (`assets/`)

- `spritesheet.js` is a classic script (no ES modules). It defines globals:
  - `SPRITES`: source rects (`sx, sy, sw, sh`) for `paddle`, `ball`, and `blocks.<color>`. Colors: gray, red, yellow, cyan, magenta, hotpink, green.
  - `EXPLOSION_FRAMES.<color>`: 4-frame brick-break animation per color. `EXPLOSION_DURATION = 150` (ms).
  - `loadSpritesheet(cb)`: loads the image once and queues callbacks until it is ready.
  - `drawSprite(ctx, name, x, y, w, h)`: `name` is `'paddle'`, `'ball'`, or `'block_<color>'`.
  - `drawFrame(ctx, frame, x, y, w, h)`: draws one explosion frame.
  - Both draw functions do nothing until the sheet has loaded.
- The spritesheet path is hardcoded as `'assets/spritesheet-breakout.png'`, relative to the page. So the HTML entry page must be at the repo root, and `spritesheet.js` must be loaded before the game code.
- `sounds/ball-bounce.mp3` and `sounds/break-sound.mp3` are the sound effects.

## Workflow: spec-driven development

Features follow a spec-first flow using the project skills in `.claude/skills/`. These are symlinks to `.agents/skills/`, installed from `Klerith/fernando-skills` via `skills-lock.json`.

- `/spec <description>`: asks clarifying questions, then writes `specs/NN-slug.md` in `Draft` state. It never writes code. It uses `.agents/skills/spec/template.md` as the structure. It seeds `specs/.spec-config.yml` (`AutoCreateBranch`).
- `/spec-impl <NN-slug>`: only runs on specs whose status means "Approved" (the human changes the status, never the agent). It creates or switches to the branch `spec-NN-slug`, then implements the plan one step at a time, pausing for diff review after each step. It never commits automatically. Anything outside the spec's scope goes into a future spec, not the code.
- Specs use the same language as the prompt that created them. Keep headings and status words consistent with existing specs.
- Note: the repo is not a git repository yet. `/spec-impl` needs git for branching.
