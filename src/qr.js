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

  function rsGenPoly(deg) {
    var poly = [1];
    for (var i = 0; i < deg; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gmul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }
  function rsEncode(data, ecLen) {
    var gen = rsGenPoly(ecLen);
    var res = new Array(ecLen).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ res[0];
      res.shift(); res.push(0);
      for (var j = 0; j < ecLen; j++) res[j] ^= gmul(gen[j + 1], factor);
    }
    return res;
  }

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
  var ECI = { L: 0, M: 1, Q: 2, H: 3 };

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
    var raw = size * size;
    raw -= 3 * 64;
    raw -= 2 * (size - 16);
    var ap = alignPositions(ver), k = ap.length;
    if (k) {
      var n = k * k - 3;
      raw -= n * 25;
      raw += (k - 2) * 2 * 5;
    }
    raw -= 31;
    if (ver >= 7) raw -= 36;
    return Math.floor(raw / 8);
  }

  function dataCapacityBits(ver, ecc) {
    var e = ECI[ecc];
    var blocks = NUM_BLOCKS[ver - 1][e];
    var ecPer = ECC_CW[ver - 1][e];
    return (totalCodewords(ver) - blocks * ecPer) * 8;
  }

  function utf8Bytes(str) {
    var out = [], i, c;
    for (i = 0; i < str.length; i++) {
      c = str.codePointAt(i);
      if (c > 0xFFFF) i++;
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xC0 | (c >> 6), 0x80 | (c & 63)); }
      else if (c < 0x10000) { out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
      else { out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
    }
    return out;
  }

  function Bits() { this.b = []; }
  Bits.prototype.put = function (val, len) {
    for (var i = len - 1; i >= 0; i--) this.b.push((val >>> i) & 1);
  };
  Bits.prototype.len = function () { return this.b.length; };

  function encodeToCodewords(text, ver, ecc, useECI) {
    var bytes = utf8Bytes(text);
    var bits = new Bits();
    if (useECI) { bits.put(0b0111, 4); bits.put(26, 8); }
    bits.put(0b0100, 4);
    var lenBits = (ver <= 9) ? 8 : 16;
    bits.put(bytes.length, lenBits);
    for (var i = 0; i < bytes.length; i++) bits.put(bytes[i], 8);

    var cap = dataCapacityBits(ver, ecc);
    if (bits.len() > cap) return null;

    var term = Math.min(4, cap - bits.len());
    bits.put(0, term);
    while (bits.len() % 8 !== 0) bits.b.push(0);

    var data = [];
    for (var j = 0; j < bits.len(); j += 8) {
      var v = 0;
      for (var k = 0; k < 8; k++) v = (v << 1) | bits.b[j + k];
      data.push(v);
    }
    var pad = [0xEC, 0x11], p = 0;
    while (data.length * 8 < cap) { data.push(pad[p]); p ^= 1; }

    var e = ECI[ecc];
    var nBlocks = NUM_BLOCKS[ver - 1][e];
    var ecPer = ECC_CW[ver - 1][e];
    var total = totalCodewords(ver);
    var shortLen = Math.floor((total - nBlocks * ecPer) / nBlocks);
    var nLong = (total - nBlocks * ecPer) % nBlocks;

    var dBlocks = [], eBlocks = [], off = 0;
    for (var b = 0; b < nBlocks; b++) {
      var len = shortLen + (b >= nBlocks - nLong ? 1 : 0);
      var chunk = data.slice(off, off + len); off += len;
      dBlocks.push(chunk);
      eBlocks.push(rsEncode(chunk, ecPer));
    }
    var out = [];
    for (var c = 0; c < shortLen + 1; c++)
      for (var bb = 0; bb < nBlocks; bb++)
        if (c < dBlocks[bb].length) out.push(dBlocks[bb][c]);
    for (var c2 = 0; c2 < ecPer; c2++)
      for (var b2 = 0; b2 < nBlocks; b2++) out.push(eBlocks[b2][c2]);
    return out;
  }

  function buildMatrix(ver, ecc, codewords, mask) {
    var size = ver * 4 + 17;
    var m = [], fn = [];
    for (var i = 0; i < size; i++) { m.push(new Array(size).fill(0)); fn.push(new Array(size).fill(0)); }

    function setFn(x, y, v) { if (x >= 0 && x < size && y >= 0 && y < size) { m[y][x] = v; fn[y][x] = 1; } }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy));
        setFn(cx + dx, cy + dy, (d !== 2 && d <= 3) ? 1 : 0);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    for (var t = 8; t < size - 8; t++) { setFn(6, t, t % 2 === 0 ? 1 : 0); setFn(t, 6, t % 2 === 0 ? 1 : 0); }

    var ap = alignPositions(ver);
    for (var a = 0; a < ap.length; a++) for (var bqq = 0; bqq < ap.length; bqq++) {
      var ax = ap[a], ay = ap[bqq];
      if ((ax === 6 && ay === 6) || (ax === 6 && ay === size - 7) || (ax === size - 7 && ay === 6)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) {
        var dd = Math.max(Math.abs(dx2), Math.abs(dy2));
        setFn(ax + dx2, ay + dy2, dd !== 1 ? 1 : 0);
      }
    }

    for (var f = 0; f < 9; f++) {
      if (f === 6) continue;
      setFn(f, 8, 0); setFn(8, f, 0);
    }
    for (var f2 = 0; f2 < 8; f2++) { setFn(size - 1 - f2, 8, 0); setFn(8, size - 1 - f2, 0); }
    setFn(8, size - 8, 1);
    if (ver >= 7) {
      for (var vi = 0; vi < 18; vi++) {
        var vx = Math.floor(vi / 3), vy = size - 11 + (vi % 3);
        setFn(vx, vy, 0); setFn(vy, vx, 0);
      }
    }

    var bitIdx = 0;
    function bitAt(i) {
      if (i >= codewords.length * 8) return 0;
      return (codewords[i >> 3] >> (7 - (i & 7))) & 1;
    }
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j2 = 0; j2 < 2; j2++) {
          var x = right - j2;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (fn[y][x]) continue;
          var bit = bitAt(bitIdx++);
          if (maskFn(mask, x, y)) bit ^= 1;
          m[y][x] = bit;
        }
      }
    }

    var fmtBits = (({ L: 1, M: 0, Q: 3, H: 2 })[ecc] << 3) | mask;
    var rem = fmtBits;
    for (var q = 0; q < 10; q++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var fmt = ((fmtBits << 10) | rem) ^ 0x5412;
    for (var i2 = 0; i2 <= 5; i2++) m[i2][8] = (fmt >> i2) & 1;
    m[7][8] = (fmt >> 6) & 1; m[8][8] = (fmt >> 7) & 1; m[8][7] = (fmt >> 8) & 1;
    for (var i3 = 9; i3 < 15; i3++) m[8][14 - i3] = (fmt >> i3) & 1;
    for (var i4 = 0; i4 < 8; i4++) m[8][size - 1 - i4] = (fmt >> i4) & 1;
    for (var i5 = 8; i5 < 15; i5++) m[size - 15 + i5][8] = (fmt >> i5) & 1;
    m[size - 8][8] = 1;

    if (ver >= 7) {
      var vrem = ver;
      for (var v1 = 0; v1 < 12; v1++) vrem = (vrem << 1) ^ ((vrem >>> 11) * 0x1F25);
      var vbits = (ver << 12) | vrem;
      for (var v2 = 0; v2 < 18; v2++) {
        var bit2 = (vbits >> v2) & 1;
        var vx2 = Math.floor(v2 / 3), vy2 = size - 11 + (v2 % 3);
        m[vy2][vx2] = bit2; m[vx2][vy2] = bit2;
      }
    }
    return m;
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

  function penalty(m) {
    var size = m.length, p = 0, i, j, run, dark = 0;
    for (i = 0; i < size; i++) {
      run = 1;
      for (j = 1; j < size; j++) {
        if (m[i][j] === m[i][j - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; }
        else run = 1;
      }
      run = 1;
      for (j = 1; j < size; j++) {
        if (m[j][i] === m[j - 1][i]) { run++; if (run === 5) p += 3; else if (run > 5) p++; }
        else run = 1;
      }
    }
    for (i = 0; i < size - 1; i++) for (j = 0; j < size - 1; j++) {
      var v = m[i][j];
      if (v === m[i][j + 1] && v === m[i + 1][j] && v === m[i + 1][j + 1]) p += 3;
    }
    var pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function countOcc(arr, pat) {
      var n = 0;
      for (var k = 0; k <= arr.length - 11; k++) {
        var ok = true;
        for (var l = 0; l < 11; l++) { if (arr[k + l] !== pat[l]) { ok = false; break; } }
        if (ok) n++;
      }
      return n;
    }
    var PAD = [0, 0, 0, 0];
    for (i = 0; i < size; i++) {
      var colArr = [];
      for (j = 0; j < size; j++) colArr.push(m[j][i]);
      var rowP = PAD.concat(m[i], PAD);
      var colP = PAD.concat(colArr, PAD);
      p += 40 * (countOcc(rowP, pat1) + countOcc(rowP, pat2) +
                 countOcc(colP, pat1) + countOcc(colP, pat2));
    }
    for (i = 0; i < size; i++) for (j = 0; j < size; j++) if (m[i][j]) dark++;
    var pct = dark * 100 / (size * size);
    p += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return p;
  }

  function finderLike(m) {
    var size = m.length, pat = [1, 0, 1, 1, 1, 0, 1], count = 0, i, j, k, l, line, ok;
    function scan(line) {
      for (var a = 0; a <= line.length - 7; a++) {
        var hit = true;
        for (var b = 0; b < 7; b++) { if (line[a + b] !== pat[b]) { hit = false; break; } }
        if (hit) count++;
      }
    }
    for (i = 0; i < size; i++) {
      scan([0, 0, 0, 0].concat(m[i], [0, 0, 0, 0]));
      var col = [];
      for (j = 0; j < size; j++) col.push(m[j][i]);
      scan([0, 0, 0, 0].concat(col, [0, 0, 0, 0]));
    }
    return count;
  }

  function encode(text, opts) {
    opts = opts || {};
    var ecc = opts.ecc || 'H';
    var useECI = opts.eci === true;
    var ver = null, cw = null;
    for (var v = (opts.minVersion || 1); v <= 40; v++) {
      cw = encodeToCodewords(text, v, ecc, useECI);
      if (cw) { ver = v; break; }
    }
    if (!ver) throw new Error('Content too long for a QR code, even at version 40.');

    var best = null, bestFF = Infinity, bestP = Infinity;
    for (var mk = 0; mk < 8; mk++) {
      var m = buildMatrix(ver, ecc, cw, mk);
      var ff = finderLike(m), p = penalty(m);
      if (ff < bestFF || (ff === bestFF && p < bestP)) { bestFF = ff; bestP = p; best = m; }
    }
    return { size: best.length, modules: best, version: ver, ecc: ecc };
  }
  var API = {
    encode: encode,
    utf8Bytes: utf8Bytes,
    _internal: {
      buildMatrix: buildMatrix,
      encodeToCodewords: encodeToCodewords,
      totalCodewords: totalCodewords,
      dataCapacityBits: dataCapacityBits,
      alignPositions: alignPositions,
      penalty: penalty,
      finderLike: finderLike
    }
  };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; }
  else { root.GeodeQR = API; }
})(typeof self !== "undefined" ? self : this);

