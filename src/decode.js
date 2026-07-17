(function (root) {
  'use strict';

  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1; if (x & 0x100) x ^= 0x11D;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }
  function ginv(a) { return EXP[255 - LOG[a]]; }

  var ECC_CW = [
    [7,10,13,17],[10,16,22,28],[15,26,18,22],[20,18,26,16],[26,24,18,22],
    [18,16,24,28],[20,18,18,26],[24,22,22,26],[30,22,20,24],[18,26,24,28],
    [20,30,28,24],[24,22,26,28],[26,22,24,22],[30,24,20,24],[22,24,30,24],
    [24,28,24,30],[28,28,28,28],[30,26,28,28],[28,26,26,26],[28,26,30,28],
    [28,26,28,30],[28,28,30,24],[30,28,30,30],[30,28,30,30],[26,28,30,30],
    [28,28,28,30],[30,28,30,30],[30,28,30,30],[30,28,30,30],[30,28,30,30],
    [30,28,30,30],[30,28,30,30],[30,28,30,30],[30,28,30,30],[30,28,30,30],
    [30,28,30,30],[30,28,30,30],[30,28,30,30],[30,28,30,30],[30,28,30,30]
  ];
  var NUM_BLOCKS = [
    [1,1,1,1],[1,1,1,1],[1,1,2,2],[1,2,2,4],[1,2,4,4],
    [2,4,4,4],[2,4,6,5],[2,4,6,6],[2,5,8,8],[4,5,8,8],
    [4,5,8,11],[4,8,10,11],[4,9,12,16],[4,9,16,16],[6,10,12,18],
    [6,10,17,16],[6,11,16,19],[6,13,18,21],[7,14,21,25],[8,16,20,25],
    [8,17,23,25],[9,17,23,34],[9,18,25,30],[10,20,27,32],[12,21,29,35],
    [12,23,34,37],[12,25,34,40],[13,26,35,42],[14,28,38,45],[15,29,40,48],
    [16,31,43,51],[17,33,45,54],[18,35,48,57],[19,37,51,60],[19,38,53,63],
    [20,40,56,66],[21,43,59,70],[22,45,62,74],[24,47,65,77],[25,49,68,81]
  ];
  var ECC_NAME = ['M', 'L', 'H', 'Q'];

  function alignPositions(ver) {
    if (ver === 1) return [];
    var n = Math.floor(ver / 7) + 2;
    var last = ver * 4 + 10;
    var step = (ver === 32) ? 26 : Math.ceil((last - 6) / (n - 1) / 2) * 2;
    var pos = [6];
    for (var i = n - 1; i >= 1; i--) pos.push(last - (i - 1) * step);
    return pos.slice(0, n).sort(function (a, b) { return a - b; });
  }
  function totalCodewords(ver) {
    var size = ver * 4 + 17;
    var raw = size * size - 3 * 64 - 2 * (size - 16);
    var ap = alignPositions(ver), k = ap.length;
    if (k) { raw -= (k * k - 3) * 25; raw += (k - 2) * 2 * 5; }
    raw -= 31;
    if (ver >= 7) raw -= 36;
    return Math.floor(raw / 8);
  }

  function fnMap(ver) {
    var size = ver * 4 + 17;
    var fn = [];
    for (var i = 0; i < size; i++) fn.push(new Uint8Array(size));
    function mark(x, y) { if (x >= 0 && x < size && y >= 0 && y < size) fn[y][x] = 1; }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) mark(cx + dx, cy + dy);
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    for (var t = 8; t < size - 8; t++) { mark(6, t); mark(t, 6); }
    var ap = alignPositions(ver);
    for (var a = 0; a < ap.length; a++) for (var b = 0; b < ap.length; b++) {
      var ax = ap[a], ay = ap[b];
      if ((ax === 6 && ay === 6) || (ax === 6 && ay === size - 7) || (ax === size - 7 && ay === 6)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) mark(ax + dx2, ay + dy2);
    }
    for (var f = 0; f < 9; f++) { if (f !== 6) { mark(f, 8); mark(8, f); } }
    for (var f2 = 0; f2 < 8; f2++) { mark(size - 1 - f2, 8); mark(8, size - 1 - f2); }
    mark(8, size - 8);
    if (ver >= 7) {
      for (var vi = 0; vi < 18; vi++) {
        var vx = Math.floor(vi / 3), vy = size - 11 + (vi % 3);
        mark(vx, vy); mark(vy, vx);
      }
    }
    return fn;
  }

  function maskFn(mask, x, y) {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
      case 5: return ((x * y) % 2 + (x * y) % 3) === 0;
      case 6: return (((x * y) % 2 + (x * y) % 3) % 2) === 0;
      case 7: return (((x + y) % 2 + (x * y) % 3) % 2) === 0;
    }
    return false;
  }

  function fmtCodeword(data5) {
    var rem = data5;
    for (var q = 0; q < 10; q++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data5 << 10) | rem) ^ 0x5412;
  }
  function hamming(a, b, bits) {
    var x = a ^ b, n = 0;
    for (var i = 0; i < bits; i++) n += (x >> i) & 1;
    return n;
  }
  function decodeFormat(bits15) {
    var best = -1, bestD = 4;
    for (var d = 0; d < 32; d++) {
      var dist = hamming(bits15, fmtCodeword(d), 15);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    if (best < 0) return null;
    return { ecc: ECC_NAME[best >> 3], mask: best & 7 };
  }
  function readFormat(m) {
    var size = m.length, b1 = 0, b2 = 0, i;
    var c1 = [];
    for (i = 0; i <= 5; i++) c1.push(m[i][8]);
    c1.push(m[7][8], m[8][8], m[8][7]);
    for (i = 5; i >= 0; i--) c1.push(m[8][i]);
    for (i = 0; i < 15; i++) b1 |= c1[i] << i;
    var c2 = [];
    for (i = 0; i < 8; i++) c2.push(m[8][size - 1 - i]);
    for (i = 8; i < 15; i++) c2.push(m[size - 15 + i][8]);
    for (i = 0; i < 15; i++) b2 |= c2[i] << i;
    return decodeFormat(b1) || decodeFormat(b2);
  }
  function readVersionInfo(m) {
    var size = m.length;
    if (size < 45) return null;
    var bitsA = 0, bitsB = 0;
    for (var v = 0; v < 18; v++) {
      var vx = Math.floor(v / 3), vy = size - 11 + (v % 3);
      bitsA |= m[vy][vx] << v;
      bitsB |= m[vx][vy] << v;
    }
    function nearest(bits) {
      var best = -1, bestD = 4;
      for (var ver = 7; ver <= 40; ver++) {
        var rem = ver;
        for (var q = 0; q < 12; q++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
        if (hamming(bits, (ver << 12) | rem, 18) < bestD) { bestD = hamming(bits, (ver << 12) | rem, 18); best = ver; }
      }
      return best > 0 ? best : null;
    }
    return nearest(bitsA) || nearest(bitsB);
  }

  function polyEval(p, x) {
    var acc = 0;
    for (var i = 0; i < p.length; i++) acc = gmul(acc, x) ^ p[i];
    return acc;
  }
  function rsCorrect(cw, ecLen) {
    var synd = [], allZero = true, i, j;
    for (i = 0; i < ecLen; i++) {
      var s = polyEval(cw, EXP[i]);
      synd.push(s);
      if (s) allZero = false;
    }
    if (allZero) return 0;

    var sigma = [1], prev = [1], L = 0, mShift = 1, b = 1;
    for (var n = 0; n < ecLen; n++) {
      var delta = synd[n];
      for (i = 1; i <= L; i++) delta ^= gmul(sigma[i] || 0, synd[n - i]);
      if (delta === 0) { mShift++; continue; }
      if (2 * L <= n) {
        var tmp = sigma.slice();
        var coef = gmul(delta, ginv(b));
        var shifted = new Array(prev.length + mShift).fill(0);
        for (i = 0; i < prev.length; i++) shifted[i + mShift] = gmul(prev[i], coef);
        sigma = xorPoly(sigma, shifted);
        L = n + 1 - L; prev = tmp; b = delta; mShift = 1;
      } else {
        var shifted2 = new Array(prev.length + mShift).fill(0);
        for (i = 0; i < prev.length; i++) shifted2[i + mShift] = gmul(prev[i], gmul(delta, ginv(b)));
        sigma = xorPoly(sigma, shifted2);
        mShift++;
      }
    }
    function xorPoly(a, c) {
      var out = new Array(Math.max(a.length, c.length)).fill(0);
      for (var k = 0; k < out.length; k++) out[k] = (a[k] || 0) ^ (c[k] || 0);
      return out;
    }
    while (sigma.length && sigma[sigma.length - 1] === 0) sigma.pop();
    var nErr = sigma.length - 1;
    if (nErr <= 0 || nErr * 2 > ecLen) return -1;

    var posList = [];
    var nLen = cw.length;
    for (i = 0; i < nLen; i++) {
      var xinv = EXP[(255 - ((nLen - 1 - i) % 255)) % 255];
      var acc = 0;
      for (j = 0; j < sigma.length; j++) acc ^= gmul(sigma[j], EXP[(LOG[xinv] * j) % 255 || 0]);
      acc = 0;
      var xp = 1;
      for (j = 0; j < sigma.length; j++) { acc ^= gmul(sigma[j], xp); xp = gmul(xp, xinv); }
      if (acc === 0) posList.push(i);
    }
    if (posList.length !== nErr) return -1;

    var omega = new Array(ecLen).fill(0);
    for (i = 0; i < ecLen; i++) {
      for (j = 0; j < sigma.length; j++) {
        if (i + j < ecLen) omega[i + j] ^= gmul(synd[i], sigma[j]);
      }
    }
    for (i = 0; i < posList.length; i++) {
      var pos = posList[i];
      var X = EXP[(nLen - 1 - pos) % 255];
      var Xi = ginv(X);
      var num = 0, xp2 = 1;
      for (j = 0; j < ecLen; j++) { num ^= gmul(omega[j], xp2); xp2 = gmul(xp2, Xi); }
      var den = 0, xp3 = Xi;
      den = 0;
      for (j = 1; j < sigma.length; j += 2) {
        var t2 = sigma[j], e = j - 1, base = Xi, acc2 = t2;
        while (e > 0) { acc2 = gmul(acc2, base); e--; }
        den ^= acc2;
      }
      if (den === 0) return -1;
      var mag = gmul(gmul(num, X), ginv(den));
      cw[pos] ^= mag;
    }
    for (i = 0; i < ecLen; i++) if (polyEval(cw, EXP[i]) !== 0) return -1;
    return nErr;
  }

  var ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

  function utf8Decode(bytes) {
    var out = '', i = 0;
    while (i < bytes.length) {
      var b = bytes[i];
      if (b < 0x80) { out += String.fromCharCode(b); i++; }
      else if (b >= 0xC0 && b < 0xE0 && i + 1 < bytes.length && (bytes[i + 1] & 0xC0) === 0x80) {
        out += String.fromCharCode(((b & 0x1F) << 6) | (bytes[i + 1] & 0x3F)); i += 2;
      } else if (b >= 0xE0 && b < 0xF0 && i + 2 < bytes.length &&
                 (bytes[i + 1] & 0xC0) === 0x80 && (bytes[i + 2] & 0xC0) === 0x80) {
        out += String.fromCharCode(((b & 0x0F) << 12) | ((bytes[i + 1] & 0x3F) << 6) | (bytes[i + 2] & 0x3F)); i += 3;
      } else if (b >= 0xF0 && i + 3 < bytes.length &&
                 (bytes[i + 1] & 0xC0) === 0x80 && (bytes[i + 2] & 0xC0) === 0x80 && (bytes[i + 3] & 0xC0) === 0x80) {
        var cp = ((b & 7) << 18) | ((bytes[i + 1] & 0x3F) << 12) | ((bytes[i + 2] & 0x3F) << 6) | (bytes[i + 3] & 0x3F);
        out += String.fromCodePoint(cp); i += 4;
      } else return null;
    }
    return out;
  }
  function latin1(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  function parsePayload(data, ver) {
    var bitPos = 0, total = data.length * 8;
    function take(n) {
      var v = 0;
      for (var i = 0; i < n; i++) {
        v = (v << 1) | ((data[bitPos >> 3] >> (7 - (bitPos & 7))) & 1);
        bitPos++;
      }
      return v;
    }
    var out = '', byteBuf = [];
    function flushBytes() {
      if (!byteBuf.length) return;
      var t = utf8Decode(byteBuf);
      out += (t === null) ? latin1(byteBuf) : t;
      byteBuf = [];
    }
    while (total - bitPos >= 4) {
      var mode = take(4);
      if (mode === 0) break;
      if (mode === 1) {
        var cnt = take(ver < 10 ? 10 : ver < 27 ? 12 : 14);
        flushBytes();
        while (cnt >= 3) { out += ('00' + take(10)).slice(-3); cnt -= 3; }
        if (cnt === 2) out += ('0' + take(7)).slice(-2);
        else if (cnt === 1) out += String(take(4));
      } else if (mode === 2) {
        var cnt2 = take(ver < 10 ? 9 : ver < 27 ? 11 : 13);
        flushBytes();
        while (cnt2 >= 2) { var pv = take(11); out += ALNUM[Math.floor(pv / 45)] + ALNUM[pv % 45]; cnt2 -= 2; }
        if (cnt2 === 1) out += ALNUM[take(6)];
      } else if (mode === 4) {
        var cnt3 = take(ver < 10 ? 8 : 16);
        for (var i = 0; i < cnt3; i++) byteBuf.push(take(8));
      } else if (mode === 8) {
        var cnt4 = take(ver < 10 ? 8 : ver < 27 ? 10 : 12);
        flushBytes();
        var sj = [];
        for (var k = 0; k < cnt4; k++) {
          var vRaw = take(13);
          var sjis = (Math.floor(vRaw / 0xC0) << 8) | (vRaw % 0xC0);
          sjis += (sjis < 0x1F00) ? 0x8140 : 0xC140;
          sj.push(sjis >> 8, sjis & 0xFF);
        }
        if (typeof TextDecoder !== 'undefined') {
          try { out += new TextDecoder('shift_jis').decode(new Uint8Array(sj)); }
          catch (e) { out += latin1(sj); }
        } else out += latin1(sj);
      } else if (mode === 7) {
        var e1 = take(8);
        if (e1 >= 0xC0) take(16); else if (e1 >= 0x80) take(8);
      } else if (mode === 3) {
        take(16);
      } else if (mode === 5 || mode === 9) {
        continue;
      } else return null;
    }
    flushBytes();
    return out;
  }

  function decodeMatrix(modules) {
    var size = modules.length;
    if (size < 21 || size > 177 || (size - 17) % 4 !== 0) return null;
    var ver = (size - 17) / 4;
    if (ver >= 7) {
      var vi = readVersionInfo(modules);
      if (vi && vi !== ver) ver = vi;
    }
    var fmt = readFormat(modules);
    if (!fmt) return null;

    var fn = fnMap(ver);
    var eIdx = { L: 1, M: 0, Q: 3, H: 2 };
    var col = { L: 0, M: 1, Q: 2, H: 3 }[fmt.ecc];

    var bits = [];
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (fn[y][x]) continue;
          var bit = modules[y][x];
          if (maskFn(fmt.mask, x, y)) bit ^= 1;
          bits.push(bit);
        }
      }
    }
    var totalCW = totalCodewords(ver);
    if (bits.length < totalCW * 8) return null;
    var stream = [];
    for (var b = 0; b < totalCW; b++) {
      var v = 0;
      for (var k = 0; k < 8; k++) v = (v << 1) | bits[b * 8 + k];
      stream.push(v);
    }

    var nBlocks = NUM_BLOCKS[ver - 1][col];
    var ecPer = ECC_CW[ver - 1][col];
    var shortLen = Math.floor((totalCW - nBlocks * ecPer) / nBlocks);
    var nLong = (totalCW - nBlocks * ecPer) % nBlocks;
    function dlen(bi) { return shortLen + (bi >= nBlocks - nLong ? 1 : 0); }

    var dBlocks = [], eBlocks = [], bi, idx = 0;
    for (bi = 0; bi < nBlocks; bi++) { dBlocks.push([]); eBlocks.push([]); }
    for (var c = 0; c < shortLen + 1; c++)
      for (bi = 0; bi < nBlocks; bi++)
        if (c < dlen(bi)) dBlocks[bi].push(stream[idx++]);
    for (var c2 = 0; c2 < ecPer; c2++)
      for (bi = 0; bi < nBlocks; bi++) eBlocks[bi].push(stream[idx++]);

    var data = [], corrected = 0;
    for (bi = 0; bi < nBlocks; bi++) {
      var cw = dBlocks[bi].concat(eBlocks[bi]);
      var fixed = rsCorrect(cw, ecPer);
      if (fixed < 0) return null;
      corrected += fixed;
      for (var d = 0; d < dBlocks[bi].length; d++) data.push(cw[d]);
    }
    var text = parsePayload(data, ver);
    if (text === null || text === '') return null;
    return { text: text, version: ver, ecc: fmt.ecc, corrected: corrected };
  }

  function toGray(img) {
    var w = img.width, h = img.height, src = img.data;
    var g = new Uint8Array(w * h);
    for (var i = 0, p = 0; i < g.length; i++, p += 4) {
      g[i] = (src[p] * 77 + src[p + 1] * 151 + src[p + 2] * 28) >> 8;
    }
    return { w: w, h: h, d: g };
  }
  function threshold(gray) {
    var w = gray.w, h = gray.h, d = gray.d;
    var I = new Float64Array((w + 1) * (h + 1));
    for (var y = 0; y < h; y++) {
      var rowSum = 0;
      for (var x = 0; x < w; x++) {
        rowSum += d[y * w + x];
        I[(y + 1) * (w + 1) + (x + 1)] = I[y * (w + 1) + (x + 1)] + rowSum;
      }
    }
    var win = Math.max(16, Math.floor(Math.min(w, h) / 8));
    var half = win >> 1;
    var bin = new Uint8Array(w * h);
    for (var y2 = 0; y2 < h; y2++) {
      var y0 = Math.max(0, y2 - half), y1 = Math.min(h, y2 + half + 1);
      for (var x2 = 0; x2 < w; x2++) {
        var x0 = Math.max(0, x2 - half), x1 = Math.min(w, x2 + half + 1);
        var area = (x1 - x0) * (y1 - y0);
        var sum = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] -
                  I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
        bin[y2 * w + x2] = (d[y2 * w + x2] * area <= sum * 0.88) ? 1 : 0;
      }
    }
    return { w: w, h: h, d: bin };
  }

  function ratioOK(r) {
    var unit = (r[0] + r[1] + r[2] + r[3] + r[4]) / 7;
    if (unit < 0.7) return 0;
    var t = unit * 0.75;
    if (Math.abs(r[0] - unit) < t && Math.abs(r[1] - unit) < t &&
        Math.abs(r[2] - 3 * unit) < 3 * t * 0.8 &&
        Math.abs(r[3] - unit) < t && Math.abs(r[4] - unit) < t) return unit;
    return 0;
  }
  function crossCheckV(bin, cx, cy, unit) {
    var w = bin.w, h = bin.h, d = bin.d;
    function runFrom(x, y, dy, want) {
      var n = 0;
      while (y >= 0 && y < h && d[y * w + x] === want && n < unit * 6) { n++; y += dy; }
      return n;
    }
    var up3 = runFrom(cx, cy, -1, 1), dn3 = runFrom(cx, cy + 1, 1, 1);
    var mid = up3 + dn3;
    var yTop = cy - up3, yBot = cy + dn3 + 1;
    var up2 = runFrom(cx, yTop - 1 >= 0 ? yTop - 1 : 0, -1, 0);
    var dn2 = runFrom(cx, yBot < h ? yBot : h - 1, 1, 0);
    var up1 = runFrom(cx, yTop - up2 - 1 >= 0 ? yTop - up2 - 1 : 0, -1, 1);
    var dn1 = runFrom(cx, yBot + dn2 < h ? yBot + dn2 : h - 1, 1, 1);
    var u = ratioOK([up1, up2, mid, dn2, dn1]);
    if (!u) return null;
    return cy - up3 + mid / 2;
  }
  function findFinders(bin) {
    var w = bin.w, h = bin.h, d = bin.d;
    var found = [];
    var step = 1;
    for (var y = 0; y < h; y += step) {
      var runs = [], vals = [];
      var x = 0;
      while (x < w) {
        var v = d[y * w + x], n = 0;
        while (x < w && d[y * w + x] === v) { n++; x++; }
        runs.push(n); vals.push(v);
      }
      for (var i = 0; i + 4 < runs.length; i++) {
        if (vals[i] !== 1) continue;
        var r = runs.slice(i, i + 5);
        var unit = ratioOK(r);
        if (!unit) continue;
        var endX = 0;
        for (var k = 0; k <= i + 4; k++) endX += runs[k];
        var cx = Math.round(endX - r[4] - r[3] - r[2] / 2);
        var cyV = crossCheckV(bin, cx, y, unit);
        if (cyV === null) continue;
        var cy = Math.round(cyV);
        var merged = false;
        for (var f = 0; f < found.length; f++) {
          if (Math.abs(found[f].x - cx) < unit * 2 && Math.abs(found[f].y - cy) < unit * 2) {
            found[f].x = (found[f].x * found[f].n + cx) / (found[f].n + 1);
            found[f].y = (found[f].y * found[f].n + cy) / (found[f].n + 1);
            found[f].unit = (found[f].unit * found[f].n + unit) / (found[f].n + 1);
            found[f].n++;
            merged = true; break;
          }
        }
        if (!merged) found.push({ x: cx, y: cy, unit: unit, n: 1 });
      }
    }
    var strong = found.filter(function (f) { return f.n >= 2; });
    return strong.length >= 3 ? strong : found;
  }

  function dist(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)); }

  function chooseTriple(cands) {
    if (cands.length < 3) return null;
    var best = null, bestScore = Infinity;
    for (var i = 0; i < cands.length; i++)
      for (var j = i + 1; j < cands.length; j++)
        for (var k = j + 1; k < cands.length; k++) {
          var t = orient(cands[i], cands[j], cands[k]);
          if (!t) continue;
          var legA = dist(t.tl, t.tr), legB = dist(t.tl, t.bl);
          var unitAvg = (t.tl.unit + t.tr.unit + t.bl.unit) / 3;
          var uniform = (Math.abs(t.tl.unit - unitAvg) + Math.abs(t.tr.unit - unitAvg) +
                         Math.abs(t.bl.unit - unitAvg)) / unitAvg;
          var legRatio = Math.abs(legA - legB) / Math.max(legA, legB);
          var v1x = t.tr.x - t.tl.x, v1y = t.tr.y - t.tl.y;
          var v2x = t.bl.x - t.tl.x, v2y = t.bl.y - t.tl.y;
          var cosA = Math.abs(v1x * v2x + v1y * v2y) / (legA * legB);
          var score = uniform * 2 + legRatio + cosA * 3;
          if (score < bestScore) { bestScore = score; best = t; }
        }
    return (best && bestScore < 1.2) ? best : null;
  }
  function orient(a, b, c) {
    var combos = [[a, b, c], [b, a, c], [c, a, b]];
    var best = null, bestCos = 0.4;
    for (var i = 0; i < combos.length; i++) {
      var tl = combos[i][0], p = combos[i][1], q = combos[i][2];
      var v1x = p.x - tl.x, v1y = p.y - tl.y, v2x = q.x - tl.x, v2y = q.y - tl.y;
      var la = Math.sqrt(v1x * v1x + v1y * v1y), lb = Math.sqrt(v2x * v2x + v2y * v2y);
      if (!la || !lb) continue;
      var cosA = Math.abs(v1x * v2x + v1y * v2y) / (la * lb);
      if (cosA < bestCos) {
        bestCos = cosA;
        best = (v1x * v2y - v1y * v2x > 0) ? { tl: tl, tr: p, bl: q } : { tl: tl, tr: q, bl: p };
      }
    }
    return best;
  }

  function homography(srcPts, dstPts) {
    var A = [], i;
    for (i = 0; i < 4; i++) {
      var sx = srcPts[i][0], sy = srcPts[i][1], dx = dstPts[i][0], dy = dstPts[i][1];
      A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx, dx]);
      A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy, dy]);
    }
    for (var col = 0; col < 8; col++) {
      var piv = col;
      for (i = col + 1; i < 8; i++) if (Math.abs(A[i][col]) > Math.abs(A[piv][col])) piv = i;
      if (Math.abs(A[piv][col]) < 1e-9) return null;
      var tmp = A[col]; A[col] = A[piv]; A[piv] = tmp;
      for (i = 0; i < 8; i++) {
        if (i === col) continue;
        var f = A[i][col] / A[col][col];
        for (var j2 = col; j2 < 9; j2++) A[i][j2] -= f * A[col][j2];
      }
    }
    var hm = [];
    for (i = 0; i < 8; i++) hm.push(A[i][8] / A[i][i]);
    hm.push(1);
    return function (u, v) {
      var dnm = hm[6] * u + hm[7] * v + hm[8];
      return [(hm[0] * u + hm[1] * v + hm[2]) / dnm,
              (hm[3] * u + hm[4] * v + hm[5]) / dnm];
    };
  }

  function sampleMatrix(bin, tl, tr, bl, size) {
    var br = { x: tr.x + bl.x - tl.x, y: tr.y + bl.y - tl.y };
    var H = homography(
      [[3.5, 3.5], [size - 3.5, 3.5], [3.5, size - 3.5], [size - 3.5, size - 3.5]],
      [[tl.x, tl.y], [tr.x, tr.y], [bl.x, bl.y], [br.x, br.y]]);
    if (!H) return null;
    var m = [];
    for (var i = 0; i < size; i++) {
      var row = new Array(size);
      for (var j = 0; j < size; j++) {
        var p = H(j + 0.5, i + 0.5);
        var x = Math.round(p[0]), y = Math.round(p[1]);
        row[j] = (x >= 0 && x < bin.w && y >= 0 && y < bin.h) ? bin.d[y * bin.w + x] : 0;
      }
      m.push(row);
    }
    return m;
  }

  function transpose(m) {
    var n = m.length, out = [];
    for (var i = 0; i < n; i++) {
      var row = new Array(n);
      for (var j = 0; j < n; j++) row[j] = m[j][i];
      out.push(row);
    }
    return out;
  }

  function decodeBinary(bin) {
    var cands = findFinders(bin);
    var t = chooseTriple(cands);
    if (!t) return null;
    var unit = (t.tl.unit + t.tr.unit + t.bl.unit) / 3;
    var dim = Math.round((dist(t.tl, t.tr) / unit + dist(t.tl, t.bl) / unit) / 2) + 7;
    var ver = Math.max(1, Math.min(40, Math.round((dim - 17) / 4)));
    var tries = [ver, ver - 1, ver + 1];
    for (var i = 0; i < tries.length; i++) {
      var v = tries[i];
      if (v < 1 || v > 40) continue;
      var size = v * 4 + 17;
      var m = sampleMatrix(bin, t.tl, t.tr, t.bl, size);
      if (!m) continue;
      var res = decodeMatrix(m) || decodeMatrix(transpose(m));
      if (res) return res;
    }
    return null;
  }

  function decodeImageData(imageData) {
    var gray = toGray(imageData);
    var bin = threshold(gray);
    var res = decodeBinary(bin);
    if (res) return res;
    var inv = new Uint8Array(bin.d.length);
    for (var i = 0; i < inv.length; i++) inv[i] = bin.d[i] ^ 1;
    return decodeBinary({ w: bin.w, h: bin.h, d: inv });
  }

  var API = {
    decodeImageData: decodeImageData,
    decodeMatrix: decodeMatrix,
    _internal: { rsCorrect: rsCorrect, decodeFormat: decodeFormat, parsePayload: parsePayload,
                 threshold: threshold, findFinders: findFinders }
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  else { root.GeodeDecode = API; }
})(typeof self !== 'undefined' ? self : this);

