(function (root) {
  'use strict';

  var RTL = ['ar', 'he', 'fa', 'ur'];

  var S = {
    en: { name: 'English',
      tagline: 'QR codes that never expire.',
      sub: 'Free, no account, nothing leaves your browser — and every style stays inside limits proven against a deliberately bad scanner.',
      shape: 'shape', classic: 'classic', geode: 'geode',
      colour: 'colour', shading: 'shading', min: 'min', max: 'max',
      scannable: 'Styling stays inside limits proven against a deliberately weak scanner',
      atLimit: 'As far as it goes and still scans',
      eccLocked: 'Error correction is held at H while styling is on — that headroom is what makes the styling safe.',
      download: 'Download', downloadAs: 'Download as', share: 'Share',
      advanced: 'Advanced settings', bulk: 'Bulk',
      copyImg: 'Copy image',
      fmtNote: 'PDF ships a vector matrix with the full design. EPS is the bare vector code. PNG and SVG stay sharpest — JPG is for systems that require it.',
      verifyBtn: 'Scan-check', verifying: 'Reading…',
      verifyOk: 'Your device read back exactly what you entered.',
      verifyFail: 'Read-back did not match. Lower the styling or enlarge the code.',
      utm: 'Campaign tags (UTM)',
      readTitle: 'Read a code',
      readBody: 'Drop in any QR image and see exactly what is inside — decoded on this page, on your device, sent nowhere. If a code you made elsewhere shows a stranger\'s domain instead of your link, every scan is passing through that domain first.',
      readPick: 'Choose an image or drop it here',
      readNone: 'No QR code found in that image.',
      readHost: 'This code is a link to',
      readCopy: 'Copy contents',
      promise: "This code doesn't need us. It keeps working even if this site disappears.",
      printer: 'Need it on paper? Find a printer near you',
      mapQ: 'print shop', mapAlt: 'Other map providers',
      shareTitle: 'Tell someone it exists',
      shareBody: 'This project has no marketing budget and no growth team — it spreads or it does not.',
      shareText: 'Free QR codes that never expire. No account, no watermark, nothing leaves your browser.',
      copy: 'Copy link', copied: 'Copied',
      stickers: 'Order stickers & labels online',
      affiliate: "That's an affiliate link — if you order, we get a small cut at no cost to you. It's how the site stays free.",
      whyFree: 'Your QR code points exactly where you tell it. Nothing sits between the scan and your link, because there is no server involved at all. That is also why it is free: a static code costs us almost nothing to make, so we do not charge for it, do not watermark it, and do not put anything inside it. Your code stays yours.',
      verify: 'We invite you to double-check our work.',
      'verify-nav': 'Privacy promise',
      verifyBody: 'Open your browser’s developer tools, switch to the Network tab, and make a code. Nothing leaves your device.',
      sourceLink: 'The whole source is on GitHub. Read it, fork it, run it offline.',
      feedback: 'Found a bug, or a claim that doesn\u2019t hold up? Tell us \u2014 an example helps enormously, though we understand if yours is too sensitive to share:',
      sponsorTitle: 'This slot pays for the page',
      sponsorBody: 'One static, labeled sponsor link — an image we host and a plain link. No ad network, no tracking script, no third-party request. That is the entire business model, and it is why nothing above has a price.',
      sponsorCta: 'Sponsor this slot →',
      getInTouch: 'Get in touch',
      moreTitle: 'More from GeodeForge',
      moreBody: 'GeodeForge is a one-person studio that crafts open-source tools that do what they say, and let you check — in your browser.',
      moreLink: 'Check at geodeforge.com →',
      kicker: 'That’s the difference between a privacy policy and a fact.',
      tooLong: 'That’s too long to fit in a QR code. Shorten it.',
      csvLabel: 'CSV — column 1 is the content, column 2 (optional) is the filename',
      bulkPick: 'Choose a CSV first.',
      bulkEmpty: 'Nothing usable in that CSV.',
      bulkDone: 'codes generated in your browser. Nothing was uploaded.',
      contact: 'Contact', privacy: 'Privacy', source: 'Source',
      bulkTitle: 'Bulk codes from a spreadsheet',
      bulkBody: 'Upload a CSV. Get a ZIP of codes — generated in your browser, free.',
      bulkGo: 'Generate ZIP',
      iconInImage: 'Centre icon', textInImage: 'Title & caption in the image',
      frame: 'Frame', ctaLabel: 'Frame text',
      frames: { none: 'None', bar: 'Labelled bar', full: 'Full border' },
      font: 'Font', textColour: 'Text colour', textStyle: 'Style', fontSize: 'Text size',
      fonts: { def: 'Default', sans: 'Sans', serif: 'Serif', mono: 'Mono',
               round: 'Rounded', eleg: 'Elegant' },
      sizeL: 'Size', eccL: 'Error correction', transL: 'Transparent background',
      transNote: 'A transparent code keeps scanning on any light background.',
      wifiPass: 'Wi-Fi password:', wifiOpen: 'Open network',
      cta: { url: 'SCAN ME', text: 'SCAN ME', wifi: 'SCAN FOR WI-FI',
             vcard: 'SCAN TO SAVE CONTACT', email: 'SCAN TO EMAIL', sms: 'SCAN TO TEXT',
             phone: 'SCAN TO CALL', geo: 'SCAN FOR DIRECTIONS', event: 'SCAN TO ADD EVENT',
             whatsapp: 'SCAN TO CHAT', pay: 'SCAN TO PAY', coin: 'SCAN TO PAY',
             mecard: 'SCAN TO SAVE CONTACT', zoom: 'SCAN TO JOIN',
             alipay: 'SCAN TO PAY', wechatpay: 'SCAN TO PAY', line: 'SCAN TO ADD ON LINE',
             upi: 'SCAN TO PAY', promptpay: 'SCAN TO PAY', sepa: 'SCAN TO TRANSFER', pix: 'SCAN TO PAY' },
      types: { url: 'Link', text: 'Text', wifi: 'Wi-Fi', vcard: 'Contact', email: 'Email',
               sms: 'SMS', phone: 'Phone', geo: 'Location', event: 'Event',
               whatsapp: 'WhatsApp', pay: 'PayPal', coin: 'Crypto', mecard: 'MeCard', zoom: 'Zoom',
               alipay: 'Alipay', wechatpay: 'WeChat Pay', line: 'LINE', upi: 'UPI',
               promptpay: 'PromptPay', sepa: 'Bank (SEPA)', pix: 'Pix' },
      f: { url: 'URL', text: 'Text', ssid: 'Network name', password: 'Password',
           security: 'Security', hidden: 'Hidden network', first: 'First name', last: 'Last name',
           org: 'Organisation', title: 'Job title', phone: 'Phone', email: 'Email',
           website: 'Website', to: 'To', subject: 'Subject', body: 'Message',
           message: 'Message', lat: 'Latitude', lon: 'Longitude',
           location: 'Location', start: 'Starts', end: 'Ends',
           user: 'PayPal.me username', amount: 'Amount', coin: 'Coin',
           addr: 'Wallet address', meetingId: 'Meeting ID', passcode: 'Passcode',
           source: 'Source', medium: 'Medium', campaign: 'Campaign',
           payLink: 'Payment link from your app', lineId: 'LINE ID',
           vpa: 'UPI ID (VPA)', name: 'Name', iban: 'IBAN',
           pixkey: 'Pix key', city: 'City' }
    },
  };

  function detect() {
    var l = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    l = l.toLowerCase().split('-')[0];
    return S[l] ? l : 'en';
  }
  function t(lang, path) {
    var cur = S[lang] || S.en, en = S.en;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) {
      cur = cur && cur[parts[i]];
      en = en && en[parts[i]];
    }
    return (cur === undefined || cur === null || cur === '') ? en : cur;
  }
  function isRTL(lang) { return RTL.indexOf(lang) !== -1; }

  var API = { strings: S, detect: detect, t: t, isRTL: isRTL, langs: Object.keys(S) };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  else { root.GeodeI18n = API; }
})(typeof self !== 'undefined' ? self : this);

