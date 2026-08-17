# Целта зад тоа — подкаст

Наративен подкаст на македонски за психологија и однесување. Овде стои **целата
машинерија**: текстовите на епизодите, синтезата на аудиото, насловната слика, RSS
фидот и страницата за слушање. Без платформа, без месечна претплата, без посредник.

- Страница: https://ljupcho1982.github.io/podcast/
- RSS фид: https://ljupcho1982.github.io/podcast/feed.xml
- Аудиото: како asset во GitHub Releases (нема лимит од 100 MB како за фајлови во repo)

## Како е составено

| Фајл | Што прави |
|---|---|
| `podcast.json` | податоци за самиот подкаст: наслов, опис, категорија, сопственик |
| `episodes.json` | список епизоди: наслов, опис, датум, должина, таг на Release |
| `scripts/*.md` | текстот на епизодата; редовите со `#` и `[режија: …]` не се читаат |
| `tools/tts.py` | го чита текстот со македонски неврален глас → `audio/*.mp3` |
| `tools/build-feed.js` | гради `docs/feed.xml` (RSS 2.0 + iTunes тагови) |
| `tools/check-feed.js` | проверка пред качување, вклучно дали аудиото навистина се симнува |
| `tools/make-cover.js` | насловна 3000×3000 → `docs/cover.png` и `.jpg` |
| `docs/index.html` | страница за слушање со плеер |

## Нова епизода

```bash
# 1. текст
#    scripts/02-nesto.md

# 2. аудио — синтетички глас
"../predavach/.venv/Scripts/python.exe" tools/tts.py scripts/02-nesto.md
#    или со женски глас:
#    ... tools/tts.py scripts/02-nesto.md --voice mk-MK-MarijaNeural

# 3. внеси го во episodes.json (должината ја пишува скриптата)

# 4. качи го аудиото како Release asset
gh release create ep02 audio/02-nesto.mp3 --title "Епизода 2 — …" --notes "…"

# 5. фид и проверка
npm run feed
git add -A && git commit -m "Епизода 2" && git push
```

Фидот е ист линк засекогаш — платформите сами ја земаат новата епизода од него,
обично во рок од час.

### Свој глас наместо синтетички

Сними го текстот, извези MP3 и стави го во `audio/` со истото име како скриптата.
Останатиот тек е непроменет. Пред извоз нормализирај на **−16 LUFS**, пик −1 dBTP —
тоа е она што го очекуваат Spotify и Apple:

```bash
ffmpeg -i suroviot-zapis.wav -af "highpass=f=80,loudnorm=I=-16:TP=-1:LRA=11" -ar 44100 -ac 1 -b:a 96k audio/02-nesto.mp3
```

## Пред пријава во директориумите

1. Во `podcast.json` смени го `ownerEmail` со вистински — Apple праќа код за потврда
   на таа адреса, а `check-feed.js` намерно паѓа додека стои примерот.
2. Пријави го **истиот RSS линк** на: Spotify for Creators, Apple Podcasts Connect,
   YouTube Music (Podcasts), Podcast Index. Секој од нив е бесплатен.
3. Апликациите потоа сами повлекуваат — не се качува аудио на секоја платформа.

## Барања

- Python со `edge-tts` (се користи виртуелната околина од [`predavach`](../predavach))
- `ffmpeg` и `ffprobe` на PATH
- Node за фидот и насловната (`npm install`)

## Лиценца

Кодот: MIT. Содржината на епизодите: CC BY-NC 4.0.
