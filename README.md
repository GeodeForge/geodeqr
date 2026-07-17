# GeodeQR

**Free QR codes that never expire.** No account, no watermark, no expiry, no upsell.
Nothing leaves your browser — and you don't have to take our word for it.

A [GeodeForge](https://geodeforge.com) tool.

---

## Check for yourself

Open your browser's developer tools, switch to the **Network tab**, and make a code.

**Nothing happens.** No request leaves your machine — because there is nowhere for it to go.
Your Wi-Fi password, your contact details, your URL: all of it is turned into a QR code
entirely in your browser, by maths, on your machine. This site has **no server, no database,
no backend**.

Clone this repo, disconnect your Wi-Fi, open `index.html`. It still works.

*That's the difference between a privacy policy and a fact.*

## Why this exists

A printed QR code should outlive the site that made it. A *dynamic* code can't promise that:
it redirects through a server, and a redirect is a service that can end — when it does, the
printed code is dead and nobody can bring it back.

Ours are **static**: the data is inside the code. It points where you told it to, forever.
If this project disappears tomorrow, every code ever made with it keeps working. Nobody can
revoke them — not even us. (Wondering which kind you already have? Drop it into the reader
and look.)

## What's free here

None of this ever needed a server in the first place, so all of it is free:

- **Bulk CSV → ZIP.** Upload a spreadsheet, get a ZIP of codes. It runs entirely in your
  browser — the spreadsheet never uploads anywhere.
- **Vector export: SVG, PDF and EPS** — and the export keeps your design: colors, styling,
  labels. The PDF's matrix is true vector, with the labels embedded at print DPI
  (raster on purpose — PDF's built-in fonts are Latin-only, and vector text would silently
  mangle Chinese and Arabic). Plus JPG for systems that insist.
- Print-ready high-DPI PNG, transparent backgrounds, error-correction control.
- **21 content types** — URL (with campaign/UTM tags), Wi-Fi, vCard, MeCard, email, SMS,
  phone, location, calendar, text, WhatsApp, PayPal, crypto, Zoom, LINE, UPI, PromptPay,
  SEPA bank transfer, Pix, and Alipay / WeChat Pay (those two restyle the payment link your
  app already issued — payment QR tokens are minted in-app and no public scheme exists, so a
  username alone cannot produce one). All in **any language**, including Chinese, Arabic,
  Hindi, Japanese, Cyrillic and emoji.
- **A QR reader.** Drop in any QR image and see exactly what is inside, decoded on your
  device by our own decoder. If a code you made elsewhere shows a stranger's domain instead
  of your link, every scan is passing through that domain first — now you can check.

We don't offer dynamic codes or scan analytics. Those genuinely need a server running forever
plus abuse moderation. **Declining them isn't a gap — it's the reason everything else can be
free.**

## The scannability governor

**Every style you can reach here has been proven to scan.** The sliders simply don't go anywhere
that stops working.

The geode eye **is** the finder pattern, built from the module grid: `1 rim / 1 gap / 3 gem /
1 gap / 1 rim`. Styling is bounded by limits **proven against a deliberately weak decoder on
degraded images** — not against a flagship phone reading crisp pixels, which is the easy case
and tells you nothing.

**Be precise about what this is.** The badge describes the *limits*: the app refuses to
leave the envelope that was verified offline against a weak decoder. Error correction is
**locked to H whenever styling is on** (level L with the geode eye decodes 0/18 on a weak
scanner — so it isn't offered), the rim radius is capped, and every hue is auto-darkened to
clear a contrast floor. On top of that — the app *does* ship a decoder, our
own (see below) — the **Scan-check** button will decode the preview on demand and confirm it
reads back exactly what you typed. The badge is a promise about the envelope; Scan-check is
a per-code test you run yourself.

Two findings from building it, both the hard way:

- **The rim corner radius cannot exceed `1.5 × module`.** At ~1.95 the finder's `1:1:3:1:1`
  ratio distorts and weak scanners lose the code outright. Flagship phones read it fine — which
  is exactly why testing on flagships is worthless.
- **Mask selection beats the spec.** Choosing the mask that minimises *false finder patterns*
  decodes 73/80 on a weak decoder, versus 65/80 for the ISO penalty heuristic — and 72/80 for
  `segno`, a mature library. The standard's score is a proxy; the thing that actually loses a
  code is spurious `1:1:3:1:1` runs, so we optimise for that directly.

Building it surfaced four real bugs that only an independent decoder could find.

## The decoder

`src/decode.js` is a **clean-room QR decoder** — same zero-dependency rule as the encoder.
It exists because the "native" BarcodeDetector API only ships on macOS/ChromeOS/Android, so
a reader built on it is invisible on most desktops. Ours runs everywhere, feeds the
**Read a code** section and **Scan-check**, and never guesses: a Reed-Solomon correction
that doesn't re-verify against zeroed syndromes is reported as a failure, not a result.
Validated against independent generators (python `qrcode`, `segno`) at 56/56, plus 500/500
corruption round-trips and 27/27 on our own styled output — where the centre icon's cleared
well means every decode is the error corrector working for a living.

## Structure

```
index.html      the tool
contact.html    mailto — no form, because a form needs a server
privacy.html    a description of the architecture, not a policy
app.js          glue
src/qr.js       QR encoder — no dependencies, all 40 versions, L/M/Q/H, raw UTF-8
src/decode.js   QR decoder — clean-room, powers the reader + Scan-check
src/render.js   geode renderer — canvas + true-vector SVG
src/export.js   PDF + EPS writers — vector matrix, no libraries
src/content.js  payload builders (Wi-Fi/vCard/EMVCo escaping done properly) + per-type labels
src/i18n.js     UI strings — English; system fonts only
src/zip.js      CSV parsing + stored-ZIP writer for bulk export
```

## Self-identifying output

The exported image can carry a **title above the code and a caption below it** — for Wi-Fi,
the network name and password — so you can tell what a code is for *before* you scan it.
On top of that: a **centre icon** (~20% of the code width, in a cleared white well) and a
**frame** — none, a labelled bar, or a full bordered container — with an editable
call-to-action ("SCAN FOR WI-FI"). Typography for the labels (font, colour,
bold / italic / underline) lives in the Advanced panel. **System fonts only** — a font CDN
would put a network request on the page and break the claim this whole README opens with.

The governor covers all of it: with the centre icon on, error correction is locked to H and
the geode shape ceiling drops from 88 to 70 — numbers measured against a deliberately weak
decoder (OpenCV) on degraded images, where the icon build decodes at or above the plain
build's rate. The envelope is in `src/render.js`, next to the measurements that set it.

## License

MIT — see [`LICENSE`](LICENSE). The license covers the code. The GeodeForge and GeodeQR
names, the geode mark, and the brand images under `assets/` identify the studio and are
not part of the grant — see [`TRADEMARKS.md`](TRADEMARKS.md).
