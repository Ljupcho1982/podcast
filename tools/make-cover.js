/* Прави насловна слика 3000×3000 за подкастот (Apple бара 1400–3000 px).
   Употреба: node tools/make-cover.js
   Излез:    docs/cover.png

   Текстот е крупен намерно: сликата најчесто се гледа како квадратче од 55 px. */

const { Resvg } = require("@resvg/resvg-js");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const show = JSON.parse(fs.readFileSync(path.join(ROOT, "podcast.json"), "utf8"));
const S = 3000;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <radialGradient id="g1" cx="0.2" cy="0.1" r="0.9">
      <stop offset="0" stop-color="#e0a04d" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#e0a04d" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="0.9" cy="0.95" r="0.8">
      <stop offset="0" stop-color="#6fbfa8" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#6fbfa8" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${S}" height="${S}" fill="#0f1216"/>
  <rect width="${S}" height="${S}" fill="url(#g1)"/>
  <rect width="${S}" height="${S}" fill="url(#g2)"/>

  <!-- мета: концентрични кругови со точка — целта зад однесувањето -->
  <g transform="translate(1500,940)" fill="none" stroke="#e0a04d">
    <circle r="430" stroke-width="26" opacity="0.28"/>
    <circle r="300" stroke-width="26" opacity="0.55"/>
    <circle r="170" stroke-width="26"/>
    <circle r="60" fill="#6fbfa8" stroke="none"/>
  </g>

  <g font-family="Segoe UI, Arial, sans-serif" text-anchor="middle" fill="#ffffff">
    <text x="1500" y="1700" font-size="300" font-weight="700" letter-spacing="-4">Целта</text>
    <text x="1500" y="2030" font-size="300" font-weight="700" letter-spacing="-4">зад тоа</text>
  </g>

  <rect x="1290" y="2130" width="420" height="12" rx="6" fill="#6fbfa8"/>

  <g font-family="Segoe UI, Arial, sans-serif" text-anchor="middle" fill="#95a1ae">
    <text x="1500" y="2330" font-size="106">психологија на однесувањето</text>
    <text x="1500" y="2480" font-size="106">на македонски</text>
  </g>

  <text x="1500" y="2760" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle"
        font-size="88" fill="#e0a04d" letter-spacing="6">${show.author.toUpperCase()}</text>
</svg>`;

fs.mkdirSync(path.join(ROOT, "docs"), { recursive: true });
const png = new Resvg(svg, {
  fitTo: { mode: "width", value: S },
  font: { loadSystemFonts: true, defaultFontFamily: "Segoe UI" },
}).render().asPng();

fs.writeFileSync(path.join(ROOT, "docs", "cover.png"), png);
console.log(`docs/cover.png — ${S}×${S}, ${(png.length / 1024).toFixed(0)} KB`);

/* Фидот покажува на JPEG: PNG на 3000 px минува 500 KB, а дел од директориумите
   одбиваат поголеми слики. */
const jpg = path.join(ROOT, "docs", "cover.jpg");
require("child_process").execFileSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y",
  "-i", path.join(ROOT, "docs", "cover.png"), "-q:v", "3", jpg,
]);
console.log(`docs/cover.jpg — ${S}×${S}, ${(fs.statSync(jpg).size / 1024).toFixed(0)} KB`);
