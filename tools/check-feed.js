/* Проверка на фидот пред качување: дали XML-от е валиден, дали ги има
   задолжителните тагови и дали секој <enclosure> навистина постои на мрежа.

   Употреба: node tools/check-feed.js [--offline]                            */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const xml = fs.readFileSync(path.join(ROOT, "docs", "feed.xml"), "utf8");
const offline = process.argv.includes("--offline");
let bad = 0;
const fail = (m) => { console.error("✗ " + m); bad++; };
const ok = (m) => console.log("✓ " + m);

/* 1. основна форма */
if (!xml.startsWith("<?xml")) fail("нема XML декларација");
const opens = (xml.match(/<item>/g) || []).length;
const closes = (xml.match(/<\/item>/g) || []).length;
if (opens !== closes) fail(`неспарени <item>: ${opens}/${closes}`);
else ok(`${opens} епизоди, спарени тагови`);

/* 2. задолжителни канал-тагови (Apple/Spotify) */
const need = [
  "<title>", "<link>", "<language>", "<description>",
  "<itunes:author>", "<itunes:image", "<itunes:category", "<itunes:owner>",
  "<itunes:explicit>", "<atom:link",
];
const missing = need.filter((t) => !xml.includes(t));
if (missing.length) fail("недостасуваат тагови: " + missing.join(", "));
else ok("сите задолжителни канал-тагови се тука");

if (xml.includes("example.com")) fail("ownerEmail сè уште е пример (Apple бара вистински)");

/* 3. секој item мора да има enclosure со должина и тип */
for (const item of xml.split("<item>").slice(1)) {
  const t = (item.match(/<title>(.*?)<\/title>/) || [])[1] || "?";
  const enc = item.match(/<enclosure url="([^"]+)" length="(\d+)" type="audio\/mpeg"\/>/);
  if (!enc) { fail(`${t}: неисправен <enclosure>`); continue; }
  if (+enc[2] < 10000) fail(`${t}: сомнително мала должина (${enc[2]} B)`);
  if (!/<guid /.test(item)) fail(`${t}: нема <guid>`);
  if (!/<pubDate>\w{3}, \d{2} \w{3} \d{4}/.test(item)) fail(`${t}: pubDate не е RFC 822`);
  if (!/<itunes:duration>\d{2}:\d{2}:\d{2}<\/itunes:duration>/.test(item)) fail(`${t}: лош itunes:duration`);
}
if (!bad) ok("секој item има enclosure, guid, RFC 822 датум и должина");

/* 4. дали аудиото навистина се симнува (по објавување на Release) */
(async () => {
  if (!offline) {
    for (const m of xml.matchAll(/<enclosure url="([^"]+)" length="(\d+)"/g)) {
      const [, url, len] = m;
      try {
        const r = await fetch(url, { redirect: "follow" });
        const got = r.headers.get("content-length");
        if (!r.ok) fail(`${url} → HTTP ${r.status}`);
        else if (got && got !== len) fail(`${url} → должина ${got}, во фидот ${len}`);
        else ok(`аудиото е достапно: ${url.split("/").pop()} (${len} B)`);
        if (r.body) await r.body.cancel();
      } catch (e) {
        fail(`${url} → ${e.message}`);
      }
    }
  }
  console.log(bad ? `\n${bad} проблем(и).` : "\nФидот е спремен.");
  process.exit(bad ? 1 : 0);
})();
