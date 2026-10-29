// Build CJS + ESM from the UMD source. No bundler, no deps.
// ponytail: string-wrap instead of a real bundler; add esbuild when the source grows past one file.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'bubble-match.js');
const DIST = path.join(ROOT, 'dist');
fs.mkdirSync(DIST, { recursive: true });

const src = fs.readFileSync(SRC, 'utf8');
fs.writeFileSync(path.join(DIST, 'bubble-match.js'), src);

// CJS: evaluate the UMD in a throwaway module and re-export the object.
const cjs = `'use strict';
var mod = { exports: {} };
(function (module, exports) {
${src}
})(mod, mod.exports);
module.exports = mod.exports;
module.exports.default = mod.exports;
`;
fs.writeFileSync(path.join(DIST, 'bubble-match.cjs'), cjs);

// ESM: same trick via a Function, then named + default exports.
const esm = `const mod = { exports: {} };
new Function('module', 'exports', ${JSON.stringify(src)})(mod, mod.exports);
const BubbleMatch = mod.exports;
export default BubbleMatch;
export const mount = BubbleMatch.mount;
export const version = BubbleMatch.version;
`;
fs.writeFileSync(path.join(DIST, 'bubble-match.mjs'), esm);

console.log('built dist/bubble-match.{js,cjs,mjs}');
