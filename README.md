# HELL ON EARTH — Beta 0.9.0

A 30 vs 30 combined-arms browser FPS set in a destroyed city. Pick Ukraine or Russia, choose one of six operators, and fight for the central sector with 59 bots, driveable tanks, ATVs and armoured transports.

Built by **Dog Productive** with three.js and the Web Audio API. No engine, no plugins — it runs in the browser on desktop and mobile.

## Play

The playable build is in `site/play/` and is deployed with the marketing site.

```bash
npm install
npm run dev     # http://localhost:3006
npm run build   # static build in dist/
```

## Features

- **30 v 30** — you plus 29 allied bots against 30 enemy bots, 250 tickets per side, 15-minute clock.
- **Six operators** — Rifleman, Gunner, Marksman, Drone Operator, Tank Driver, Tank Commander, each with a squad ability.
- **Combined arms** — T-64BM / T-72B3 tanks with a 125 mm main gun, QUAD-ATV and MT-LB transport, all enterable with `F` and drivable, with turrets that track your aim.
- **Armory** — five primaries, a sidearm, four attachment slots, live 3D preview and stat changes.
- **PC and mobile controls** — chosen at deploy; keyboard/mouse with pointer lock, or touch sticks and buttons.
- **Voice comms** — ElevenLabs-synthesized lines fire when a soldier runs dry; the announcer calls the match and armour.
- **Opening cinematic** — flash, Dog Productive title card, and two training dummies.

## Stack

| Layer | Choice |
| --- | --- |
| Rendering | three.js 0.169 |
| Build | Vite 5 |
| Audio | Web Audio synthesis + ElevenLabs voice lines |
| Website | Static HTML/CSS/JS in `site/` |
| Hosting | Vercel |

## Controls

| Input | Action |
| --- | --- |
| `W A S D` | Move |
| `Shift` | Sprint |
| `Space` | Jump / main gun |
| `LMB` / `RMB` | Fire / aim |
| `R` | Reload |
| `F` | Enter or exit a vehicle |
| `Q` | Operator ability |
| `V` | Call for a resupply |
| `1` / `2` | Primary / sidearm |
| `Esc` | Pause |

Mobile controls are shown when **Mobile / touch** is selected on the operator screen.

## Project layout

```
index.html          game shell + HUD
src/main.js         bootstrap and state machine
src/game.js         match engine, bots, vehicles, abilities, HUD
src/world.js        destroyed city generation and collision
src/models.js       low-poly soldiers, weapons and vehicles
src/intro.js        opening cinematic
src/ui.js           menus, operator select, armory, settings
src/audio.js        Web Audio sound design + voice playback
public/audio/       synthesized voice lines
site/               marketing site (deployed to Vercel)
```

## Beta notes

This build is openly labelled beta. There is no online multiplayer yet — both teams are bots. Character and vehicle models are hand-built low-poly geometry in the reference style; an external model-generation pipeline was unavailable for this build. Voice lines are AI-synthesized. All soldiers, units and events depicted are fictional.

© 2026 Dog Productive.
