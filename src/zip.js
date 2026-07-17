(function (root) {
  'use strict';

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(buf) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function utf8(str) {
    var out = [], i, c;
    for (i = 0; i < str.length; i++) {
      c = str.codePointAt(i);
      if (c > 0xFFFF) i++;
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out.push(0xE0 | c >> 12, 0x80 | (c >> 6) & 63, 0x80 | c & 63);
      else out.push(0xF0 | c >> 18, 0x80 | (c >> 12) & 63, 0x80 | (c >> 6) & 63, 0x80 | c & 63);
    }
    return new Uint8Array(out);
  }
  function W(arr, v, n) { for (var i = 0; i < n; i++) arr.push((v >>> (8 * i)) & 0xFF); }

  function zip(files) {
    var out = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = utf8(f.name), data = f.data, crc = crc32(data);
      var local = [];
      W(local, 0x04034b50, 4); W(local, 20, 2); W(local, 0x0800, 2);
      W(local, 0, 2); W(local, 0, 2); W(local, 0, 2);
      W(local, crc, 4); W(local, data.length, 4); W(local, data.length, 4);
      W(local, name.length, 2); W(local, 0, 2);
      var head = new Uint8Array(local);
      out.push(head, name, data);

      var cd = [];
      W(cd, 0x02014b50, 4); W(cd, 20, 2); W(cd, 20, 2); W(cd, 0x0800, 2);
      W(cd, 0, 2); W(cd, 0, 2); W(cd, 0, 2);
      W(cd, crc, 4); W(cd, data.length, 4); W(cd, data.length, 4);
      W(cd, name.length, 2); W(cd, 0, 2); W(cd, 0, 2);
      W(cd, 0, 2); W(cd, 0, 2); W(cd, 0, 4); W(cd, offset, 4);
      central.push(new Uint8Array(cd), name);
      offset += head.length + name.length + data.length;
    });
    var cdStart = offset, cdLen = 0;
    central.forEach(function (b) { cdLen += b.length; });
    var end = [];
    W(end, 0x06054b50, 4); W(end, 0, 2); W(end, 0, 2);
    W(end, files.length, 2); W(end, files.length, 2);
    W(end, cdLen, 4); W(end, cdStart, 4); W(end, 0, 2);
    return new Blob(out.concat(central, [new Uint8Array(end)]), { type: 'application/zip' });
  }

  function parseCSV(text) {
    var rows = [], row = [], cur = '', q = false, i = 0;
    text = String(text).replace(/^﻿/, '');
    while (i < text.length) {
      var ch = text[i];
      if (q) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
          q = false; i++; continue;
        }
        cur += ch; i++; continue;
      }
      if (ch === '"') { q = true; i++; continue; }
      if (ch === ',') { row.push(cur); cur = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; continue; }
      cur += ch; i++;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim() !== ''; }); });
  }

  function safeName(s, i) {
    var n = String(s == null ? '' : s)
      .replace(/[‪-‮⁦-⁩‎‏]/g, '')
      .replace(/[\/\\]+/g, '_')
      .replace(/\.\.+/g, '_')
      .replace(/[^\wÀ-￿ .-]+/g, '_')
      .replace(/^[.\s]+|[.\s]+$/g, '')
      .trim()
      .slice(0, 60);
    return (n || ('code-' + (i + 1)));
  }

  var API = { zip: zip, parseCSV: parseCSV, safeName: safeName, crc32: crc32 };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  else { root.GeodeZip = API; }
})(typeof self !== 'undefined' ? self : this);

