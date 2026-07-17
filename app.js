(function () {
  'use strict';
  var QR = window.GeodeQR, R = window.GeodeRender, X = window.GeodeExport,
      C = window.GeodeContent, I = window.GeodeI18n, Z = window.GeodeZip,
      DEC = window.GeodeDecode;

  function $(id) { return document.getElementById(id); }

  function declared(name, table, fallback) {
    var v = document.body.getAttribute('data-' + name);
    return (v && Object.prototype.hasOwnProperty.call(table, v)) ? v : fallback;
  }
  var langTable = {};
  I.langs.forEach(function (l) { langTable[l] = 1; });

  var declaredType = declared('type', C.TYPES, null);
  var lang = declared('lang', langTable, I.detect());
  var type = declaredType || 'wifi';
  var values = {}, lastCode = null;
  var textStyle = { bold: false, ital: false, und: false };

  function tr(k) { return I.t(lang, k); }
  function clip(s, max) {
    s = String(s == null ? '' : s);
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = I.isRTL(lang) ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i]').forEach(function (el) {
      var v = I.t(lang, el.getAttribute('data-i'));
      if (typeof v === 'string' && v) el.textContent = v;
    });
    $('cta').value = tr('cta.' + type);
    buildPills();
    buildMaps();
    buildShare();
    buildShareMenu();
  }

  function region() {
    var tz = '';
    try { tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || ''; } catch (e) {}
    if (/Shanghai|Urumqi|Chongqing|Harbin/.test(tz) || lang === 'zh') return 'cn';
    if (/Hong_Kong|Macau/.test(tz)) return 'hk';
    if (/Taipei/.test(tz)) return 'tw';
    if (/Tokyo/.test(tz)) return 'jp';
    if (/Bangkok/.test(tz)) return 'th';
    if (/Kolkata|Calcutta/.test(tz)) return 'in';
    if (/Sao_Paulo|Bahia|Fortaleza|Recife|Manaus|Belem|Cuiaba|Maceio|Campo_Grande|Boa_Vista|Porto_Velho|Rio_Branco|Santarem|Araguaina|Noronha/.test(tz)) return 'br';
    if (/^Europe\//.test(tz)) return 'eu';
    return '';
  }
  var REGION_RANK = {
    cn: { up: ['alipay', 'wechatpay'], down: ['whatsapp', 'line', 'pay', 'zoom'] },
    hk: { up: ['alipay', 'wechatpay', 'whatsapp'], down: [] },
    tw: { up: ['line'], down: [] },
    jp: { up: ['line'], down: [] },
    th: { up: ['promptpay', 'line'], down: [] },
    'in': { up: ['upi', 'whatsapp'], down: [] },
    br: { up: ['pix', 'whatsapp'], down: [] },
    eu: { up: ['sepa', 'whatsapp'], down: [] }
  };
  var CORE = ['url', 'text', 'wifi'];

  function hoist(list) {
    if (!declaredType) return list;
    var out = [declaredType];
    list.forEach(function (k) { if (k !== declaredType) out.push(k); });
    return out;
  }

  function typeOrder() {
    var all = Object.keys(C.TYPES);
    var r = REGION_RANK[region()];
    if (!r) return hoist(all);
    var seen = {};
    var out = [];
    CORE.concat(r.up).forEach(function (k) {
      if (all.indexOf(k) !== -1 && !seen[k]) { seen[k] = 1; out.push(k); }
    });
    all.forEach(function (k) {
      if (!seen[k] && r.down.indexOf(k) === -1) { seen[k] = 1; out.push(k); }
    });
    r.down.forEach(function (k) {
      if (all.indexOf(k) !== -1 && !seen[k]) { seen[k] = 1; out.push(k); }
    });
    return hoist(out);
  }

  function buildPills() {
    var p = $('pills');
    p.innerHTML = '';
    typeOrder().forEach(function (k) {
      var b = document.createElement('button');
      b.className = 'pill';
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', k === type ? 'true' : 'false');
      b.innerHTML = R.iconSVG(C.TYPES[k].icon, 14);
      b.appendChild(document.createTextNode(I.t(lang, 'types.' + k)));
      b.addEventListener('click', function () {
        type = k; values = demoFor(k);
        $('cta').value = tr('cta.' + k);
        buildPills(); buildFields();
      });
      p.appendChild(b);
    });
  }

  function buildFields() {
    var box = $('fields');
    box.innerHTML = '';
    var groups = {};
    C.TYPES[type].fields.forEach(function (f) {
      var lab = document.createElement('label');
      if (f.type === 'checkbox') lab.className = 'cb';
      var span = document.createElement('span');
      span.textContent = I.t(lang, 'f.' + f.k);
      var input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
      } else if (f.type === 'select') {
        input = document.createElement('select');
        f.opts.forEach(function (o) {
          var op = document.createElement('option');
          op.value = o; op.textContent = o;
          input.appendChild(op);
        });
      } else {
        input = document.createElement('input');
        input.type = f.type;
      }
      if (f.ph) input.placeholder = f.ph;
      if (values[f.k] !== undefined) {
        if (f.type === 'checkbox') input.checked = !!values[f.k];
        else input.value = values[f.k];
      }
      function grab() {
        values[f.k] = (f.type === 'checkbox') ? input.checked : input.value;
        render();
      }
      input.addEventListener('input', grab);
      input.addEventListener('change', grab);
      if (f.type === 'checkbox') { lab.appendChild(input); lab.appendChild(span); }
      else { lab.appendChild(span); lab.appendChild(input); }
      if (f.adv) {
        if (!groups[f.adv]) {
          var det = document.createElement('details');
          var sum = document.createElement('summary');
          sum.textContent = I.t(lang, f.adv);
          det.appendChild(sum);
          det.className = 'fgroup';
          box.appendChild(det);
          groups[f.adv] = det;
        }
        groups[f.adv].appendChild(lab);
      } else {
        box.appendChild(lab);
      }
    });
    render();
  }

  function syncShapeCap() {
    var s = $('shape');
    var max = $('cicon').checked ? 70 : 88;
    if (+s.max !== max) {
      if (+s.value > max) s.value = max;
      s.max = max;
    }
  }

  function eccLevel() {
    var styled = +$('shape').value > 0 || $('cicon').checked;
    var s = $('ecc');
    s.disabled = styled;
    $('eccNote').hidden = !styled;
    if (styled) { s.value = 'H'; return 'H'; }
    return s.value;
  }

  function labels() {
    if (!$('ctext').checked) return {};
    var fn = C.TYPES[type].label;
    var lb = fn ? fn(values, tr) : {};
    var sc = +$('fsize').value / 100 || 1;
    return { title: clip(lb.title, Math.max(8, Math.round(28 / sc))),
             caption: clip(lb.caption, Math.max(12, Math.round(40 / sc))) };
  }

  function opts() {
    return {
      shape: +$('shape').value / 100,
      hue: +$('hue').value,
      shading: +$('shading').value / 100,
      transparent: $('trans').checked,
      size: +$('size').value,
      icon: $('cicon').checked ? C.TYPES[type].icon : null,
      frame: $('frame').value,
      cta: clip($('cta').value, 32),
      text: {
        family: $('font').value,
        color: $('tcol').value,
        scale: +$('fsize').value / 100 || 1,
        bold: textStyle.bold, ital: textStyle.ital, und: textStyle.und
      }
    };
  }

  function renderOpts(o, size, lb) {
    return {
      shape: o.shape, hue: o.hue, shading: o.shading,
      transparent: o.transparent, size: size,
      icon: o.icon, frame: o.frame, cta: o.cta, text: o.text,
      title: lb ? lb.title : '', caption: lb ? lb.caption : ''
    };
  }

  function render() {
    syncShapeCap();
    var payload = C.TYPES[type].build(values);
    var o = opts();
    var P = R.palette(o.hue, o.shading);

    $('cta').hidden = o.frame === 'none';

    $('chip').style.background = P.codeHex;
    $('ratio').textContent = P.contrast.toFixed(1) + ':1';

    var atLimit = +$('shape').value >= +$('shape').max;
    var badge = $('badge');
    badge.classList.toggle('limit', atLimit);
    badge.querySelector('span').textContent = I.t(lang, atLimit ? 'atLimit' : 'scannable');

    var cv = $('qc');
    var ctx = cv.getContext('2d');

    function clear(msg) {
      cv.width = cv.height = 440;
      ctx.clearRect(0, 0, 440, 440);
      lastCode = null;
      badge.hidden = true;
      $('err').textContent = msg || '';
      $('png').disabled = true;
      $('svg').disabled = true;
    }

    if (!payload) { clear(''); return; }

    try {
      lastCode = QR.encode(payload, { ecc: eccLevel() });
    } catch (e) {
      clear(I.t(lang, 'tooLong'));
      return;
    }

    badge.hidden = false;
    $('err').textContent = '';
    $('png').disabled = false;
    $('svg').disabled = false;
    R.toCanvas(cv, lastCode, renderOpts(o, 440, labels()));
  }

  ['shape', 'hue', 'shading', 'ecc', 'trans', 'size',
   'cicon', 'ctext', 'frame', 'cta', 'font', 'tcol', 'fsize'].forEach(function (id) {
    $(id).addEventListener('input', render);
    $(id).addEventListener('change', render);
  });

  Array.prototype.forEach.call(document.querySelectorAll('.biu button'), function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-k');
      textStyle[k] = !textStyle[k];
      b.classList.toggle('on', textStyle[k]);
      render();
    });
  });

  function save(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    $('strip').hidden = false;
  }

  $('png').addEventListener('click', function () {
    if (!lastCode) return;
    var o = opts();
    var cv = document.createElement('canvas');
    R.toCanvas(cv, lastCode, renderOpts(o, o.size, labels()));
    cv.toBlob(function (b) { if (b) save(b, 'geodeqr-' + type + '.png'); });
  });

  $('svg').addEventListener('click', function () {
    if (!lastCode) return;
    var o = opts();
    var s = R.toSVG(lastCode, renderOpts(o, o.size, labels()));
    save(new Blob([s], { type: 'image/svg+xml' }), 'geodeqr-' + type + '.svg');
  });

  $('pdf').addEventListener('click', function () {
    if (!lastCode) return;
    var o = opts();
    var u8 = X.toPDF(lastCode, renderOpts(o, o.size, labels()), R);
    save(new Blob([u8], { type: 'application/pdf' }), 'geodeqr-' + type + '.pdf');
  });

  $('eps').addEventListener('click', function () {
    if (!lastCode) return;
    var o = opts();
    var s = X.toEPS(lastCode, renderOpts(o, o.size, labels()), R);
    save(new Blob([s], { type: 'application/postscript' }), 'geodeqr-' + type + '.eps');
  });

  $('jpg').addEventListener('click', function () {
    if (!lastCode) return;
    var o = opts();
    o.transparent = false;
    var cv = document.createElement('canvas');
    R.toCanvas(cv, lastCode, renderOpts(o, o.size, labels()));
    var flat = document.createElement('canvas');
    flat.width = cv.width; flat.height = cv.height;
    var fx = flat.getContext('2d');
    fx.fillStyle = '#ffffff';
    fx.fillRect(0, 0, flat.width, flat.height);
    fx.drawImage(cv, 0, 0);
    flat.toBlob(function (b) { if (b) save(b, 'geodeqr-' + type + '.jpg'); }, 'image/jpeg', 0.92);
  });

  (function () {
    var btn = $('vscan');
    if (!btn || !DEC) return;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      if (!lastCode) return;
      var msg = $('vmsg');
      msg.hidden = false;
      msg.className = 'vmsg';
      msg.textContent = I.t(lang, 'verifying');
      setTimeout(function () {
        var payload = C.TYPES[type].build(values);
        var res = null;
        try {
          var cv = $('qc');
          var flat = document.createElement('canvas');
          flat.width = cv.width; flat.height = cv.height;
          var fx = flat.getContext('2d');
          fx.fillStyle = '#ffffff';
          fx.fillRect(0, 0, flat.width, flat.height);
          fx.drawImage(cv, 0, 0);
          res = DEC.decodeImageData(fx.getImageData(0, 0, flat.width, flat.height));
        } catch (e) {}
        var hit = !!(res && res.text === payload);
        msg.className = 'vmsg ' + (hit ? 'ok' : 'bad');
        msg.textContent = I.t(lang, hit ? 'verifyOk' : 'verifyFail');
      }, 30);
    });
  })();

  $('adv').addEventListener('click', function () {
    var p = $('advp');
    p.hidden = !p.hidden;
  });

  function blobOf(canvas) {
    return new Promise(function (res, rej) {
      canvas.toBlob(function (b) { b ? res(b) : rej(new Error('toBlob null')); });
    });
  }

  $('bulkGo').addEventListener('click', function () {
    var f = $('csv').files && $('csv').files[0];
    var hint = $('bulkHint');
    if (!f) { hint.textContent = I.t(lang, 'bulkPick'); return; }

    var rd = new FileReader();
    rd.onload = function () {
      var rows = Z.parseCSV(rd.result);
      if (!rows.length) { hint.textContent = I.t(lang, 'bulkEmpty'); return; }
      var h = (rows[0][0] || '').trim();
      if (rows.length > 1 && /^(content|url|link|text|data|address|value)\b/i.test(h)) rows.shift();

      var o = opts(), ecc = eccLevel();
      var cv = document.createElement('canvas');
      var files = [], used = Object.create(null), skipped = 0, i = 0;

      function step() {
        if (i >= rows.length) {
          if (!files.length) { hint.textContent = I.t(lang, 'bulkEmpty'); return; }
          save(Z.zip(files), 'geodeqr-bulk.zip');
          hint.textContent = files.length + ' — ' + I.t(lang, 'bulkDone') +
            (skipped ? ' (' + skipped + ' skipped)' : '');
          return;
        }
        var row = rows[i], payload = (row[0] || '').trim(), idx = i++;
        if (!payload) { skipped++; step(); return; }

        var code;
        try { code = QR.encode(payload, { ecc: ecc }); }
        catch (e) { skipped++; step(); return; }

        R.toCanvas(cv, code, renderOpts(o, o.size, null));
        blobOf(cv).then(function (b) { return b.arrayBuffer(); }).then(function (buf) {
          var base = Z.safeName(row[1] || payload, idx), name = base;
          if (used[name]) name = base + '-' + (idx + 1);
          used[name] = 1;
          files.push({ name: name + '.png', data: new Uint8Array(buf) });
          if (idx % 10 === 0) hint.textContent = (idx + 1) + ' / ' + rows.length;
          setTimeout(step, 0);
        }).catch(function () { skipped++; setTimeout(step, 0); });
      }

      hint.textContent = rows.length + ' …';
      step();
    };
    rd.readAsText(f);
  });

  function demoWhen(addDays, hour) {
    function p(n) { return (n < 10 ? '0' : '') + n; }
    var d = new Date();
    d.setDate(d.getDate() + addDays);
    d.setHours(hour, 0, 0, 0);
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
           'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  var DEMO = {
    url:   { url: 'https://geodeforge.com' },
    text:  { text: 'Hello from GeodeQR' },
    wifi:  { ssid: 'MyNetwork', password: 'guest-wifi', security: 'WPA' },
    vcard: { first: 'Ada', last: 'Lovelace', org: 'GeodeForge', title: 'Engineer',
             phone: '+1 555 0100', email: 'ada@example.com', website: 'https://example.com' },
    email: { to: 'name@example.com', subject: 'Hello', body: '' },
    sms:   { phone: '+1 555 0100', message: 'Hello' },
    phone: { phone: '+1 555 0100' },
    geo:   { lat: '51.5074', lon: '-0.1278' },
    event: { title: 'Launch party', location: 'Somewhere good',
             start: demoWhen(7, 19), end: demoWhen(7, 21) },
    whatsapp: { phone: '+1 555 0100', message: 'Hello' },
    pay:   { user: 'geodeforge', amount: '5' },
    coin:  { coin: 'bitcoin', addr: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', amount: '' },
    mecard: { first: 'Ada', last: 'Lovelace', phone: '+1 555 0100', email: 'ada@example.com' },
    zoom:  { meetingId: '123 4567 8901', passcode: '' },
    alipay: { payLink: 'https://qr.alipay.com/fkx0example' },
    wechatpay: { payLink: 'wxp://f2f0example' },
    line:  { lineId: 'geodeforge' },
    upi:   { vpa: 'name@bank', name: 'Ada Lovelace', amount: '' },
    promptpay: { phone: '+66 81 234 5678', amount: '' },
    sepa:  { name: 'Ada Lovelace', iban: 'DE89 3704 0044 0532 0130 00', amount: '' },
    pix:   { pixkey: 'ada@example.com', name: 'Ada Lovelace', city: 'Sao Paulo', amount: '' }
  };
  function demoFor(k) {
    var d = DEMO[k] || {}, o = {};
    Object.keys(d).forEach(function (x) { o[x] = d[x]; });
    return o;
  }

  var SITE = 'https://geodeforge.com/geodeqr';
  var NETS = [
    { id: 'x',        name: 'X',         zh: false, u: function (l, t) { return 'https://twitter.com/intent/tweet?url=' + l + '&text=' + t; } },
    { id: 'facebook', name: 'Facebook',  zh: false, u: function (l)    { return 'https://www.facebook.com/sharer/sharer.php?u=' + l; } },
    { id: 'linkedin', name: 'LinkedIn',  zh: false, u: function (l)    { return 'https://www.linkedin.com/sharing/share-offsite/?url=' + l; } },
    { id: 'reddit',   name: 'Reddit',    zh: false, u: function (l, t) { return 'https://www.reddit.com/submit?url=' + l + '&title=' + t; } },
    { id: 'whatsapp', name: 'WhatsApp',  zh: false, u: function (l, t) { return 'https://api.whatsapp.com/send?text=' + t + '%20' + l; } },
    { id: 'telegram', name: 'Telegram',  zh: false, u: function (l, t) { return 'https://t.me/share/url?url=' + l + '&text=' + t; } },
    { id: 'weibo',    name: '微博', zh: true, u: function (l, t) { return 'https://service.weibo.com/share/share.php?url=' + l + '&title=' + t; } },
    { id: 'email',    name: 'Email',     zh: true, u: function (l, t) { return 'mailto:?subject=GeodeQR&body=' + t + '%20' + l; } },
    { id: 'line',     name: 'LINE',      zh: false, full: true, u: function (l, t) { return 'https://social-plugins.line.me/lineit/share?url=' + l; } },
    { id: 'threads',  name: 'Threads',   zh: false, full: true, u: function (l, t) { return 'https://www.threads.net/intent/post?text=' + t + '%20' + l; } },
    { id: 'bluesky',  name: 'Bluesky',   zh: false, full: true, u: function (l, t) { return 'https://bsky.app/intent/compose?text=' + t + '%20' + l; } },
    { id: 'pinterest', name: 'Pinterest', zh: false, full: true, u: function (l, t) { return 'https://pinterest.com/pin/create/button/?url=' + l + '&description=' + t; } },
    { id: 'tumblr',   name: 'Tumblr',    zh: false, full: true, u: function (l, t) { return 'https://www.tumblr.com/widgets/share/tool?canonicalUrl=' + l + '&caption=' + t; } },
    { id: 'vk',       name: 'VK',        zh: false, full: true, u: function (l, t) { return 'https://vk.com/share.php?url=' + l + '&title=' + t; } },
    { id: 'hn',       name: 'Hacker News', zh: false, full: true, u: function (l, t) { return 'https://news.ycombinator.com/submitlink?u=' + l + '&t=' + t; } },
    { id: 'qzone',    name: 'QQ空间',    zh: true, full: true, u: function (l, t) { return 'https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=' + l + '&title=' + t; } },
    { id: 'douban',   name: '豆瓣',      zh: true, full: true, u: function (l, t) { return 'https://www.douban.com/share/service?href=' + l + '&name=' + t; } }
  ];

  function netList(all) {
    return NETS.filter(function (n) { return all || !n.full; })
      .sort(function (a, b) {
        return (lang === 'zh') ? (b.zh - a.zh) : (a.zh - b.zh);
      });
  }

  function copySite(done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SITE).then(done, function () {});
    } else {
      var ta = document.createElement('textarea');
      ta.value = SITE; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      ta.remove();
    }
  }

  function copyButton() {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = I.t(lang, 'copy');
    b.addEventListener('click', function () {
      copySite(function () {
        b.textContent = I.t(lang, 'copied');
        setTimeout(function () { b.textContent = I.t(lang, 'copy'); }, 1600);
      });
    });
    return b;
  }

  function buildShare() {
    var box = $('shares');
    if (!box) return;
    box.innerHTML = '';
    var l = encodeURIComponent(SITE), t = encodeURIComponent(I.t(lang, 'shareText'));
    netList(true).forEach(function (nw) {
      var a = document.createElement('a');
      a.href = nw.u(l, t);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = nw.name;
      box.appendChild(a);
    });
    box.appendChild(copyButton());
  }

  function canCopyImage() {
    return !!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem);
  }

  function copyImageButton() {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = I.t(lang, 'copyImg');
    b.addEventListener('click', function () {
      if (!lastCode) return;
      var o = opts();
      var cv = document.createElement('canvas');
      R.toCanvas(cv, lastCode, renderOpts(o, o.size, labels()));
      cv.toBlob(function (blob) {
        if (!blob) return;
        navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
          .then(function () {
            b.textContent = I.t(lang, 'copied');
            setTimeout(function () { b.textContent = I.t(lang, 'copyImg'); }, 1600);
          }, function () {});
      });
    });
    return b;
  }

  function buildShareMenu() {
    var menu = $('sharemenu');
    if (!menu) return;
    menu.innerHTML = '';
    if (canCopyImage()) menu.appendChild(copyImageButton());
    var l = encodeURIComponent(SITE), t = encodeURIComponent(I.t(lang, 'shareText'));
    netList().forEach(function (nw) {
      var a = document.createElement('a');
      a.href = nw.u(l, t);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = nw.name;
      a.addEventListener('click', closeShareMenu);
      menu.appendChild(a);
    });
    menu.appendChild(copyButton());
  }

  function closeShareMenu() {
    var m = $('sharemenu');
    if (m && !m.hidden) {
      m.hidden = true;
      $('shareBtn').setAttribute('aria-expanded', 'false');
    }
  }

  $('shareBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    var m = $('sharemenu');
    m.hidden = !m.hidden;
    $('shareBtn').setAttribute('aria-expanded', m.hidden ? 'false' : 'true');
  });
  document.addEventListener('click', function (e) {
    var m = $('sharemenu');
    if (m && !m.hidden && !m.contains(e.target)) closeShareMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeShareMenu();
  });

  (function () {
    var sec = $('reader');
    if (!sec || !DEC) return;
    sec.hidden = false;
    var lastRead = '';

    function showNone() {
      $('rout').hidden = false;
      $('rtext').hidden = true;
      $('rhost').hidden = true;
      $('rcopy').hidden = true;
      $('rnone').hidden = false;
    }
    function showTexts(txts) {
      $('rout').hidden = false;
      $('rnone').hidden = true;
      $('rtext').hidden = false;
      $('rtext').textContent = txts.join('\n\n— — —\n\n');
      lastRead = txts.join('\n');
      var host = '';
      if (txts.length === 1 && /^https?:\/\//i.test(txts[0])) {
        try { host = new URL(txts[0]).hostname; } catch (e) {}
      }
      $('rhost').hidden = !host;
      $('rhostv').textContent = host;
      $('rcopy').hidden = false;
    }
    function decodeFile(f) {
      if (!f || !/^image\//.test(f.type)) return;
      var url = URL.createObjectURL(f);
      var im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(url);
        var tries = [1400, 700], res = null;
        for (var i = 0; i < tries.length && !res; i++) {
          var sc = Math.min(1, tries[i] / Math.max(im.naturalWidth, im.naturalHeight));
          var w = Math.max(1, Math.round(im.naturalWidth * sc));
          var h = Math.max(1, Math.round(im.naturalHeight * sc));
          var cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          var cx = cv.getContext('2d');
          cx.fillStyle = '#ffffff';
          cx.fillRect(0, 0, w, h);
          cx.drawImage(im, 0, 0, w, h);
          try { res = DEC.decodeImageData(cx.getImageData(0, 0, w, h)); } catch (e) {}
          if (sc === 1) break;
        }
        if (res && res.text) showTexts([res.text]); else showNone();
      };
      im.onerror = function () { URL.revokeObjectURL(url); showNone(); };
      im.src = url;
    }

    $('rfile').addEventListener('change', function () {
      decodeFile($('rfile').files && $('rfile').files[0]);
    });
    var dz = $('drop');
    ['dragover', 'dragenter'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('on'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('on'); });
    });
    dz.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      decodeFile(f);
    });
    $('rcopy').addEventListener('click', function () {
      var b = $('rcopy');
      function done() {
        b.textContent = I.t(lang, 'copied');
        setTimeout(function () { b.textContent = I.t(lang, 'readCopy'); }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastRead).then(done, function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = lastRead; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        ta.remove();
      }
    });
  })();

  var MAPS = [
    { id: 'google', name: 'Google Maps',    url: 'https://www.google.com/maps/search/' },
    { id: 'baidu',  name: '百度地图', url: 'https://map.baidu.com/search/' },
    { id: 'amap',   name: '高德地图', url: 'https://www.amap.com/search?query=' },
    { id: 'osm',    name: 'OpenStreetMap',  url: 'https://www.openstreetmap.org/search?query=' }
  ];
  var mapPick = null, mapChosen = false;

  function mapURL(id) {
    var m = MAPS.filter(function (x) { return x.id === id; })[0] || MAPS[0];
    return m.url + encodeURIComponent(I.t(lang, 'mapQ'));
  }

  function buildMaps() {
    if (!mapChosen) mapPick = (lang === 'zh') ? 'baidu' : 'google';
    $('printer').href = mapURL(mapPick);
    var box = $('mapAlts');
    box.innerHTML = '';
    MAPS.forEach(function (m) {
      if (m.id === mapPick) return;
      var a = document.createElement('a');
      a.href = mapURL(m.id);
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = m.name;
      a.addEventListener('click', function () { mapPick = m.id; mapChosen = true; buildMaps(); });
      box.appendChild(a);
    });
  }

  values = demoFor(type);
  applyLang();
  buildFields();
  window.__geodeBooted = true;
})();

