# Mathopia

Play. Explore. Learn maths. Interactive maths teaching tools and games for the whole class, built with Next.js.

| Page | Tool |
|---|---|
| `/` | Home – all tools |
| `/ten-frames` | Ten Frames: Explore, Flash & Say, Make Ten, Show Me! |
| `/place-value` | Place Value Workshop: Workshop, Build It, Count It, Trade It |
| `/measurement` | Measurement: Length, Mass, Capacity, Area |
| `/shapes` | 2D Shapes & 3D Objects: Explore & Count, Sorting Game, Race to the Top |

Open a tab directly with a hash, e.g. `/shapes#race` or `/measurement#capacity`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000 while editing
npm run build && npm start   # production
```

## Where things live

- `app/layout.js` – shared shell (top bar with links to every tool, sound toggle, font)
- `app/page.js` – home page
- `app/[tool]/page.js` – one route per tool (listed in `lib/tools.js`)
- `components/ToolPage.js` – mounts a tool's markup and starts its game engine
- `lib/games/*.js` – each tool's markup and game logic
- `lib/common.js` – shared helpers: sounds, confetti, tabs, answer buttons
- `app/styles/*.css` – per-tool styles; `app/globals.css` – shared styles

To add a new tool: add a file in `lib/games/`, register it in `lib/tools.js` and `components/ToolPage.js`, and add its CSS import in `app/layout.js`.
