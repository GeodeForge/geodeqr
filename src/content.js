(function (root) {
  'use strict';

  function wifiEsc(s) {
    return String(s == null ? '' : s).replace(/([\\;,:"])/g, '\\$1');
  }
  function vcEsc(s) {
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\\\').replace(/;/g, '\\;')
      .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function trim(s) { return String(s == null ? '' : s).trim(); }

  function tlv(id, v) {
    return id + ('0' + v.length).slice(-2) + v;
  }
  function crc16(s) {
    var c = 0xFFFF;
    for (var i = 0; i < s.length; i++) {
      c ^= s.charCodeAt(i) << 8;
      for (var b = 0; b < 8; b++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF;
    }
    return ('000' + c.toString(16).toUpperCase()).slice(-4);
  }

  var TYPES = {
    url: {
      icon: 'link',
      fields: [
        { k: 'url', type: 'url', ph: 'https://example.com' },
        { k: 'source', type: 'text', ph: 'newsletter', adv: 'utm' },
        { k: 'medium', type: 'text', ph: 'print', adv: 'utm' },
        { k: 'campaign', type: 'text', ph: 'spring-menu', adv: 'utm' }
      ],
      build: function (v) {
        var u = trim(v.url);
        if (!u) return '';
        if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
        var q = [];
        if (trim(v.source)) q.push('utm_source=' + encodeURIComponent(trim(v.source)));
        if (trim(v.medium)) q.push('utm_medium=' + encodeURIComponent(trim(v.medium)));
        if (trim(v.campaign)) q.push('utm_campaign=' + encodeURIComponent(trim(v.campaign)));
        if (q.length) u += (u.indexOf('?') === -1 ? '?' : '&') + q.join('&');
        return u;
      },
      label: function (v) {
        var u = trim(v.url);
        if (!u) return {};
        var host = u.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^www\./i, '');
        var rest = host.replace(/^[^\/?#]*/, '');
        host = host.split(/[\/?#]/)[0];
        return { title: host, caption: (rest && rest !== '/') ? u : '' };
      }
    },
    text: {
      icon: 'text',
      fields: [{ k: 'text', type: 'textarea', ph: '' }],
      build: function (v) { return trim(v.text); },
      label: function () { return {}; }
    },
    wifi: {
      icon: 'wifi',
      fields: [
        { k: 'ssid', type: 'text', ph: 'MyNetwork' },
        { k: 'password', type: 'text', ph: '' },
        { k: 'security', type: 'select', opts: ['WPA', 'WEP', 'nopass'] },
        { k: 'hidden', type: 'checkbox' }
      ],
      build: function (v) {
        var ssid = trim(v.ssid);
        if (!ssid) return '';
        var sec = v.security || 'WPA';
        var s = 'WIFI:S:' + wifiEsc(ssid) + ';T:' + sec + ';';
        if (sec !== 'nopass') s += 'P:' + wifiEsc(v.password) + ';';
        if (v.hidden) s += 'H:true;';
        return s + ';';
      },
      label: function (v, t) {
        var ssid = trim(v.ssid);
        if (!ssid) return {};
        var sec = v.security || 'WPA', pw = trim(v.password);
        var cap = sec === 'nopass' ? t('wifiOpen') : (pw ? t('wifiPass') + ' ' + pw : '');
        return { title: ssid, caption: cap };
      }
    },
    vcard: {
      icon: 'contact',
      fields: [
        { k: 'first', type: 'text', ph: '' }, { k: 'last', type: 'text', ph: '' },
        { k: 'org', type: 'text', ph: '' }, { k: 'title', type: 'text', ph: '' },
        { k: 'phone', type: 'tel', ph: '' }, { k: 'email', type: 'email', ph: '' },
        { k: 'website', type: 'url', ph: '' }
      ],
      build: function (v) {
        if (!trim(v.first) && !trim(v.last) && !trim(v.org)) return '';
        var L = ['BEGIN:VCARD', 'VERSION:3.0'];
        L.push('N:' + vcEsc(v.last) + ';' + vcEsc(v.first) + ';;;');
        L.push('FN:' + vcEsc((trim(v.first) + ' ' + trim(v.last)).trim()));
        if (trim(v.org)) L.push('ORG:' + vcEsc(v.org));
        if (trim(v.title)) L.push('TITLE:' + vcEsc(v.title));
        if (trim(v.phone)) L.push('TEL;TYPE=CELL:' + vcEsc(v.phone));
        if (trim(v.email)) L.push('EMAIL:' + vcEsc(v.email));
        if (trim(v.website)) L.push('URL:' + vcEsc(v.website));
        L.push('END:VCARD');
        return L.join('\n');
      },
      label: function (v) {
        var name = (trim(v.first) + ' ' + trim(v.last)).trim() || trim(v.org);
        if (!name) return {};
        var parts = [];
        if (trim(v.title)) parts.push(trim(v.title));
        if (trim(v.org) && trim(v.org) !== name) parts.push(trim(v.org));
        return { title: name, caption: parts.join(' — ') };
      }
    },
    email: {
      icon: 'mail',
      fields: [
        { k: 'to', type: 'email', ph: 'name@example.com' },
        { k: 'subject', type: 'text', ph: '' },
        { k: 'body', type: 'textarea', ph: '' }
      ],
      build: function (v) {
        var to = trim(v.to);
        if (!to) return '';
        var q = [];
        if (trim(v.subject)) q.push('subject=' + encodeURIComponent(v.subject));
        if (trim(v.body)) q.push('body=' + encodeURIComponent(v.body));
        return 'mailto:' + to + (q.length ? '?' + q.join('&') : '');
      },
      label: function (v) {
        var to = trim(v.to);
        if (!to) return {};
        return { title: to, caption: trim(v.subject) };
      }
    },
    sms: {
      icon: 'sms',
      fields: [{ k: 'phone', type: 'tel', ph: '' }, { k: 'message', type: 'textarea', ph: '' }],
      build: function (v) {
        var p = trim(v.phone);
        if (!p) return '';
        return 'SMSTO:' + p + ':' + trim(v.message);
      },
      label: function (v) {
        var p = trim(v.phone);
        return p ? { title: p, caption: trim(v.message) } : {};
      }
    },
    phone: {
      icon: 'phone',
      fields: [{ k: 'phone', type: 'tel', ph: '' }],
      build: function (v) { var p = trim(v.phone); return p ? 'tel:' + p : ''; },
      label: function (v) {
        var p = trim(v.phone);
        return p ? { title: p, caption: '' } : {};
      }
    },
    geo: {
      icon: 'pin',
      fields: [{ k: 'lat', type: 'text', ph: '51.5074' }, { k: 'lon', type: 'text', ph: '-0.1278' }],
      build: function (v) {
        var la = trim(v.lat), lo = trim(v.lon);
        if (!la || !lo || isNaN(+la) || isNaN(+lo)) return '';
        return 'geo:' + (+la) + ',' + (+lo);
      },
      label: function (v) {
        var la = trim(v.lat), lo = trim(v.lon);
        if (!la || !lo || isNaN(+la) || isNaN(+lo)) return {};
        return { title: (+la) + ', ' + (+lo), caption: '' };
      }
    },
    whatsapp: {
      icon: 'chat',
      fields: [{ k: 'phone', type: 'tel', ph: '+1 555 0100' },
               { k: 'message', type: 'textarea', ph: '' }],
      build: function (v) {
        var d = trim(v.phone).replace(/[^\d]/g, '');
        if (!d) return '';
        var m = trim(v.message);
        return 'https://wa.me/' + d + (m ? '?text=' + encodeURIComponent(m) : '');
      },
      label: function (v) {
        var p = trim(v.phone);
        return p ? { title: 'WhatsApp', caption: p } : {};
      }
    },
    pay: {
      icon: 'dollar',
      fields: [{ k: 'user', type: 'text', ph: 'username' },
               { k: 'amount', type: 'text', ph: '5' }],
      build: function (v) {
        var u = trim(v.user).replace(/^@/, '').replace(/^https?:\/\/(www\.)?paypal\.me\//i, '');
        if (!/^[A-Za-z0-9]+$/.test(u)) return '';
        var a = trim(v.amount);
        return 'https://paypal.me/' + u + (a && !isNaN(+a) && +a > 0 ? '/' + (+a) : '');
      },
      label: function (v) {
        var u = trim(v.user).replace(/^@/, '');
        return u ? { title: 'PayPal', caption: '@' + u } : {};
      }
    },
    coin: {
      icon: 'coin',
      fields: [
        { k: 'coin', type: 'select', opts: ['bitcoin', 'ethereum', 'litecoin', 'bitcoincash'] },
        { k: 'addr', type: 'text', ph: '' },
        { k: 'amount', type: 'text', ph: '' }
      ],
      build: function (v) {
        var a = trim(v.addr);
        if (!a || /[\s]/.test(a)) return '';
        var c = v.coin || 'bitcoin';
        var amt = trim(v.amount);
        var q = (c !== 'ethereum' && amt && !isNaN(+amt) && +amt > 0) ? '?amount=' + (+amt) : '';
        return c + ':' + a + q;
      },
      label: function (v) {
        var a = trim(v.addr);
        if (!a) return {};
        var c = (v.coin || 'bitcoin');
        return { title: c.charAt(0).toUpperCase() + c.slice(1),
                 caption: a.length > 20 ? a.slice(0, 10) + '…' + a.slice(-6) : a };
      }
    },
    mecard: {
      icon: 'card',
      fields: [
        { k: 'first', type: 'text', ph: '' }, { k: 'last', type: 'text', ph: '' },
        { k: 'phone', type: 'tel', ph: '' }, { k: 'email', type: 'email', ph: '' },
        { k: 'website', type: 'url', ph: '' }
      ],
      build: function (v) {
        if (!trim(v.first) && !trim(v.last)) return '';
        function me(s) { return String(s == null ? '' : s).replace(/([\\;,:"])/g, '\\$1'); }
        var s = 'MECARD:N:' + me(trim(v.last)) + ',' + me(trim(v.first)) + ';';
        if (trim(v.phone)) s += 'TEL:' + me(trim(v.phone)) + ';';
        if (trim(v.email)) s += 'EMAIL:' + me(trim(v.email)) + ';';
        if (trim(v.website)) s += 'URL:' + me(trim(v.website)) + ';';
        return s + ';';
      },
      label: function (v) {
        var name = (trim(v.first) + ' ' + trim(v.last)).trim();
        return name ? { title: name, caption: trim(v.phone) } : {};
      }
    },
    zoom: {
      icon: 'cam',
      fields: [{ k: 'meetingId', type: 'text', ph: '123 4567 8901' },
               { k: 'passcode', type: 'text', ph: '' }],
      build: function (v) {
        var id = trim(v.meetingId).replace(/[^\d]/g, '');
        if (!id) return '';
        var p = trim(v.passcode);
        return 'https://zoom.us/j/' + id + (p ? '?pwd=' + encodeURIComponent(p) : '');
      },
      label: function (v) {
        var id = trim(v.meetingId);
        return id ? { title: 'Zoom', caption: id } : {};
      }
    },
    alipay: {
      icon: 'walletb',
      fields: [{ k: 'payLink', type: 'url', ph: 'https://qr.alipay.com/…' }],
      build: function (v) {
        var u = trim(v.payLink);
        return /^https:\/\/(qr\.alipay\.com|render\.alipay\.com)\//i.test(u) ? u : '';
      },
      label: function (v) {
        return trim(v.payLink) ? { title: '\u652f\u4ed8\u5b9d', caption: 'Alipay' } : {};
      }
    },
    wechatpay: {
      icon: 'walletg',
      fields: [{ k: 'payLink', type: 'text', ph: 'wxp://…' }],
      build: function (v) {
        var u = trim(v.payLink);
        return /^(wxp:\/\/|weixin:\/\/|https:\/\/payapp\.weixin\.qq\.com\/)/i.test(u) ? u : '';
      },
      label: function (v) {
        return trim(v.payLink) ? { title: '\u5fae\u4fe1\u652f\u4ed8', caption: 'WeChat Pay' } : {};
      }
    },
    line: {
      icon: 'bubble',
      fields: [{ k: 'lineId', type: 'text', ph: 'username or @official' }],
      build: function (v) {
        var id = trim(v.lineId);
        if (!id) return '';
        return 'https://line.me/R/ti/p/' + (id.charAt(0) === '@' ? id : '~' + id);
      },
      label: function (v) {
        var id = trim(v.lineId);
        return id ? { title: 'LINE', caption: id } : {};
      }
    },
    upi: {
      icon: 'rupee',
      fields: [
        { k: 'vpa', type: 'text', ph: 'name@bank' },
        { k: 'name', type: 'text', ph: '' },
        { k: 'amount', type: 'text', ph: '' }
      ],
      build: function (v) {
        var pa = trim(v.vpa);
        if (!/^[\w.-]+@[\w-]+$/.test(pa)) return '';
        var q = ['pa=' + encodeURIComponent(pa)];
        if (trim(v.name)) q.push('pn=' + encodeURIComponent(trim(v.name)));
        var a = trim(v.amount);
        if (a && !isNaN(+a) && +a > 0) q.push('am=' + (+a));
        q.push('cu=INR');
        return 'upi://pay?' + q.join('&');
      },
      label: function (v) {
        var pa = trim(v.vpa);
        return pa ? { title: trim(v.name) || pa, caption: 'UPI' } : {};
      }
    },
    promptpay: {
      icon: 'baht',
      fields: [{ k: 'phone', type: 'tel', ph: '+66 81 234 5678' },
               { k: 'amount', type: 'text', ph: '' }],
      build: function (v) {
        var d = trim(v.phone).replace(/[^\d]/g, '');
        if (!d) return '';
        if (d.slice(0, 2) === '66') d = '00' + d;
        else if (d.charAt(0) === '0') d = '0066' + d.slice(1);
        else d = '0066' + d;
        if (d.length !== 13) return '';
        var a = trim(v.amount);
        var p = tlv('00', '01') + tlv('01', '11') +
                tlv('29', tlv('00', 'A000000677010111') + tlv('01', d)) +
                tlv('53', '764');
        if (a && !isNaN(+a) && +a > 0) p += tlv('54', (+a).toFixed(2));
        p += tlv('58', 'TH');
        return p + '6304' + crc16(p + '6304');
      },
      label: function (v) {
        var p = trim(v.phone);
        return p ? { title: 'PromptPay', caption: p } : {};
      }
    },
    sepa: {
      icon: 'bank',
      fields: [
        { k: 'name', type: 'text', ph: '' },
        { k: 'iban', type: 'text', ph: 'DE89 3704 0044 0532 0130 00' },
        { k: 'amount', type: 'text', ph: '' }
      ],
      build: function (v) {
        var name = trim(v.name);
        var iban = trim(v.iban).replace(/\s+/g, '').toUpperCase();
        if (!name || !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return '';
        var a = trim(v.amount);
        return ['BCD', '002', '1', 'SCT', '', name, iban,
                (a && !isNaN(+a) && +a > 0) ? 'EUR' + (+a).toFixed(2) : '',
                '', '', ''].join('\n');
      },
      label: function (v) {
        var name = trim(v.name), iban = trim(v.iban).replace(/\s+/g, '');
        if (!name) return {};
        return { title: name, caption: iban.length > 8 ? iban.slice(0, 4) + '…' + iban.slice(-4) : iban };
      }
    },
    pix: {
      icon: 'pixd',
      fields: [
        { k: 'pixkey', type: 'text', ph: '' },
        { k: 'name', type: 'text', ph: '' },
        { k: 'city', type: 'text', ph: '' },
        { k: 'amount', type: 'text', ph: '' }
      ],
      build: function (v) {
        var key = trim(v.pixkey), name = trim(v.name), city = trim(v.city);
        if (!key || !name || !city) return '';
        var a = trim(v.amount);
        var p = tlv('00', '01') +
                tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', key)) +
                tlv('52', '0000') + tlv('53', '986');
        if (a && !isNaN(+a) && +a > 0) p += tlv('54', (+a).toFixed(2));
        p += tlv('58', 'BR') + tlv('59', name.slice(0, 25)) + tlv('60', city.slice(0, 15)) +
             tlv('62', tlv('05', '***'));
        return p + '6304' + crc16(p + '6304');
      },
      label: function (v) {
        var name = trim(v.name);
        return trim(v.pixkey) && name ? { title: name, caption: 'Pix' } : {};
      }
    },
    event: {
      icon: 'calendar',
      fields: [
        { k: 'title', type: 'text', ph: '' },
        { k: 'location', type: 'text', ph: '' },
        { k: 'start', type: 'datetime-local' },
        { k: 'end', type: 'datetime-local' }
      ],
      build: function (v) {
        if (!trim(v.title) || !trim(v.start)) return '';
        function ics(d) {
          if (!d) return '';
          return d.replace(/[-:]/g, '').replace(/\.\d+/, '') + '00';
        }
        var L = ['BEGIN:VEVENT', 'SUMMARY:' + vcEsc(v.title)];
        if (trim(v.location)) L.push('LOCATION:' + vcEsc(v.location));
        L.push('DTSTART:' + ics(trim(v.start)));
        if (trim(v.end)) L.push('DTEND:' + ics(trim(v.end)));
        L.push('END:VEVENT');
        return L.join('\n');
      },
      label: function (v) {
        if (!trim(v.title)) return {};
        return { title: trim(v.title), caption: trim(v.location) };
      }
    }
  };

  var API = { TYPES: TYPES, wifiEsc: wifiEsc, vcEsc: vcEsc };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  else { root.GeodeContent = API; }
})(typeof self !== 'undefined' ? self : this);

