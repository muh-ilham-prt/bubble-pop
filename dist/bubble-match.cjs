'use strict';
var mod = { exports: {} };
(function (module, exports) {
/*!
 * bubble-match — self-contained offline bubble-popper (cartoon edition).
 * Zero dependencies, zero assets, no network.
 * UMD-ish: window.BubbleMatch in a browser, module.exports in Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BubbleMatch = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Bubble palette: [light, base, shade]
  var COLORS = ['#ff4d6d', '#ffc61a', '#2ec4ff', '#b25cff', '#3ddc84'];
  var LIGHTS = ['#ffb3c1', '#fff0a8', '#b3ebff', '#e3c4ff', '#bdf5d3'];
  var SHADES = ['#c9184a', '#e08e00', '#0a86c9', '#7a2fd0', '#14a85a'];
  var INK = '#2b1650';
  var FONT = "'Fredoka','Baloo 2','Nunito','Arial Rounded MT Bold','Trebuchet MS',ui-rounded,system-ui,sans-serif";

  var R = 22;                    // bubble radius
  var COLS = 10, ROWS = 12;
  var TOUCH = 2 * R * 0.92;      // 40.5px — two drawn bubbles actually kissing

  function mount(el, opts) {
    opts = opts || {};
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) throw new Error('BubbleMatch.mount: target element not found');

    // ---- Geometry: grid area on top, a dedicated launcher strip below it. ----
    var W = COLS * 2 * R + 2 * R;
    var H = ROWS * 2 * R + 4 * R;   // extra 2 rows of room for the shooter
    var SY = H - 2 * R;             // shooter / bullet start y (clear of the grid)
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    // ---- Styles (injected once) ----
    try { if (!document.getElementById('bm-styles-v2')) {
      var s = document.createElement('style');
      s.id = 'bm-styles-v2';
      s.textContent = [
        '.bm-wrap{box-sizing:border-box;width:100%;margin:0 auto;padding:12px;border:4px solid ' + INK + ';border-radius:28px;background:linear-gradient(160deg,#ff9ad5,#ffd36e);box-shadow:0 8px 0 ' + INK + ',0 20px 32px rgba(0,0,0,.35);font-family:' + FONT + ';color:' + INK + ';user-select:none;-webkit-user-select:none}',
        '.bm-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}',
        '.bm-title{font-weight:900;font-size:clamp(20px,5.5vw,28px);letter-spacing:.02em;color:#fff;transform:rotate(-2deg);text-shadow:-2px -2px 0 ' + INK + ',2px -2px 0 ' + INK + ',-2px 2px 0 ' + INK + ',2px 2px 0 ' + INK + ',0 5px 0 ' + INK + '}',
        '.bm-right{display:flex;align-items:center;gap:8px}',
        '.bm-pill{display:inline-flex;align-items:center;gap:8px;padding:4px 14px;background:#fff;border:3px solid ' + INK + ';border-radius:999px;box-shadow:0 3px 0 ' + INK + ';font-weight:800;font-size:14px;line-height:1.4}',
        '.bm-pill b{font-size:18px;font-weight:900;color:#ff4d6d;min-width:1ch}',
        '.bm-label{font-size:11px;letter-spacing:.1em;text-transform:uppercase;opacity:.7}',
        '.bm-mute{width:40px;height:40px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:18px;line-height:1;background:#fff;border:3px solid ' + INK + ';border-radius:50%;box-shadow:0 3px 0 ' + INK + ';cursor:pointer;transition:transform .08s,box-shadow .08s}',
        '.bm-mute:hover{transform:translateY(-1px)}',
        '.bm-mute:active{transform:translateY(3px);box-shadow:0 0 0 ' + INK + '}',
        '.bm-mute:focus-visible{outline:3px solid #fff;outline-offset:2px}',
        '.bm-screen{border:4px solid ' + INK + ';border-radius:20px;overflow:hidden;line-height:0;box-shadow:inset 0 0 0 3px rgba(255,255,255,.25)}',
        '.bm-screen canvas{display:block;width:100%;height:auto;touch-action:none;cursor:crosshair}',
        '.bm-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}',
        '.bm-dot{width:22px;height:22px;border-radius:50%;border:3px solid ' + INK + ';display:inline-block;box-sizing:border-box}',
        '.bm-hint{font-weight:700;font-size:12px;text-align:right;opacity:.75;line-height:1.3}'
      ].join('');
      (document.head || document.documentElement).appendChild(s);
    } } catch (e) {}

    // ---- DOM ----
    el.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'bm-wrap';
    wrap.style.maxWidth = (W + 32) + 'px';

    var top = document.createElement('div'); top.className = 'bm-top';
    var title = document.createElement('div'); title.className = 'bm-title'; title.textContent = 'Bubble Pop!';
    var right = document.createElement('div'); right.className = 'bm-right';
    var hud = document.createElement('div'); hud.className = 'bm-pill bm-hud';
    hud.setAttribute('aria-live', 'polite');
    var muteBtn = document.createElement('button');
    muteBtn.type = 'button'; muteBtn.className = 'bm-mute';
    muteBtn.setAttribute('aria-label', 'Music');
    right.appendChild(hud); right.appendChild(muteBtn);
    top.appendChild(title); top.appendChild(right);

    var screen = document.createElement('div'); screen.className = 'bm-screen';
    var cv = document.createElement('canvas');
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', 'Bubble match game. Arrow keys move, space to shoot.');
    var ctx = cv.getContext('2d');
    cv.width = W * dpr; cv.height = H * dpr;
    screen.appendChild(cv);

    var bottom = document.createElement('div'); bottom.className = 'bm-bottom';
    var nextEl = document.createElement('div'); nextEl.className = 'bm-next bm-pill';
    nextEl.setAttribute('aria-label', 'Next bubble color');
    nextEl.innerHTML = '<span class="bm-label">Next</span><span class="bm-dot"></span>';
    var dotEl = nextEl.lastChild;
    var hint = document.createElement('div'); hint.className = 'bm-hint';
    hint.innerHTML = '&larr; &rarr; move &middot; space shoot<br>R restart &middot; M music';
    bottom.appendChild(nextEl); bottom.appendChild(hint);

    wrap.appendChild(top); wrap.appendChild(screen); wrap.appendChild(bottom);
    el.appendChild(wrap);

    // ---- State ----
    var grid = [], shooter = { x: W / 2, c: 0 }, bullet = null, score = 0, over = false;
    var pops = [], texts = [], wob = {}, falls = [];
    var tick = 0;
    var POP_MS = 460, TEXT_MS = 720, WOB_MS = 380;
    var sparks = [];
    for (var i = 0; i < 26; i++) sparks.push({ x: Math.random() * W, y: Math.random() * H, s: 2 + Math.random() * 4, p: Math.random() * 6.28 });

    // ---- Audio: synthesized, no files, stays offline. ----
    var actx = null, master = null, musicNodes = null;
    var musicOn = opts.music !== false;  // music on by default; opt out with music: false
    function audio() {
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        actx = new AC();
        master = actx.createGain();
        master.gain.value = 0.9;
        master.connect(actx.destination);
      }
      if (actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
      return actx;
    }
    // Browsers keep audio suspended until a user gesture — resume on first input.
    function unlock() {
      if (musicOn && !musicNodes) startMusic(); else audio();
    }

    function pop(level) {
      if (opts.sound === false) return;
      var a = audio(); if (!a) return;
      try {
        var t = a.currentTime;
        var osc = a.createOscillator(), g = a.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520 - Math.min(level, 12) * 18, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.09);
        g.gain.setValueAtTime(0.16, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.connect(g).connect(master);
        osc.start(t); osc.stop(t + 0.18);
      } catch (e) { /* audio is cosmetic */ }
    }

    // ---- Happy background tune: a looping 8-bar chiptune in C major (I-V-vi-IV),
    // bouncy bass, off-beat chord stabs and light drums, all synthesized live. ----
    var EIGHTH = 60 / 140 / 2;   // 140 BPM, one step = an eighth note
    var _ = null;                // rest
    var BASS = [48, 43, 45, 41, 48, 43, 45, 41];                     // C G Am F, twice
    var CHORDS = [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65],
                  [60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65]];
    var MELODY = [
      // phrase A
      76, _, 72, 74, 76, _, 79, _,
      74, _, 71, 74, 79, _, 74, _,
      72, _, 76, _, 81, _, 76, 72,
      77, _, 72, 77, 76, 74, 72, _,
      // phrase B (answers A, a little higher)
      79, 79, 76, _, 79, _, 84, _,
      83, _, 79, 74, 79, _, 83, _,
      81, _, 76, 72, 76, 81, 79, 76,
      77, _, 76, _, 74, _, 67, _
    ];
    function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

    var noiseBuf = null;
    function getNoise(a) {
      if (!noiseBuf) {
        noiseBuf = a.createBuffer(1, Math.floor(a.sampleRate * 0.25), a.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return noiseBuf;
    }
    function tone(a, bus, type, freq, t, dur, vol) {
      var o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(bus);
      o.start(t); o.stop(t + dur + 0.02);
    }
    function hit(a, bus, t, dur, vol, filterType, freq) {
      var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = getNoise(a);
      f.type = filterType; f.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(bus);
      s.start(t); s.stop(t + dur + 0.02);
    }
    function kick(a, bus, t) {
      var o = a.createOscillator(), g = a.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); g.connect(bus);
      o.start(t); o.stop(t + 0.18);
    }

    // Plays one eighth-note step of the 64-step loop at audio time t.
    function playStep(a, bus, i, t) {
      var s = i % 8, bar = (i >> 3) % 8;
      var m = MELODY[i];
      if (m !== null && m !== undefined) {
        tone(a, bus, 'square', mtof(m), t, EIGHTH * 1.6, 0.05);
        tone(a, bus, 'triangle', mtof(m + 12), t, EIGHTH * 1.2, 0.025);   // sparkle octave
      }
      // bouncy bass: root, octave, fifth, octave
      var root = BASS[bar];
      if (s === 0) tone(a, bus, 'triangle', mtof(root), t, EIGHTH * 1.8, 0.22);
      else if (s === 2) tone(a, bus, 'triangle', mtof(root + 12), t, EIGHTH * 0.9, 0.16);
      else if (s === 4) tone(a, bus, 'triangle', mtof(root + 7), t, EIGHTH * 1.8, 0.2);
      else if (s === 6) tone(a, bus, 'triangle', mtof(root + 12), t, EIGHTH * 0.9, 0.16);
      // off-beat chord stabs
      if (s & 1) CHORDS[bar].forEach(function (n) { tone(a, bus, 'triangle', mtof(n), t, EIGHTH * 0.7, 0.04); });
      // drums
      if (s === 0 || s === 4) kick(a, bus, t);
      if (s === 2 || s === 6) hit(a, bus, t, 0.1, 0.1, 'bandpass', 1800);   // clap
      hit(a, bus, t, 0.04, (s & 1) ? 0.06 : 0.03, 'highpass', 7000);         // hat
    }

    function startMusic() {
      var a = audio(); if (!a || musicNodes) return;
      var g = a.createGain();
      g.gain.setValueAtTime(0, a.currentTime);
      g.gain.linearRampToValueAtTime(0.55, a.currentTime + 0.8);
      g.connect(master);
      var st = { g: g, step: 0, next: a.currentTime + 0.08, timer: null, stopped: false };
      // Look-ahead scheduler: queue notes ~250ms ahead so timing stays tight.
      function sched() {
        if (st.stopped) return;
        try {
          if (st.next < a.currentTime - 0.2) st.next = a.currentTime + 0.05;   // tab was throttled; resync
          while (st.next < a.currentTime + 0.25) {
            playStep(a, g, st.step % 64, st.next);
            st.next += EIGHTH; st.step++;
          }
        } catch (e) { /* audio is cosmetic */ }
        st.timer = setTimeout(sched, 60);
      }
      sched();
      musicNodes = st;
    }
    function stopMusic() {
      if (!actx || !musicNodes) return;
      var a = actx, n = musicNodes;
      n.stopped = true;
      clearTimeout(n.timer);
      try { n.g.gain.cancelScheduledValues(a.currentTime); n.g.gain.setValueAtTime(n.g.gain.value, a.currentTime); n.g.gain.linearRampToValueAtTime(0, a.currentTime + 0.4); } catch (e) {}
      setTimeout(function () { try { n.g.disconnect(); } catch (e) {} }, 600);
      musicNodes = null;
    }
    function syncMuteBtn() {
      muteBtn.textContent = musicOn ? '\uD83D\uDD0A' : '\uD83D\uDD07';
      muteBtn.setAttribute('aria-pressed', musicOn ? 'true' : 'false');
      muteBtn.title = musicOn ? 'Music on (M)' : 'Music off (M)';
    }
    function toggleMusic() {
      musicOn = !musicOn;
      musicOn ? startMusic() : stopMusic();
      syncMuteBtn();
      return musicOn;
    }
    syncMuteBtn();
    try { if (musicOn) startMusic(); } catch (e) {}

    // ---- Grid ----
    var OBST = 99;                    // obstacle cell: solid rock, never matches, never falls
    var SCROLL_EVERY = 8;             // push the board down every N shots
    var shots = 0;
    function randColor() { return (Math.random() * COLORS.length) | 0; }
    // random color already on the board, avoiding an instant match with the row below
    function boardColor(col) {
      var present = {};
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var v = grid[r][c];
        if (v >= 0 && v !== OBST) present[v] = 1;
      }
      var keys = Object.keys(present);
      if (!keys.length) return randColor();
      var below = grid[1] ? grid[1][col] : -1;
      var pool = keys.filter(function (k) { return +k !== below; });
      if (!pool.length) pool = keys;
      return +pool[(Math.random() * pool.length) | 0];
    }
    function scrollDown() {
      // game over if anything occupies the bottom row
      for (var c = 0; c < COLS; c++) if (grid[ROWS - 1][c] >= 0) { over = true; return; }
      for (var r = ROWS - 1; r > 0; r--) grid[r] = grid[r - 1].slice();
      grid[0] = [];
      for (var cc = 0; cc < COLS; cc++) {
        // keep obstacles sparse: ~1 in 8 cells, never adjacent
        var leftObst = cc > 0 && grid[0][cc - 1] === OBST;
        grid[0][cc] = (!leftObst && Math.random() < 0.12) ? OBST : boardColor(cc);
      }
    }
    function fillGrid() {
      grid = [];
      for (var r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (var c = 0; c < COLS; c++) grid[r][c] = r < 4 ? randColor() : -1;
      }
      // seed row 0 with a couple of obstacles so players learn what they are
      grid[0][2] = OBST; grid[0][7] = OBST;
      shots = 0;
    }
    fillGrid();

    function cx(c) { return R * 2 + c * 2 * R; }
    function cy(r) { return R * 2 + r * 2 * R; }

    function neighbors(r, c) {
      return [[r, c - 1], [r, c + 1], [r - 1, c], [r + 1, c], [r - 1, c - 1], [r + 1, c - 1]];
    }

    function cluster(r, c, color, seen) {
      seen = seen || {};
      var k = r + ',' + c, out = [];
      if (color === OBST || seen[k] || !grid[r] || grid[r][c] !== color) return out;
      seen[k] = 1; out.push([r, c]);
      neighbors(r, c).forEach(function (n) {
        if (grid[n[0]]) out = out.concat(cluster(n[0], n[1], color, seen));
      });
      return out;
    }

    function drop(key) { var p = key.split(','); grid[p[0]][p[1]] = -1; }

    // Every bubble NOT connected (via neighbours) to row 0 is floating — it falls.
    function floaters() {
      var seen = {};
      function visit(r, c) {
        var k = r + ',' + c;
        // bounds first: grid[r][-1] is undefined, not < 0 — without this, visit walks off to -infinity
        if (seen[k] || r < 0 || r >= ROWS || c < 0 || c >= COLS || grid[r][c] < 0) return;
        seen[k] = 1;
        neighbors(r, c).forEach(function (n) { visit(n[0], n[1]); });
      }
      for (var c = 0; c < COLS; c++) visit(0, c);
      var out = [];
      for (var r = 0; r < ROWS; r++) for (var cc = 0; cc < COLS; cc++) {
        if (grid[r][cc] >= 0 && grid[r][cc] !== OBST && !seen[r + ',' + cc]) out.push([r, cc]);
      }
      return out;
    }

    // ---- HUD ----
    var hudKey = '';
    function setHud() {
      var k = score + ':' + over;
      if (k === hudKey) return;
      hudKey = k;
      hud.innerHTML = '<span class="bm-label">' + (over ? 'Game over' : 'Score') + '</span><b>' + score + '</b>';
    }
    var next = { c: randColor() };
    function updateNext() {
      dotEl.style.background = COLORS[next.c];
      dotEl.style.boxShadow = 'inset -3px -3px 0 ' + SHADES[next.c] + ', inset 3px 3px 0 ' + LIGHTS[next.c];
    }
    shooter.c = randColor(); next.c = randColor(); updateNext();

    function shoot() {
      if (over || bullet) return;
      bullet = { x: shooter.x, y: SY, vx: 0, vy: -6, c: shooter.c };
      shooter.c = next.c; next.c = randColor();
      updateNext();
      if (++shots % SCROLL_EVERY === 0) scrollDown();
    }

    // The bullet stops on contact, so it is already touching the grid. Snap it into
    // the nearest empty cell among the cells around what it hit.
    function land(b) {
      var near = null, best = Infinity;
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        if (grid[r][c] < 0) continue;
        var dx = b.x - cx(c), dy = b.y - cy(r), d = dx * dx + dy * dy;
        if (d < best) { best = d; near = [r, c]; }
      }
      // Nothing on the board yet: stick to the top row, nearest column.
      if (!near) { near = [0, Math.max(0, Math.min(COLS - 1, Math.round((b.x - cx(0)) / (R * 2))))]; }

      var target = null, tBest = Infinity;
      neighbors(near[0], near[1]).concat([near]).forEach(function (n) {
        var r = n[0], c = n[1];
        if (!grid[r] || c < 0 || c >= COLS || grid[r][c] >= 0) return;
        var dx = b.x - cx(c), dy = b.y - cy(r), d = dx * dx + dy * dy;
        if (d < tBest) { tBest = d; target = [r, c]; }
      });
      if (!target) return;   // fully surrounded by neighbours — nowhere to land
      var r = target[0], c = target[1];
      grid[r][c] = b.c;
      var group = cluster(r, c, b.c);
      if (group.length >= 3) {
        var sx = 0, sy = 0;
        group.forEach(function (p) {
          pops.push({ x: cx(p[1]), y: cy(p[0]), ci: grid[p[0]][p[1]], t: 0 });
          sx += cx(p[1]); sy += cy(p[0]);
          drop(p[0] + ',' + p[1]);
        });
        texts.push({
          x: sx / group.length, y: sy / group.length, t: 0,
          txt: group.length >= 8 ? 'WOW!' : group.length >= 5 ? 'NICE!' : 'POP!'
        });
        score += 1;   // one match event = +1 point
        // orphaned bubbles fall with gravity instead of popping
        floaters().forEach(function (p) {
          falls.push({ x: cx(p[1]), y: cy(p[0]), ci: grid[p[0]][p[1]],
                       vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2, rot: 0, vr: (Math.random() - 0.5) * 0.3 });
          drop(p[0] + ',' + p[1]);
        });
        pop(group.length);
      } else {
        wob[r + ',' + c] = 0;
        if (r >= ROWS - 1) over = true;
      }
      bullet = null;
    }

    function step() {
      tick += 16;
      if (bullet) {
        bullet.x += bullet.vx; bullet.y += bullet.vy;
        if (bullet.x < R || bullet.x > W - R) { bullet.vx = -bullet.vx; bullet.x = Math.max(R, Math.min(W - R, bullet.x)); }
        if (bullet.y < R) { land(bullet); }
        else {
          var hit = false;
          for (var r = 0; r < ROWS && !hit; r++) for (var c = 0; c < COLS; c++) {
            if (grid[r][c] < 0) continue;
            var dx = bullet.x - cx(c), dy = bullet.y - cy(r);
            if (dx * dx + dy * dy < TOUCH * TOUCH) { hit = true; break; }
          }
          if (hit) land(bullet);
        }
      }
      for (var i = pops.length - 1; i >= 0; i--) {
        pops[i].t += 16;
        if (pops[i].t > POP_MS) pops.splice(i, 1);
      }
      for (var j = texts.length - 1; j >= 0; j--) {
        texts[j].t += 16;
        if (texts[j].t > TEXT_MS) texts.splice(j, 1);
      }
      for (var f = falls.length - 1; f >= 0; f--) {
        var fl = falls[f];
        fl.vy += 0.35;            // gravity
        fl.x += fl.vx; fl.y += fl.vy; fl.rot += fl.vr;
        if (fl.y > H + R * 2) falls.splice(f, 1);   // gone past the bottom
      }
      for (var k in wob) { wob[k] += 16; if (wob[k] > WOB_MS) delete wob[k]; }
      for (var r2 = 0; r2 < ROWS; r2++) if (grid[r2].every(function (v) { return v < 0; })) { grid.splice(r2, 1); grid.push(new Array(COLS).fill(-1)); }
      draw();
    }

    // ---- Drawing helpers ----
    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function starPath(x, y, r, rot) {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var rad = i % 2 ? r * 0.45 : r, a = rot + i * Math.PI / 5 - Math.PI / 2;
        var px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
    }

    // Obstacle: grey rock with cracks. Solid — bullets bounce off, never matches.
    function drawRock(x, y) {
      var rr = R * 0.94;
      ctx.save(); ctx.translate(x, y);
      var g = ctx.createRadialGradient(-rr * 0.3, -rr * 0.35, rr * 0.1, 0, 0, rr);
      g.addColorStop(0, '#cbd5e1'); g.addColorStop(0.5, '#94a3b8'); g.addColorStop(1, '#64748b');
      ctx.fillStyle = g;
      ctx.beginPath();
      // lumpy rock outline
      for (var i = 0; i <= 8; i++) {
        var a = (i / 8) * Math.PI * 2, rad = rr * (0.92 + 0.08 * Math.sin(i * 2.7 + x));
        var px = Math.cos(a) * rad, py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      // cracks
      ctx.strokeStyle = 'rgba(43,22,80,0.45)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-rr * 0.4, -rr * 0.3); ctx.lineTo(-rr * 0.05, 0); ctx.lineTo(-rr * 0.3, rr * 0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rr * 0.35, -rr * 0.45); ctx.lineTo(rr * 0.15, -rr * 0.05); ctx.lineTo(rr * 0.4, rr * 0.2); ctx.stroke();
      ctx.restore();
    }

    // Cartoon bubble: thick ink outline, glossy shine, blush cheeks and googly eyes.
    function bubble(x, y, ci, sx, sy, lookUp) {
      var rr = R * 0.94;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx || 1, sy || 1);

      var g = ctx.createRadialGradient(-rr * 0.3, -rr * 0.35, rr * 0.1, 0, 0, rr);
      g.addColorStop(0, LIGHTS[ci]); g.addColorStop(0.45, COLORS[ci]); g.addColorStop(1, SHADES[ci]);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();

      // shine
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.ellipse(-rr * 0.45, -rr * 0.52, rr * 0.2, rr * 0.11, -0.6, 0, 7); ctx.fill();

      // cheeks
      ctx.fillStyle = 'rgba(255,90,130,0.4)';
      [-1, 1].forEach(function (d) {
        ctx.beginPath(); ctx.arc(d * rr * 0.58, rr * 0.28, rr * 0.11, 0, 7); ctx.fill();
      });

      // eyes — pupils follow the shooter
      var look = Math.max(-1, Math.min(1, (shooter.x - x) / (W * 0.5)));
      var lx = look * rr * 0.08, ly = lookUp ? -rr * 0.09 : rr * 0.08;
      [-1, 1].forEach(function (d) {
        var ex = d * rr * 0.32, ey = -rr * 0.02;
        ctx.fillStyle = '#fff'; ctx.lineWidth = 1.6; ctx.strokeStyle = INK;
        ctx.beginPath(); ctx.ellipse(ex, ey, rr * 0.19, rr * 0.25, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(ex + lx, ey + ly, rr * 0.1, 0, 7); ctx.fill();
      });

      // smile
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, rr * 0.2, rr * 0.2, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();

      ctx.restore();
    }

    function drawPop(p) {
      var k = p.t / POP_MS;
      var ease = 1 - Math.pow(1 - k, 3);
      var alpha = 1 - k;
      ctx.globalAlpha = alpha;

      // expanding ring (ink outline underneath)
      var rad = R * (0.6 + ease * 1.5);
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 7);
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 9 * alpha); ctx.stroke();
      ctx.strokeStyle = COLORS[p.ci]; ctx.lineWidth = Math.max(1, 5 * alpha); ctx.stroke();

      // star shards flying outward
      for (var i = 0; i < 6; i++) {
        var a = (i / 6) * Math.PI * 2 + p.x * 0.01;
        var d = R * (0.4 + ease * 2);
        starPath(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 4 + 7 * alpha, a + k * 4);
        ctx.fillStyle = i % 2 ? '#fff' : COLORS[p.ci];
        ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function drawText(t) {
      var k = t.t / TEXT_MS;
      var pop = Math.min(1, k * 6);
      var size = 14 + 14 * (1 - Math.pow(1 - pop, 3));
      ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      ctx.font = '900 ' + size.toFixed(1) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = INK;
      var y = t.y - k * 34;
      ctx.strokeText(t.txt, t.x, y);
      ctx.fillStyle = '#ffe066';
      ctx.fillText(t.txt, t.x, y);
      ctx.globalAlpha = 1;
    }

    function drawBackground() {
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, opts.bgTop || '#4a2fb5'); bg.addColorStop(1, opts.bgBottom || '#241263');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // soft blobs
      [[W * 0.2, H * 0.25, 120, 'rgba(255,120,200,0.16)'],
       [W * 0.85, H * 0.5, 150, 'rgba(70,200,255,0.14)'],
       [W * 0.3, H * 0.85, 130, 'rgba(255,200,60,0.12)']].forEach(function (b) {
        var rg = ctx.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
        rg.addColorStop(0, b[3]); rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      });

      // twinkling sparkles
      sparks.forEach(function (p) {
        var a = 0.25 + 0.5 * Math.abs(Math.sin(tick * 0.002 + p.p));
        ctx.globalAlpha = a; ctx.fillStyle = '#fff';
        starPath(p.x, p.y, p.s, p.p);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // launcher strip
      var sg = ctx.createLinearGradient(0, SY - R * 1.6, 0, H);
      sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = sg; ctx.fillRect(0, SY - R * 1.6, W, H - (SY - R * 1.6));

      // danger line
      var dy = cy(ROWS - 1) - R;
      ctx.strokeStyle = 'rgba(255,100,110,0.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.setLineDash([12, 9]); ctx.lineDashOffset = 0;
      ctx.beginPath(); ctx.moveTo(10, dy); ctx.lineTo(W - 10, dy); ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawAim() {
      if (bullet || over) return;
      var stopY = R;
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        if (grid[r][c] < 0) continue;
        var dx = Math.abs(shooter.x - cx(c));
        if (dx >= TOUCH) continue;
        var y = cy(r) + Math.sqrt(TOUCH * TOUCH - dx * dx);
        if (y > stopY) stopY = y;
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.setLineDash([1, 13]); ctx.lineDashOffset = -tick * 0.03;
      ctx.beginPath(); ctx.moveTo(shooter.x, SY - R * 1.1); ctx.lineTo(shooter.x, stopY); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }

    function drawLauncher() {
      var pw = 76, ph = 18;
      var px = Math.max(4, Math.min(W - pw - 4, shooter.x - pw / 2)), py = SY + R * 0.5;
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(ctx, px + 2, py + 5, pw, ph, 9); ctx.fill();
      // pad
      roundRect(ctx, px, py, pw, ph, 9);
      ctx.fillStyle = '#ffd23f'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      roundRect(ctx, px + 8, py + 3, pw - 16, 4, 2); ctx.fill();
      // little arrow nubs
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.moveTo(px + 14, py + 10); ctx.lineTo(px + 22, py + 6); ctx.lineTo(px + 22, py + 14); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px + pw - 14, py + 10); ctx.lineTo(px + pw - 22, py + 6); ctx.lineTo(px + pw - 22, py + 14); ctx.fill();
    }

    function drawGameOver() {
      ctx.fillStyle = 'rgba(25,8,55,0.72)'; ctx.fillRect(0, 0, W, H);
      var pw = 320, ph = 190, px = (W - pw) / 2, py = (H - ph) / 2 - 20;
      ctx.fillStyle = INK; roundRect(ctx, px, py + 8, pw, ph, 28); ctx.fill();
      roundRect(ctx, px, py, pw, ph, 28);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      var bob = Math.sin(tick * 0.006) * 3;
      ctx.font = '900 40px ' + FONT;
      ctx.lineWidth = 7; ctx.strokeStyle = INK;
      ctx.strokeText('GAME OVER', W / 2, py + 52 + bob);
      ctx.fillStyle = '#ff4d6d'; ctx.fillText('GAME OVER', W / 2, py + 52 + bob);

      ctx.font = '800 24px ' + FONT; ctx.fillStyle = INK;
      ctx.fillText('Score: ' + score, W / 2, py + 105);

      // retry button
      roundRect(ctx, W / 2 - 100, py + 128, 200, 42, 21);
      ctx.fillStyle = '#3ddc84'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
      ctx.font = '800 17px ' + FONT; ctx.fillStyle = INK;
      ctx.fillText('Tap or press R', W / 2, py + 149);
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      drawBackground();

      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var ci = grid[r][c];
        if (ci < 0) continue;
        if (ci === OBST) { drawRock(cx(c), cy(r)); continue; }
        var sx = 1, sy = 1;
        var br = Math.sin(tick * 0.004 + r * 0.7 + c * 0.5) * 0.015;   // idle breathing
        sx += br; sy -= br;
        var wk = wob[r + ',' + c];
        if (wk !== undefined) {                                         // landing squish
          var q = wk / WOB_MS, amp = Math.sin(q * Math.PI * 4) * (1 - q) * 0.22;
          sx += amp; sy -= amp;
        }
        bubble(cx(c), cy(r), ci, sx, sy, false);
      }

      drawAim();
      pops.forEach(drawPop);
      falls.forEach(function (fl) {
        ctx.save();
        ctx.translate(fl.x, fl.y); ctx.rotate(fl.rot); ctx.translate(-fl.x, -fl.y);
        bubble(fl.x, fl.y, fl.ci, 1, 1, false);
        ctx.restore();
      });
      drawLauncher();
      var pulse = Math.sin(tick * 0.006) * 0.03;
      bubble(shooter.x, SY, shooter.c, 1 + pulse, 1 - pulse, true);
      if (bullet) bubble(bullet.x, bullet.y, bullet.c, 1, 1.06, true);
      texts.forEach(drawText);
      if (over) drawGameOver();
      setHud();
    }

    // ---- Input ----
    function pointerToX(e) {
      var rect = cv.getBoundingClientRect();
      var px = e.clientX - rect.left;
      return Math.max(R, Math.min(W - R, px * (W / rect.width)));
    }

    cv.addEventListener('pointerdown', function (e) {
      unlock();
      if (over) { reset(); return; }
      shooter.x = pointerToX(e); shoot();
    });
    cv.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse' || e.buttons) shooter.x = pointerToX(e);
    });
    muteBtn.addEventListener('click', function () { unlock(); toggleMusic(); muteBtn.blur(); });

    function onKey(e) {
      var t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      var k = e.key, handled = true;
      unlock();
      if (k === 'ArrowLeft') shooter.x = Math.max(R, shooter.x - R);
      else if (k === 'ArrowRight') shooter.x = Math.min(W - R, shooter.x + R);
      else if (k === ' ' || k === 'ArrowUp') {
        if (tag === 'BUTTON') return;   // let a focused button handle its own space
        over ? reset() : shoot();
      }
      else if (k === 'r' || k === 'R') reset();
      else if (k === 'm' || k === 'M') toggleMusic();
      else handled = false;
      if (handled) e.preventDefault();
    }
    window.addEventListener('keydown', onKey);

    function reset() {
      fillGrid();
      score = 0; over = false; bullet = null;
      pops.length = 0; texts.length = 0; falls.length = 0; wob = {};
      shooter.c = randColor(); next.c = randColor();
      updateNext(); draw();
    }

    var raf = null;
    function loop() { step(); raf = requestAnimationFrame(loop); }
    loop();

    return {
      destroy: function () {
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKey);
        stopMusic();
        if (actx) { actx.close(); actx = null; }
        el.innerHTML = '';
      },
      reset: reset,
      get score() { return score; }
    };
  }

  return { mount: mount, version: '1.2.0' };
});
})(mod, mod.exports);
module.exports = mod.exports;
module.exports.default = mod.exports;
