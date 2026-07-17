(function (root) {
  'use strict';

  var QUIET = 4, K = 0.5522847498;

  function isFinder(c, r, n) {
    return (c < 7 && r < 7) || (c >= n - 7 && r < 7) || (c < 7 && r >= n - 7);
  }
  function n3(v) { return (Math.round(v * 1000) / 1000).toString(); }
  function rgb(c) { return n3(c[0] / 255) + ' ' + n3(c[1] / 255) + ' ' + n3(c[2] / 255); }

  function emitCode(b, code, opts, P) {
    var n = code.size, total = n + QUIET * 2;
    var hasIcon = !!opts.icon;
    var t = Math.min(opts.shape || 0, hasIcon ? 0.70 : 0.88);

    var wellM = 0, w0 = 0, w1 = 0, wpad = 0.4;
    if (hasIcon) {
      wellM = Math.round((total * 0.17 - 1) / 2) * 2 + 1;
      w0 = (total - wellM) / 2; w1 = w0 + wellM;
    }

    var rad = t * 0.5;
    b.fill(P.code);
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (!code.modules[r][c] || isFinder(c, r, n)) continue;
      var ux = c + QUIET, uy = r + QUIET;
      if (hasIcon &&
          ux + 0.5 > w0 - wpad && ux + 0.5 < w1 + wpad &&
          uy + 0.5 > w0 - wpad && uy + 0.5 < w1 + wpad) continue;
      if (rad > 0.01) b.rrect(ux, uy, 1, 1, rad); else b.rect(ux, uy, 1, 1);
    }

    eye(b, 0, 0, t, P);
    eye(b, n - 7, 0, t, P);
    eye(b, 0, n - 7, t, P);

    if (hasIcon) { b.fill([255, 255, 255]); b.rrect(w0, w0, wellM, wellM, 1.4); }
    return { total: total, wellM: wellM, w0: w0 };
  }

  function eye(b, ox, oy, t, P) {
    var x = ox + QUIET, y = oy + QUIET;
    var rr = t * 1.5, gr = t * 1.7, cr = t * 0.75;
    var bx = x + 2, by = y + 2;
    b.fill(P.rim);  b.rrect(x, y, 7, 7, rr);
    b.fill([255, 255, 255]); b.rrect(x + 1, y + 1, 5, 5, gr);
    b.clipRRect(bx, by, 3, 3, cr);
    b.fill(P.gem); b.rrect(bx, by, 3, 3, cr);
    if (t > 0) {
      var x1 = bx + 0.75, x2 = bx + 1.5, x3 = bx + 2.25, x4 = bx + 3;
      var y1 = by + 0.75, y2 = by + 1.5, y3 = by + 2.25, y4 = by + 3;
      var F = P.fc;
      b.fill(F[0]);  b.poly([bx, by, x2, by, x1, y1]);
      b.fill(F[1]);  b.poly([x2, by, x3, y1, x1, y1]);
      b.fill(F[2]);  b.poly([x2, by, x4, by, x3, y1]);
      b.fill(F[3]);  b.poly([bx, by, x1, y1, bx, y2]);
      b.fill(F[4]);  b.poly([bx, y2, x1, y1, x1, y3]);
      b.fill(F[5]);  b.poly([bx, y2, x1, y3, bx, y4]);
      b.fill(F[6]);  b.poly([x4, by, x4, y2, x3, y1]);
      b.fill(F[7]);  b.poly([x4, y2, x3, y1, x3, y3]);
      b.fill(F[8]);  b.poly([x4, y2, x4, y4, x3, y3]);
      b.fill(F[9]);  b.poly([bx, y4, x1, y3, x2, y4]);
      b.fill(F[10]); b.poly([x2, y4, x1, y3, x3, y3]);
      b.fill(F[11]); b.poly([x2, y4, x3, y3, x4, y4]);
      b.fill(P.table); b.rect(x1, y1, 1.5, 1.5);
      b.fill([255, 255, 255]);
      b.poly([bx + 0.985, by + 0.51, bx + 0.858, by + 0.793,
              bx + 0.56, by + 0.94, bx + 0.658, by + 0.733]);
    }
    b.restore();
  }

  function rrOps(x, y, w, h, r, mv, ln, cv, cl) {
    r = Math.min(r, Math.min(w, h) / 2);
    var k = K * r, o = [];
    o.push(mv(x + r, y));
    o.push(ln(x + w - r, y));
    o.push(cv(x + w - r + k, y, x + w, y + r - k, x + w, y + r));
    o.push(ln(x + w, y + h - r));
    o.push(cv(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h));
    o.push(ln(x + r, y + h));
    o.push(cv(x + r - k, y + h, x, y + h - r + k, x, y + h - r));
    o.push(ln(x, y + r));
    o.push(cv(x, y + r - k, x + r - k, y, x + r, y));
    o.push(cl());
    return o.join('\n');
  }

  function pdfBackend(scale) {
    var out = [], depth = 0;
    function mv(a, b) { return n3(a) + ' ' + n3(b) + ' m'; }
    function ln(a, b) { return n3(a) + ' ' + n3(b) + ' l'; }
    function cv(a, b, c, d, e, f) { return [a, b, c, d, e, f].map(n3).join(' ') + ' c'; }
    function cl() { return 'h'; }
    return {
      fill: function (c) { out.push(rgb(c) + ' rg'); },
      rect: function (x, y, w, h) { out.push([x, y, w, h].map(n3).join(' ') + ' re f'); },
      rrect: function (x, y, w, h, r) { out.push(rrOps(x, y, w, h, r, mv, ln, cv, cl) + '\nf'); },
      poly: function (p) {
        var s = [mv(p[0], p[1])];
        for (var i = 2; i < p.length; i += 2) s.push(ln(p[i], p[i + 1]));
        s.push('h f');
        out.push(s.join('\n'));
      },
      clipRRect: function (x, y, w, h, r) {
        out.push('q');
        out.push(rrOps(x, y, w, h, r, mv, ln, cv, cl) + '\nW n');
        depth++;
      },
      restore: function () { if (depth > 0) { out.push('Q'); depth--; } },
      ops: function () { while (depth-- > 0) out.push('Q'); return out.join('\n'); }
    };
  }

  function epsBackend() {
    var out = [], depth = 0;
    function mv(a, b) { return n3(a) + ' ' + n3(b) + ' moveto'; }
    function ln(a, b) { return n3(a) + ' ' + n3(b) + ' lineto'; }
    function cv(a, b, c, d, e, f) { return [a, b, c, d, e, f].map(n3).join(' ') + ' curveto'; }
    function cl() { return 'closepath'; }
    return {
      fill: function (c) { out.push(rgb(c) + ' setrgbcolor'); },
      rect: function (x, y, w, h) { out.push([x, y, w, h].map(n3).join(' ') + ' rectfill'); },
      rrect: function (x, y, w, h, r) { out.push('newpath\n' + rrOps(x, y, w, h, r, mv, ln, cv, cl) + '\nfill'); },
      poly: function (p) {
        var s = ['newpath', mv(p[0], p[1])];
        for (var i = 2; i < p.length; i += 2) s.push(ln(p[i], p[i + 1]));
        s.push('closepath fill');
        out.push(s.join('\n'));
      },
      clipRRect: function (x, y, w, h, r) {
        out.push('gsave\nnewpath\n' + rrOps(x, y, w, h, r, mv, ln, cv, cl) + '\nclip');
        depth++;
      },
      restore: function () { if (depth > 0) { out.push('grestore'); depth--; } },
      ops: function () { while (depth-- > 0) out.push('grestore'); return out.join('\n'); }
    };
  }

  function stripJPEG(bigCanvas, sx, sy, sw, sh) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(sw));
    c.height = Math.max(1, Math.round(sh));
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bigCanvas, sx, sy, sw, sh, 0, 0, c.width, c.height);
    var b64 = c.toDataURL('image/jpeg', 0.94).split(',')[1];
    var bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return { data: u8, w: c.width, h: c.height };
  }

  function str2u8(s) {
    var u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff;
    return u;
  }

  function toPDF(code, opts, R) {
    var P = R.palette(opts.hue, opts.shading);
    var total = code.size + QUIET * 2;
    var L = R.layout(total, opts);
    var mpt = 600 / total;
    var Wpt = L.W * mpt, Hpt = L.H * mpt;

    var b = pdfBackend();
    if (!opts.transparent) { b.fill([255, 255, 255]); b.rect(0, 0, L.W, L.H); }
    var stream = ['q', n3(mpt) + ' 0 0 ' + n3(-mpt) + ' 0 ' + n3(Hpt) + ' cm',
                  'q', '1 0 0 1 ' + n3(L.qx) + ' ' + n3(L.qy) + ' cm'];
    emitCode(b, code, opts, P);
    stream.push(b.ops(), 'Q');
    if (L.frame === 'full') {
      var bw = L.bw, k2 = 0.5522847498;
      var bx0 = bw / 2, by0 = bw / 2, bw2 = L.W - bw, bh2 = L.H - bw;
      var br = Math.max(0, L.r - bw / 2), kk = k2 * br;
      stream.push(rgb(P.rim) + ' RG ' + n3(bw) + ' w');
      stream.push([
        n3(bx0 + br) + ' ' + n3(by0) + ' m',
        n3(bx0 + bw2 - br) + ' ' + n3(by0) + ' l',
        [bx0 + bw2 - br + kk, by0, bx0 + bw2, by0 + br - kk, bx0 + bw2, by0 + br].map(n3).join(' ') + ' c',
        n3(bx0 + bw2) + ' ' + n3(by0 + bh2 - br) + ' l',
        [bx0 + bw2, by0 + bh2 - br + kk, bx0 + bw2 - br + kk, by0 + bh2, bx0 + bw2 - br, by0 + bh2].map(n3).join(' ') + ' c',
        n3(bx0 + br) + ' ' + n3(by0 + bh2) + ' l',
        [bx0 + br - kk, by0 + bh2, bx0, by0 + bh2 - br + kk, bx0, by0 + bh2 - br].map(n3).join(' ') + ' c',
        n3(bx0) + ' ' + n3(by0 + br) + ' l',
        [bx0, by0 + br - kk, bx0 + br - kk, by0, bx0 + br, by0].map(n3).join(' ') + ' c',
        'h S'
      ].join('\n'));
    }
    stream.push('Q');

    var images = [];
    function place(img, xU, yU, wU, hU) {
      var idx = images.length + 1;
      images.push(img);
      stream.push('q ' + n3(wU * mpt) + ' 0 0 ' + n3(hU * mpt) + ' ' +
                  n3(xU * mpt) + ' ' + n3(Hpt - (yU + hU) * mpt) + ' cm /Im' + idx + ' Do Q');
    }
    if (L.deco && typeof document !== 'undefined') {
      var px = 2048 / total;
      var cv = document.createElement('canvas');
      R.toCanvas(cv, code, Object.assign({}, opts, { size: 2048, transparent: false }));
      var m2 = px;
      if (opts.title) {
        var ty0 = 0, ty1 = L.qy;
        place(stripJPEG(cv, 0, ty0, L.W * m2, ty1 * m2), 0, ty0, L.W, ty1);
      }
      if (opts.caption) {
        var cy0 = L.qy + total, cy1 = (L.barY || L.H) - cy0;
        place(stripJPEG(cv, 0, cy0 * m2, L.W * m2, cy1 * m2), 0, cy0, L.W, cy1);
      }
      if (L.frame && L.frame !== 'none') {
        place(stripJPEG(cv, 0, L.barY * m2, L.W * m2, L.barH * m2), 0, L.barY, L.W, L.barH);
      }
      if (opts.icon) {
        var g = { total: total };
        var wellM = Math.round((total * 0.17 - 1) / 2) * 2 + 1;
        var w0 = (total - wellM) / 2;
        place(stripJPEG(cv, (L.qx + w0) * m2, (L.qy + w0) * m2, wellM * m2, wellM * m2),
              L.qx + w0, L.qy + w0, wellM, wellM);
      }
    }

    var content = stream.join('\n');

    var objs = [];
    var imgRefs = images.map(function (im, i) {
      return '/Im' + (i + 1) + ' ' + (5 + i) + ' 0 R';
    }).join(' ');
    objs.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    objs.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    objs.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + n3(Wpt) + ' ' + n3(Hpt) +
              '] /Contents 4 0 R /Resources << /XObject << ' + imgRefs + ' >> >> >>\nendobj\n');
    objs.push('4 0 obj\n<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');

    var chunks = [str2u8('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')];
    var offsets = [0];
    function push(u8) {
      var off = 0;
      for (var i = 0; i < chunks.length; i++) off += chunks[i].length;
      offsets.push(off);
      chunks.push(u8);
    }
    objs.forEach(function (o) { push(str2u8(o)); });
    images.forEach(function (im, i) {
      var head = (5 + i) + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + im.w +
                 ' /Height ' + im.h +
                 ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
                 im.data.length + ' >>\nstream\n';
      var u = new Uint8Array(head.length + im.data.length + 20);
      u.set(str2u8(head), 0);
      u.set(im.data, head.length);
      u.set(str2u8('\nendstream\nendobj\n'), head.length + im.data.length);
      push(u.subarray(0, head.length + im.data.length + 18));
    });

    var count = 5 + images.length;
    var xrefOff = 0;
    for (var i = 0; i < chunks.length; i++) xrefOff += chunks[i].length;
    var xref = 'xref\n0 ' + count + '\n0000000000 65535 f \n';
    for (var j = 1; j < count; j++) {
      xref += ('0000000000' + offsets[j]).slice(-10) + ' 00000 n \n';
    }
    xref += 'trailer\n<< /Size ' + count + ' /Root 1 0 R >>\nstartxref\n' + xrefOff + '\n%%EOF\n';
    chunks.push(str2u8(xref));

    var totalLen = 0;
    chunks.forEach(function (c) { totalLen += c.length; });
    var outU8 = new Uint8Array(totalLen), pos = 0;
    chunks.forEach(function (c) { outU8.set(c, pos); pos += c.length; });
    return outU8;
  }

  function toEPS(code, opts, R) {
    var P = R.palette(opts.hue, opts.shading);
    var total = code.size + QUIET * 2;
    var pt = 600;
    var b = epsBackend();
    if (!opts.transparent) { b.fill([255, 255, 255]); b.rect(0, 0, total, total); }
    emitCode(b, code, opts, P);
    return ['%!PS-Adobe-3.0 EPSF-3.0',
            '%%BoundingBox: 0 0 ' + pt + ' ' + pt,
            '%%Title: GeodeQR code',
            '%%Creator: GeodeQR (geodeforge.com)',
            '%%LanguageLevel: 2',
            '%%Pages: 1',
            '%%EndComments',
            'gsave',
            n3(pt / total) + ' ' + n3(pt / total) + ' scale',
            '0 ' + total + ' translate 1 -1 scale',
            b.ops(),
            'grestore',
            'showpage',
            '%%EOF'].join('\n');
  }

  var API = { toPDF: toPDF, toEPS: toEPS };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  else { root.GeodeExport = API; }
})(typeof self !== 'undefined' ? self : this);

