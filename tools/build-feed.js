/* Го гради RSS фидот на подкастот од podcast.json + episodes.json.
   Употреба: node tools/build-feed.js
   Излез:    docs/feed.xml

   Аудиото не се качува на Pages — стои како asset во GitHub Releases, па
   <enclosure> покажува таму. Така нема лимит на големина на repo.            */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const show = JSON.parse(fs.readFileSync(path.join(ROOT, "podcast.json"), "utf8"));
const episodes = JSON.parse(fs.readFileSync(path.join(ROOT, "episodes.json"), "utf8"));

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

/* RFC 822 датум — Apple и Spotify не прифаќаат ISO. */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function rfc822(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const oh = p(Math.floor(Math.abs(off) / 60)), om = p(Math.abs(off) % 60);
  return `${DAYS[d.getDay()]}, ${p(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${sign}${oh}${om}`;
}
const hhmmss = (s) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, "0")).join(":");

const items = [...episodes].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).map((e) => {
  const file = path.join(ROOT, "audio", e.slug + ".mp3");
  if (!fs.existsSync(file)) throw new Error("нема аудио: " + file);
  const size = fs.statSync(file).size;
  const url = `${show.releaseBase}/${e.tag}/${e.slug}.mp3`;
  const notes = [e.description, "", ...(e.links || [])].join("\n");
  return `    <item>
      <title>${esc(e.title)}</title>
      <link>${esc(show.siteUrl)}#${esc(e.slug)}</link>
      <guid isPermaLink="false">${esc(show.siteUrl)}${esc(e.slug)}</guid>
      <pubDate>${rfc822(e.pubDate)}</pubDate>
      <description>${esc(notes)}</description>
      <enclosure url="${esc(url)}" length="${size}" type="audio/mpeg"/>
      <itunes:title>${esc(e.title)}</itunes:title>
      <itunes:subtitle>${esc(e.subtitle || "")}</itunes:subtitle>
      <itunes:summary>${esc(notes)}</itunes:summary>
      <itunes:author>${esc(show.author)}</itunes:author>
      <itunes:duration>${hhmmss(e.durationSeconds)}</itunes:duration>
      <itunes:episode>${e.number}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:explicit>${show.explicit ? "true" : "false"}</itunes:explicit>
    </item>`;
}).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(show.title)}</title>
    <link>${esc(show.siteUrl)}</link>
    <atom:link href="${esc(show.feedUrl)}" rel="self" type="application/rss+xml"/>
    <language>${esc(show.language)}</language>
    <copyright>${esc(show.copyright)}</copyright>
    <description>${esc(show.description)}</description>
    <lastBuildDate>${rfc822(new Date().toISOString())}</lastBuildDate>
    <image>
      <url>${esc(show.coverUrl)}</url>
      <title>${esc(show.title)}</title>
      <link>${esc(show.siteUrl)}</link>
    </image>
    <itunes:author>${esc(show.author)}</itunes:author>
    <itunes:subtitle>${esc(show.subtitle)}</itunes:subtitle>
    <itunes:summary>${esc(show.description)}</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:explicit>${show.explicit ? "true" : "false"}</itunes:explicit>
    <itunes:image href="${esc(show.coverUrl)}"/>
    <itunes:category text="${esc(show.category)}">
      <itunes:category text="${esc(show.subcategory)}"/>
    </itunes:category>
    <itunes:owner>
      <itunes:name>${esc(show.ownerName)}</itunes:name>
      <itunes:email>${esc(show.ownerEmail)}</itunes:email>
    </itunes:owner>
${items}
  </channel>
</rss>
`;

fs.mkdirSync(path.join(ROOT, "docs"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "docs", "feed.xml"), xml);
console.log(`docs/feed.xml — ${episodes.length} епизоди, ${xml.length} B`);
if (show.ownerEmail.includes("example.com")) {
  console.log("ВНИМАНИЕ: ownerEmail е пример. Apple бара вистински е-маил пред пријава.");
}
