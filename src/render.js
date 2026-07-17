(function (root) {
  'use strict';

  var RIM_R_MAX = 1.5;
  var QUIET = 4;
  var WELL_FRAC = 0.17;
  var ICON_SHAPE_MAX = 0.70;
  var TEXT_SCALE_MIN = 0.6, TEXT_SCALE_MAX = 1.2;

  var SANS = "system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
  var MONO = "ui-monospace,Menlo,Consolas,monospace";

  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    function hue(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    if (s === 0) { var v = Math.round(l * 255); return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [Math.round(hue(p, q, h + 1 / 3) * 255),
            Math.round(hue(p, q, h) * 255),
            Math.round(hue(p, q, h - 1 / 3) * 255)];
  }
  function lum(c) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }
  function css(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
  function hex(c) {
    return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  function contrast(c) { return 1.05 / (lum(c) + 0.05); }

  function safeL(hue) {
    var l = 0.58;
    while (l > 0.12 && lum(hsl(hue, 0.9, l)) > 0.30) l -= 0.02;
    return l;
  }

  var EYE_LIGHT = 1.5;
  function eL(l) { return Math.min(0.92, l * EYE_LIGHT); }
  function palette(hue, shading) {
    var Ls = safeL(hue), L = Ls * (1 - shading);
    var code = hsl(hue, 0.9, L);
    return {
      code: code, codeCss: css(code), codeHex: hex(code),
      contrast: contrast(code),
      pureHex: hex(hsl(hue, 0.9, Ls)),
      rim:   hsl(hue, 0.76, eL(0.165)),
      gem:   hsl(hue, 0.66, eL(0.185)),
      fc: [ hsl(hue, 0.35, 0.44),  hsl(hue, 0.49, 0.235), hsl(hue, 0.52, 0.22),
            hsl(hue, 0.38, 0.35),  hsl(hue, 0.49, 0.215), hsl(hue, 0.59, 0.19),
            hsl(hue, 0.76, 0.135), hsl(hue, 0.71, 0.11),  hsl(hue, 0.67, 0.165),
            hsl(hue, 0.67, 0.12),  hsl(hue, 0.67, 0.105), hsl(hue, 0.67, 0.13) ],
      glo:   hsl(hue, 0.62, 0.71),
      table: hsl(hue, 0.40, eL(0.068))
    };
  }

  function isFinder(c, r, n) {
    return (c < 7 && r < 7) || (c >= n - 7 && r < 7) || (c < 7 && r >= n - 7);
  }

  var ICONS = {
    link: [
      { d: 'M12.8 7.2l1.8-1.8a3.8 3.8 0 0 1 5.4 5.4l-1.8 1.8', s: '#1E6BD6', w: 2.1 },
      { d: 'M11.2 16.8l-1.8 1.8a3.8 3.8 0 0 1-5.4-5.4l1.8-1.8', s: '#1E6BD6', w: 2.1 },
      { d: 'M9.3 14.7l5.4-5.4', s: '#1E6BD6', w: 2.1 }
    ],
    text: [
      { d: 'M6 8V5.5h12V8', s: '#44403C', w: 2.1 },
      { d: 'M12 5.5v13', s: '#44403C', w: 2.1 },
      { d: 'M9 18.5h6', s: '#44403C', w: 2.1 }
    ],
    wifi: [
      { d: 'M4 10.5A11.3 11.3 0 0 1 20 10.5', s: '#111827', w: 2.1 },
      { d: 'M7 13.5A7.2 7.2 0 0 1 17 13.5', s: '#111827', w: 2.1 },
      { d: 'M10 16.4A2.6 2.6 0 0 1 14 16.4', s: '#111827', w: 2.1 },
      { d: 'M10.5 19.4a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0', f: '#111827' }
    ],
    contact: [
      { d: 'M8.6 8.4a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0-6.8 0', s: '#38618C', w: 2.1 },
      { d: 'M5.2 19.5a6.8 5.6 0 0 1 13.6 0', s: '#38618C', w: 2.1 }
    ],
    mail: [
      { d: 'M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16V8A1.5 1.5 0 0 1 5 6.5z', s: '#B3402E', w: 2 },
      { d: 'M4.2 7.6L12 13.4l7.8-5.8', s: '#B3402E', w: 2 }
    ],
    sms: [
      { d: 'M5.5 4.5h13a2.5 2.5 0 0 1 2.5 2.5v6.5a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.8V16h-1A2.5 2.5 0 0 1 3 13.5V7a2.5 2.5 0 0 1 2.5-2.5z', s: '#1FA35C', w: 2 },
      { d: 'M7.2 10.2a1.15 1.15 0 1 0 2.3 0a1.15 1.15 0 1 0-2.3 0', f: '#1FA35C' },
      { d: 'M10.85 10.2a1.15 1.15 0 1 0 2.3 0a1.15 1.15 0 1 0-2.3 0', f: '#1FA35C' },
      { d: 'M14.5 10.2a1.15 1.15 0 1 0 2.3 0a1.15 1.15 0 1 0-2.3 0', f: '#1FA35C' }
    ],
    phone: [
      { d: 'M7.9 3.6c.6-.6 1.6-.5 2.1.2l1.9 2.7c.4.6.3 1.3-.2 1.8l-1.2 1.2c1.2 2.3 3.1 4.2 5.4 5.4l1.2-1.2c.5-.5 1.2-.6 1.8-.2l2.7 1.9c.7.5.8 1.5.2 2.1l-1.4 1.4c-.8.8-2 1.2-3.1.9-5-1.3-10.4-6.7-11.7-11.7-.3-1.1.1-2.3.9-3.1z', f: '#0E7C42' }
    ],
    pin: [
      { d: 'M12 21.6C10 19.5 5.8 14.7 5.8 10.6a6.2 6.2 0 0 1 12.4 0c0 4.1-4.2 8.9-6.2 11z', f: '#D93025' },
      { d: 'M9.7 10.4a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0-4.6 0', f: '#FFFFFF' }
    ],
    chat: [
      { d: 'M12 3.8c-4.6 0-8.3 3.3-8.3 7.4 0 1.9.8 3.6 2.1 4.9l-1.2 3.6 3.9-1.1c1 .4 2.2.6 3.5.6 4.6 0 8.3-3.3 8.3-7.4S16.6 3.8 12 3.8z', s: '#1DA355', w: 2 },
      { d: 'M9.4 8.9c.4-.4 1-.4 1.4.1l.7 1c.3.4.2.9-.1 1.2l-.4.4c.5.9 1.3 1.6 2.2 2.2l.4-.4c.3-.3.8-.4 1.2-.1l1 .7c.5.4.5 1 .1 1.4l-.5.5c-.4.4-1 .6-1.6.4-2.2-.8-4.2-2.7-4.9-4.9-.2-.6 0-1.2.5-1.6z', f: '#1DA355' }
    ],
    dollar: [
      { d: 'M12 4.2v15.6', s: '#2B6CB0', w: 2.1 },
      { d: 'M15.7 7.7c-.7-1-2-1.7-3.7-1.7-2.1 0-3.8 1.1-3.8 2.8 0 3.8 7.6 2.1 7.6 5.9 0 1.8-1.7 2.9-3.8 2.9-1.8 0-3.2-.7-3.9-1.8', s: '#2B6CB0', w: 2.1 }
    ],
    coin: [
      { d: 'M12 3.6a8.4 8.4 0 1 0 0 16.8a8.4 8.4 0 1 0 0-16.8', s: '#C07E22', w: 2 },
      { d: 'M9.8 7.6v8.8M9.8 7.6h2.9a2 2 0 0 1 0 4H9.8M9.8 11.6h3.3a2.1 2.1 0 0 1 0 4.4H9.8', s: '#C07E22', w: 1.8 },
      { d: 'M11.6 6v1.6M11.6 16.4V18', s: '#C07E22', w: 1.8 }
    ],
    card: [
      { d: 'M4.5 5.8h15A1.5 1.5 0 0 1 21 7.3v9.4a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.7V7.3a1.5 1.5 0 0 1 1.5-1.5z', s: '#38618C', w: 2 },
      { d: 'M6.9 11a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0-3.4 0', s: '#38618C', w: 1.8 },
      { d: 'M5.6 15.9a3.1 2.4 0 0 1 6 0', s: '#38618C', w: 1.8 },
      { d: 'M14 10.4h4.2M14 13.6h4.2', s: '#38618C', w: 1.8 }
    ],
    cam: [
      { d: 'M4.5 7.2h8.6a1.5 1.5 0 0 1 1.5 1.5v6.6a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 15.3V8.7a1.5 1.5 0 0 1 1.5-1.5z', s: '#2D6CDF', w: 2 },
      { d: 'M14.6 10.7l5.4-2.6v7.8l-5.4-2.6z', f: '#2D6CDF' }
    ],
    walletb: [
      { d: 'M4.5 7h13A1.5 1.5 0 0 1 19 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 17.5v-9A1.5 1.5 0 0 1 4.5 7z', s: '#1A6FE0', w: 2 },
      { d: 'M5.5 7l9.5-2.6a1.2 1.2 0 0 1 1.5 1.15V7', s: '#1A6FE0', w: 2 },
      { d: 'M14.5 12h4.5v4h-4.5a2 2 0 0 1 0-4z', f: '#1A6FE0' }
    ],
    walletg: [
      { d: 'M4.5 7h13A1.5 1.5 0 0 1 19 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 17.5v-9A1.5 1.5 0 0 1 4.5 7z', s: '#1FA35C', w: 2 },
      { d: 'M5.5 7l9.5-2.6a1.2 1.2 0 0 1 1.5 1.15V7', s: '#1FA35C', w: 2 },
      { d: 'M14.5 12h4.5v4h-4.5a2 2 0 0 1 0-4z', f: '#1FA35C' }
    ],
    bubble: [
      { d: 'M6 4.5h12A2.5 2.5 0 0 1 20.5 7v7a2.5 2.5 0 0 1-2.5 2.5h-6.5L7 20v-3.5H6A2.5 2.5 0 0 1 3.5 14V7A2.5 2.5 0 0 1 6 4.5z', s: '#06B052', w: 2 },
      { d: 'M7.5 9.2v3.4M7.5 12.6h2.1M11 9.2v3.4M13.8 9.2v3.4l2.3-3.4v3.4', s: '#06B052', w: 1.6 }
    ],
    rupee: [
      { d: 'M7.5 4.8h9M7.5 8.6h9', s: '#3D6B47', w: 2.1 },
      { d: 'M9.5 4.8c5 0 5 7.6 0 7.6H7.5l6.5 6.8', s: '#3D6B47', w: 2.1 }
    ],
    baht: [
      { d: 'M11.6 4v16', s: '#14477D', w: 1.9 },
      { d: 'M8.5 5.8h4.6a2.6 2.6 0 0 1 0 5.2H8.5zM8.5 11h5.2a2.6 2.6 0 0 1 0 5.2H8.5zM8.5 5.8v10.4', s: '#14477D', w: 2 }
    ],
    bank: [
      { d: 'M3.5 9.5L12 4.5l8.5 5z', s: '#38618C', w: 2 },
      { d: 'M5.5 10v6M9.8 10v6M14.2 10v6M18.5 10v6', s: '#38618C', w: 2 },
      { d: 'M4 18.5h16', s: '#38618C', w: 2 }
    ],
    pixd: [
      { d: 'M12 4.2l3.2 3.2-3.2 3.2-3.2-3.2z', s: '#2BB6A3', w: 1.8 },
      { d: 'M12 13.4l3.2 3.2-3.2 3.2-3.2-3.2z', s: '#2BB6A3', w: 1.8 },
      { d: 'M7.4 8.8l3.2 3.2-3.2 3.2-3.2-3.2zM16.6 8.8l3.2 3.2-3.2 3.2-3.2-3.2z', s: '#2BB6A3', w: 1.8 }
    ],
    calendar: [
      { d: 'M6 5.5h12a2 2 0 0 1 2 2V11H4V7.5a2 2 0 0 1 2-2z', f: '#D64541' },
      { d: 'M6 5.5h12a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2z', s: '#3F4753', w: 2 },
      { d: 'M8.2 3.4v3.2M15.8 3.4v3.2', s: '#3F4753', w: 2 },
      { d: 'M8 13.6h2.2v2.2H8zM13.8 13.6H16v2.2h-2.2z', f: '#3F4753' }
    ]
  };

  function shapeSVG(sh) {
    var a = '<path d="' + sh.d + '" fill="' + (sh.f || 'none') + '"';
    if (sh.s) {
      a += ' stroke="' + sh.s + '" stroke-width="' + (sh.w || 2) +
           '" stroke-linecap="round" stroke-linejoin="round"';
    }
    return a + '/>';
  }

  function iconSVG(name, size) {
    var ic = ICONS[name];
    if (!ic) return '';
    var s = '<svg viewBox="0 0 24 24" width="' + (size || 14) + '" height="' + (size || 14) +
            '" aria-hidden="true" focusable="false">';
    for (var i = 0; i < ic.length; i++) s += shapeSVG(ic[i]);
    return s + '</svg>';
  }

  function layout(total, o) {
    var hasT = !!o.title, hasC = !!o.caption;
    var frame = (o.frame === 'bar' || o.frame === 'full') ? o.frame : 'none';
    var L = { frame: frame, deco: hasT || hasC || frame !== 'none',
              W: total, H: total, qx: 0, qy: 0 };
    if (!L.deco) return L;
    var u = total;
    var ts = (o.text && +o.text.scale > 0) ? +o.text.scale : 1;
    ts = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, ts));
    L.pad = u * 0.05;
    L.titleFs = u * 0.058 * ts; L.capFs = u * 0.046 * ts; L.ctaFs = u * 0.05;
    var titleH = hasT ? L.titleFs * 1.55 : 0;
    var capH = hasC ? L.capFs * 1.65 : 0;
    L.barH = frame !== 'none' ? u * 0.135 : 0;
    var top = L.pad * 0.9;
    L.qx = L.pad; L.qy = top + titleH;
    var bottom = L.pad * (frame !== 'none' ? 0.55 : 0.8);
    L.W = u + L.pad * 2;
    var botIn = frame === 'bar' ? L.pad * 0.55 : 0;
    L.H = L.qy + u + capH + bottom + L.barH + botIn;
    L.cx = L.W / 2;
    L.titleY = top + titleH * 0.72;
    L.capY = L.qy + u + capH * 0.6;
    L.barY = L.H - L.barH - botIn;
    L.ctaY = L.barY + L.barH * 0.68;
    L.r = u * 0.055;
    L.bw = u * 0.02;
    return L;
  }

  function wellModules(total) {
    return Math.round((total * WELL_FRAC - 1) / 2) * 2 + 1;
  }

  function textDefaults(t) {
    t = t || {};
    return {
      family: t.family || '',
      color: t.color || '#340A4A',
      scale: (+t.scale > 0) ? +t.scale : 1,
      bold: !!t.bold, ital: !!t.ital, und: !!t.und
    };
  }
  function capColor(t) {
    return (String(t.color).toLowerCase() === '#340a4a') ? '#5F5E5A' : t.color;
  }

  function rrPath(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.min(w, h) / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); if (r > 0) ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); if (r > 0) ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); if (r > 0) ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); if (r > 0) ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  function rrFill(ctx, x, y, w, h, r) { rrPath(ctx, x, y, w, h, r); ctx.fill(); }
  function poly(ctx, pts, fill) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill();
  }

  function drawEye(ctx, ox, oy, m, t, P, bg) {
    var x = (ox + QUIET) * m, y = (oy + QUIET) * m;
    ctx.fillStyle = css(P.rim);
    rrFill(ctx, x, y, 7 * m, 7 * m, t * RIM_R_MAX * m);
    ctx.fillStyle = bg;
    rrFill(ctx, x + m, y + m, 5 * m, 5 * m, t * 1.7 * m);

    var bx = x + 2 * m, by = y + 2 * m, cs = 3 * m, cr = t * 0.75 * m;
    ctx.fillStyle = css(P.gem);
    rrFill(ctx, bx, by, cs, cs, cr);
    if (t <= 0) return;

    ctx.save(); rrPath(ctx, bx, by, cs, cs, cr); ctx.clip(); ctx.globalAlpha = t;
    var x1 = bx + 0.75 * m, x2 = bx + 1.5 * m, x3 = bx + 2.25 * m, x4 = bx + cs;
    var y1 = by + 0.75 * m, y2 = by + 1.5 * m, y3 = by + 2.25 * m, y4 = by + cs;
    var F = P.fc;
    poly(ctx, [bx, by, x2, by, x1, y1], css(F[0]));
    poly(ctx, [x2, by, x3, y1, x1, y1], css(F[1]));
    poly(ctx, [x2, by, x4, by, x3, y1], css(F[2]));
    poly(ctx, [bx, by, x1, y1, bx, y2], css(F[3]));
    poly(ctx, [bx, y2, x1, y1, x1, y3], css(F[4]));
    poly(ctx, [bx, y2, x1, y3, bx, y4], css(F[5]));
    poly(ctx, [x4, by, x4, y2, x3, y1], css(F[6]));
    poly(ctx, [x4, y2, x3, y1, x3, y3], css(F[7]));
    poly(ctx, [x4, y2, x4, y4, x3, y3], css(F[8]));
    poly(ctx, [bx, y4, x1, y3, x2, y4], css(F[9]));
    poly(ctx, [x2, y4, x1, y3, x3, y3], css(F[10]));
    poly(ctx, [x2, y4, x3, y3, x4, y4], css(F[11]));
    var gl = ctx.createRadialGradient(bx + 1.4 * m, by + 1.35 * m, 0,
                                      bx + 1.4 * m, by + 1.35 * m, 2 * m);
    function ga(a) { return 'rgba(' + P.glo[0] + ',' + P.glo[1] + ',' + P.glo[2] + ',' + a + ')'; }
    gl.addColorStop(0, ga(0.17)); gl.addColorStop(0.55, ga(0.06)); gl.addColorStop(1, ga(0));
    ctx.fillStyle = gl; ctx.fillRect(bx, by, cs, cs);
    ctx.fillStyle = css(P.table); ctx.fillRect(x1, y1, 1.5 * m, 1.5 * m);
    poly(ctx, [bx + 0.985 * m, by + 0.51 * m, bx + 0.858 * m, by + 0.793 * m,
               bx + 0.56 * m, by + 0.94 * m, bx + 0.658 * m, by + 0.733 * m], '#ffffff');
    ctx.globalAlpha = 1; ctx.restore();
  }

  function drawIconCanvas(ctx, name, cx, cy, box) {
    var ic = ICONS[name];
    if (!ic || typeof Path2D === 'undefined') return;
    var s = box / 24;
    ctx.save();
    ctx.translate(cx - box / 2, cy - box / 2);
    ctx.scale(s, s);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var i = 0; i < ic.length; i++) {
      var sh = ic[i], p = new Path2D(sh.d);
      if (sh.f) { ctx.fillStyle = sh.f; ctx.fill(p); }
      if (sh.s) { ctx.strokeStyle = sh.s; ctx.lineWidth = sh.w || 2; ctx.stroke(p); }
    }
    ctx.restore();
  }

  function fontStr(t, px, family, weightDefault) {
    return (t.ital ? 'italic ' : '') + (t.bold ? '700 ' : (weightDefault || 400) + ' ') +
           px + 'px ' + family;
  }
  function drawLabel(ctx, text, x, y, px, family, color, t, weightDefault) {
    ctx.font = fontStr(t, px, family, weightDefault);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
    if (t.und) {
      var w = ctx.measureText(text).width;
      ctx.fillRect(x - w / 2, y + px * 0.12, w, Math.max(1, px * 0.06));
    }
  }

  function toCanvas(canvas, code, opts) {
    var n = code.size, total = n + QUIET * 2;
    var qs = opts.size || canvas.width || 512;
    var hasIcon = !!(opts.icon && ICONS[opts.icon]);
    var t = Math.min(opts.shape, hasIcon ? ICON_SHAPE_MAX : 0.88);
    var m = qs / total;
    var P = palette(opts.hue, opts.shading);
    var bg = '#ffffff';
    var T = textDefaults(opts.text);
    var L = layout(total, opts);

    canvas.width = Math.round(L.W * m);
    canvas.height = Math.round(L.H * m);
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (L.deco) {
      if (!opts.transparent) {
        ctx.fillStyle = bg;
        rrFill(ctx, 0, 0, L.W * m, L.H * m, L.r * m);
      }
      if (L.frame === 'bar') {
        ctx.fillStyle = css(P.rim);
        rrFill(ctx, (L.qx + QUIET) * m, L.barY * m, (total - QUIET * 2) * m, L.barH * m,
               Math.min(t * RIM_R_MAX, L.barH / 2) * m);
      } else if (L.frame !== 'none') {
        ctx.save();
        rrPath(ctx, 0, 0, L.W * m, L.H * m, L.r * m); ctx.clip();
        ctx.fillStyle = css(P.rim);
        ctx.fillRect(0, L.barY * m, L.W * m, L.barH * m + 1);
        ctx.restore();
        if (L.frame === 'full') {
          ctx.strokeStyle = css(P.rim);
          ctx.lineWidth = L.bw * m;
          rrPath(ctx, L.bw * m / 2, L.bw * m / 2,
                 L.W * m - L.bw * m, L.H * m - L.bw * m, Math.max(0, L.r * m - L.bw * m / 2));
          ctx.stroke();
        }
      }
    } else if (!opts.transparent) {
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.save();
    ctx.translate(L.qx * m, L.qy * m);

    var wellM = hasIcon ? wellModules(total) : 0;
    var wellPx = wellM * m;
    var wx = (qs - wellPx) / 2, wy = wx, wpad = 0.4 * m;

    ctx.fillStyle = P.codeCss;
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (!code.modules[r][c] || isFinder(c, r, n)) continue;
      var px = (c + QUIET) * m, py = (r + QUIET) * m;
      if (hasIcon &&
          px + m / 2 > wx - wpad && px + m / 2 < wx + wellPx + wpad &&
          py + m / 2 > wy - wpad && py + m / 2 < wy + wellPx + wpad) continue;
      rrFill(ctx, px, py, m, m, t * m * 0.5);
    }
    drawEye(ctx, 0, 0, m, t, P, bg);
    drawEye(ctx, n - 7, 0, m, t, P, bg);
    drawEye(ctx, 0, n - 7, m, t, P, bg);

    if (hasIcon) {
      ctx.fillStyle = bg;
      rrFill(ctx, wx, wy, wellPx, wellPx, 1.4 * m);
      drawIconCanvas(ctx, opts.icon, qs / 2, qs / 2, wellPx * 0.92);
    }
    ctx.restore();

    if (L.deco) {
      if (opts.title) {
        drawLabel(ctx, opts.title, L.cx * m, L.titleY * m, L.titleFs * m,
                  T.family || SANS, T.color, T, 500);
      }
      if (opts.caption) {
        drawLabel(ctx, opts.caption, L.cx * m, L.capY * m, L.capFs * m,
                  T.family || MONO, capColor(T), T, 400);
      }
      if (L.frame !== 'none' && opts.cta) {
        ctx.font = '700 ' + (L.ctaFs * m) + 'px ' + SANS;
        try { ctx.letterSpacing = (L.ctaFs * m * 0.08).toFixed(2) + 'px'; } catch (e) {}
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(String(opts.cta).toUpperCase(), L.cx * m, L.ctaY * m);
        try { ctx.letterSpacing = '0px'; } catch (e) {}
      }
    }
    return canvas;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function svgEye(ox, oy, t, P, bg, id) {
    var x = ox + QUIET, y = oy + QUIET;
    var rr = t * RIM_R_MAX, gr = t * 1.7, cr = t * 0.75;
    var bx = x + 2, by = y + 2;
    function R(x, y, w, h, r, f) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
             '" rx="' + r.toFixed(3) + '" fill="' + f + '"/>';
    }
    function P4(p, f) {
      return '<polygon points="' + p.map(function (v) { return v.toFixed(3); }).join(' ') +
             '" fill="' + f + '"/>';
    }
    var g = '<defs><clipPath id="gem' + id + '">' +
      '<rect x="' + bx + '" y="' + by + '" width="3" height="3" rx="' + cr.toFixed(3) + '"/>' +
      '</clipPath>' +
      '<radialGradient id="glo' + id + '" gradientUnits="userSpaceOnUse" cx="' +
      (bx + 1.4) + '" cy="' + (by + 1.35) + '" r="2">' +
      '<stop offset="0" stop-color="' + hex(P.glo) + '" stop-opacity="0.17"/>' +
      '<stop offset="0.55" stop-color="' + hex(P.glo) + '" stop-opacity="0.06"/>' +
      '<stop offset="1" stop-color="' + hex(P.glo) + '" stop-opacity="0"/>' +
      '</radialGradient></defs>';
    g += R(x, y, 7, 7, rr, hex(P.rim));
    g += R(x + 1, y + 1, 5, 5, gr, bg);
    g += '<g clip-path="url(#gem' + id + ')">';
    g += R(bx, by, 3, 3, cr, hex(P.gem));
    if (t > 0) {
      var x1 = bx + 0.75, x2 = bx + 1.5, x3 = bx + 2.25, x4 = bx + 3;
      var y1 = by + 0.75, y2 = by + 1.5, y3 = by + 2.25, y4 = by + 3;
      var F = P.fc;
      g += P4([bx, by, x2, by, x1, y1], hex(F[0]));
      g += P4([x2, by, x3, y1, x1, y1], hex(F[1]));
      g += P4([x2, by, x4, by, x3, y1], hex(F[2]));
      g += P4([bx, by, x1, y1, bx, y2], hex(F[3]));
      g += P4([bx, y2, x1, y1, x1, y3], hex(F[4]));
      g += P4([bx, y2, x1, y3, bx, y4], hex(F[5]));
      g += P4([x4, by, x4, y2, x3, y1], hex(F[6]));
      g += P4([x4, y2, x3, y1, x3, y3], hex(F[7]));
      g += P4([x4, y2, x4, y4, x3, y3], hex(F[8]));
      g += P4([bx, y4, x1, y3, x2, y4], hex(F[9]));
      g += P4([x2, y4, x1, y3, x3, y3], hex(F[10]));
      g += P4([x2, y4, x3, y3, x4, y4], hex(F[11]));
      g += '<rect x="' + bx + '" y="' + by + '" width="3" height="3" fill="url(#glo' + id + ')"/>';
      g += '<rect x="' + x1 + '" y="' + y1 + '" width="1.5" height="1.5" fill="' +
           hex(P.table) + '"/>';
      g += P4([bx + 0.985, by + 0.51, bx + 0.858, by + 0.793,
               bx + 0.56, by + 0.94, bx + 0.658, by + 0.733], '#ffffff');
    }
    g += '</g>';
    return g;
  }

  function svgText(text, x, y, fs, family, color, t, weightDefault, extra) {
    return '<text x="' + x.toFixed(3) + '" y="' + y.toFixed(3) +
      '" text-anchor="middle" font-family="' + esc(family) +
      '" font-size="' + fs.toFixed(3) +
      '" font-weight="' + (t.bold ? 700 : (weightDefault || 400)) +
      (t.ital ? '" font-style="italic' : '') +
      (t.und ? '" text-decoration="underline' : '') +
      '" fill="' + color + '"' + (extra || '') + '>' + esc(text) + '</text>';
  }

  function toSVG(code, opts) {
    var n = code.size, total = n + QUIET * 2;
    var hasIcon = !!(opts.icon && ICONS[opts.icon]);
    var t = Math.min(opts.shape, hasIcon ? ICON_SHAPE_MAX : 0.88);
    var P = palette(opts.hue, opts.shading);
    var bg = '#ffffff';
    var T = textDefaults(opts.text);
    var L = layout(total, opts);
    var m = (opts.size || 512) / total;

    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
            L.W.toFixed(3) + ' ' + L.H.toFixed(3) +
            '" width="' + Math.round(L.W * m) + '" height="' + Math.round(L.H * m) + '">';

    if (L.deco) {
      if (!opts.transparent) {
        s += '<rect width="' + L.W.toFixed(3) + '" height="' + L.H.toFixed(3) +
             '" rx="' + L.r.toFixed(3) + '" fill="' + bg + '"/>';
      }
      if (L.frame === 'bar') {
        s += '<rect x="' + (L.qx + QUIET).toFixed(3) + '" y="' + L.barY.toFixed(3) +
             '" width="' + (total - QUIET * 2) + '" height="' + L.barH.toFixed(3) +
             '" rx="' + Math.min(t * RIM_R_MAX, L.barH / 2).toFixed(3) +
             '" fill="' + hex(P.rim) + '"/>';
      } else if (L.frame !== 'none') {
        s += '<defs><clipPath id="card"><rect width="' + L.W.toFixed(3) +
             '" height="' + L.H.toFixed(3) + '" rx="' + L.r.toFixed(3) + '"/></clipPath></defs>';
        s += '<g clip-path="url(#card)"><rect x="0" y="' + L.barY.toFixed(3) +
             '" width="' + L.W.toFixed(3) + '" height="' + (L.barH + 0.2).toFixed(3) +
             '" fill="' + hex(P.rim) + '"/></g>';
        if (L.frame === 'full') {
          s += '<rect x="' + (L.bw / 2).toFixed(3) + '" y="' + (L.bw / 2).toFixed(3) +
               '" width="' + (L.W - L.bw).toFixed(3) + '" height="' + (L.H - L.bw).toFixed(3) +
               '" rx="' + Math.max(0, L.r - L.bw / 2).toFixed(3) +
               '" fill="none" stroke="' + hex(P.rim) + '" stroke-width="' + L.bw.toFixed(3) + '"/>';
        }
      }
    } else if (!opts.transparent) {
      s += '<rect width="' + total + '" height="' + total + '" fill="' + bg + '"/>';
    }

    s += '<g transform="translate(' + L.qx.toFixed(3) + ' ' + L.qy.toFixed(3) +
         ')" shape-rendering="crispEdges">';

    var wellM = hasIcon ? wellModules(total) : 0;
    var w0 = (total - wellM) / 2, w1 = w0 + wellM, wpad = 0.4;

    var rad = (t * 0.5).toFixed(3), col = P.codeHex;
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (!code.modules[r][c] || isFinder(c, r, n)) continue;
      var ux = c + QUIET, uy = r + QUIET;
      if (hasIcon &&
          ux + 0.5 > w0 - wpad && ux + 0.5 < w1 + wpad &&
          uy + 0.5 > w0 - wpad && uy + 0.5 < w1 + wpad) continue;
      s += '<rect x="' + ux + '" y="' + uy +
           '" width="1" height="1" rx="' + rad + '" fill="' + col + '"/>';
    }
    s += svgEye(0, 0, t, P, bg, 'a');
    s += svgEye(n - 7, 0, t, P, bg, 'b');
    s += svgEye(0, n - 7, t, P, bg, 'c');

    if (hasIcon) {
      s += '<rect x="' + w0 + '" y="' + w0 + '" width="' + wellM + '" height="' + wellM +
           '" rx="1.4" fill="' + bg + '"/>';
      var box = wellM * 0.92, sc = box / 24, off = total / 2 - box / 2;
      s += '<g shape-rendering="auto" transform="translate(' + off.toFixed(3) + ' ' +
           off.toFixed(3) + ') scale(' + sc.toFixed(4) + ')">';
      var ic = ICONS[opts.icon];
      for (var i = 0; i < ic.length; i++) s += shapeSVG(ic[i]);
      s += '</g>';
    }
    s += '</g>';

    if (L.deco) {
      if (opts.title) {
        s += svgText(opts.title, L.cx, L.titleY, L.titleFs, T.family || SANS, T.color, T, 500);
      }
      if (opts.caption) {
        s += svgText(opts.caption, L.cx, L.capY, L.capFs, T.family || MONO, capColor(T), T, 400);
      }
      if (L.frame !== 'none' && opts.cta) {
        s += svgText(String(opts.cta).toUpperCase(), L.cx, L.ctaY, L.ctaFs, SANS, '#ffffff',
                     { bold: true }, 700, ' letter-spacing="' + (L.ctaFs * 0.08).toFixed(3) + '"');
      }
    }
    return s + '</svg>';
  }

  var API = { toCanvas: toCanvas, toSVG: toSVG, palette: palette, layout: layout,
              safeL: safeL, contrast: contrast, iconSVG: iconSVG, ICONS: ICONS,
              wellModules: wellModules, RIM_R_MAX: RIM_R_MAX, QUIET: QUIET,
              ICON_SHAPE_MAX: ICON_SHAPE_MAX };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  else { root.GeodeRender = API; }
})(typeof self !== 'undefined' ? self : this);

