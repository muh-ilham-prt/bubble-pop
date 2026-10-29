# bubble-match

A self-contained bubble-popper game. **Zero dependencies, zero assets, zero network calls.**
~6KB, one canvas. Works with no internet once the file is on the page.

```html
<div id="game"></div>
<script src="./dist/bubble-match.js"></script>
<script>BubbleMatch.mount('#game');</script>
```

## Install

**npm**

```bash
npm i bubble-match
```

```js
import { mount } from 'bubble-match';   // or: const { mount } = require('bubble-match')
mount('#game', { music: false });  // music on by default; omit to enable
```

**CDN** (jsDelivr / unpkg — `unpkg` and `jsdelivr` fields in package.json point at the build)

```html
<script src="https://cdn.jsdelivr.net/npm/bubble-match@1/dist/bubble-match.js"></script>
```

## About "offline"

Be clear on what offline means here, because it depends on **how** the user loads the game:

| Load method | Works offline? | Why |
| --- | --- | --- |
| `npm install` + bundled by their build | **Yes, always** | Files ship inside their app's own bundle. |
| Local `<script src="./dist/…">` | **Yes, always** | Served from their own disk/server. |
| CDN `<script>` tag | **Only after first load** | Browser must fetch from the CDN the first time. |

If a user's app must run offline **and** they load from a CDN, they need a service worker to cache it
on first visit. npm or a local copy needs nothing — the game is already there.

The game makes no network requests, so there is nothing else to fail.

## API

```js
const game = mount(targetElementOrSelector, {
  bgTop: '#0f172a',      // optional, canvas background gradient
  bgBottom: '#1e293b',
  music: false,          // enable background music (on by default)
  sound: false           // disable all sound effects
});

game.reset();    // new board
game.score;      // current score
game.destroy();  // cancel animation, clear the element
```

### Controls

- **Move:** mouse / touch, or `←` `→`
- **Shoot:** click / tap, or `Space`
- **Restart:** `R`
- **Music:** `M` to toggle

## Develop

```bash
node test.js         # smoke test (fake DOM, no browser needed)
node scripts/build.js  # regenerate dist/ from src/
```

The source is one file: `src/bubble-match.js`. Edit it, run the build, and CJS/ESM/browser builds are all in sync.
`dist/bubble-match.min.js` is not produced yet — add esbuild to `scripts/build.js` when you publish.

## License

MIT
