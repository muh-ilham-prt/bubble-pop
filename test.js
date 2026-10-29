// One runnable check. No framework: `node test.js`.
// ponytail: fake-DOM smoke test, not a browser test; add Playwright when the game grows past this.
const assert = require('node:assert');
let arcs = 0;
const ctx = new Proxy({}, { get: (_, k) => {
  if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} });
  return () => { if (k === 'arc') arcs++; };
}, set: () => true });
function makeEl() {
  const el = {
    style: {}, className: '', textContent: '', children: [],
    get lastChild() { return this.children[this.children.length - 1]; },
    get innerHTML() { return this._html || ''; },
    set innerHTML(v) {
      this._html = v;
      this.children = []; // mimic browser: setting innerHTML replaces children
      let child = makeEl(); this.children.push(child); // at least one child (the .bm-dot)
    },
    setAttribute() {}, addEventListener() {}, removeEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 600 }),
    focus() {}, blur() {},
  };
  return el;
}
const canvas = Object.assign(makeEl(), { width: 0, height: 0, getContext: () => ctx });
global.document = {
  createElement: (t) => t === 'canvas' ? canvas : makeEl(),
  querySelector: () => makeEl(),
  getElementById: () => null,
  head: makeEl(),
};
global.window = { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} };
let frames = 0;
global.requestAnimationFrame = fn => { if (++frames < 3) fn(); return frames; };
global.cancelAnimationFrame = () => {};
const el = makeEl();

const BM = require('./dist/bubble-match.cjs');
assert.strictEqual(typeof BM.mount, 'function');
const game = BM.mount(el);
assert.ok(canvas.width > 0, 'canvas sized');
assert.ok(arcs > 40, 'bubbles drawn');
assert.strictEqual(game.score, 0);
game.reset();
game.destroy();
console.log('pass — ' + arcs + ' bubbles, ' + frames + ' frames');
