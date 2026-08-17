"""Го чита текстот на епизодата и прави MP3 со македонски неврален глас.

    python tools/tts.py scripts/01-cigarata-ima-cel.md [--voice mk-MK-AleksandarNeural]

Излез: audio/<име-на-скриптата>.mp3 — спојен, со паузи меѓу пасусите, и
нормализиран на −16 LUFS (стандард за подкасти).

Редовите што почнуваат со # или [ се наслови и режиски забелешки — не се читаат.
Ако сакаш свој глас наместо синтетички: сними го текстот и стави го MP3-то
директно во audio/ со истото име. Останатиот тек не се менува.
"""

import argparse
import asyncio
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
VOICES = {
    "m": "mk-MK-AleksandarNeural",
    "f": "mk-MK-MarijaNeural",
}
PAUSE = 0.45          # секунди тишина меѓу пасусите
PAUSE_SECTION = 0.9   # подолга пауза таму каде режијата бара пауза


def read_blocks(path: Path):
    """Враќа листа од (текст, пауза-по-него) за секој пасус што се чита."""
    blocks = []
    pause_next = PAUSE
    for raw in path.read_text(encoding="utf-8").split("\n\n"):
        para = " ".join(line.strip() for line in raw.strip().splitlines() if line.strip())
        if not para:
            continue
        if para.startswith("#"):
            continue
        if para.startswith("["):
            # режиска забелешка: не се чита, но „пауза“ значи подолга тишина
            if "пауза" in para.lower():
                pause_next = PAUSE_SECTION
            continue
        para = re.sub(r"\*\*(.+?)\*\*", r"\1", para)   # **задебелено** → чист текст
        para = re.sub(r"\s+", " ", para).strip()
        blocks.append((para, pause_next))
        pause_next = PAUSE
    return blocks


async def synth(text: str, voice: str, rate: str, out: Path):
    await edge_tts.Communicate(text, voice, rate=rate).save(str(out))


def ffmpeg(args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("--voice", default=VOICES["m"])
    ap.add_argument("--rate", default="-4%", help="побавно од стандардното чита подобро приказна")
    args = ap.parse_args()

    src = Path(args.script)
    if not src.is_absolute():
        src = ROOT / src
    blocks = read_blocks(src)
    words = sum(len(t.split()) for t, _ in blocks)
    print(f"{len(blocks)} пасуси, {words} зборови, глас {args.voice}")

    out_dir = ROOT / "audio"
    out_dir.mkdir(exist_ok=True)
    out = out_dir / (src.stem + ".mp3")

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        # Спојувањето оди преку WAV: спојување на MP3 парчиња со „-c copy“ дава
        # искривени временски ознаки и скратен резултат.
        parts = []
        for i, (text, pause) in enumerate(blocks):
            mp3 = tmp / f"p{i:03d}.mp3"
            asyncio.run(synth(text, args.voice, args.rate, mp3))
            wav = tmp / f"p{i:03d}.wav"
            ffmpeg(["-i", str(mp3), "-ar", "44100", "-ac", "1", str(wav)])
            parts.append(wav)
            sil = tmp / f"s{i:03d}.wav"
            ffmpeg(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", str(pause), str(sil)])
            parts.append(sil)
            print(".", end="", flush=True)
        print()

        listing = tmp / "list.txt"
        listing.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
        joined = tmp / "joined.wav"
        ffmpeg(["-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(joined)])
        print(f"суров материјал: {duration(joined):.0f} s")

        # −16 LUFS, пик −1 dBTP: она што го очекуваат Spotify и Apple
        ffmpeg(["-i", str(joined), "-af", "loudnorm=I=-16:TP=-1:LRA=11",
                "-ar", "44100", "-ac", "1", "-b:a", "96k", str(out)])

    sec = duration(out)
    print(f"{out.relative_to(ROOT)} — {int(sec // 60)}:{int(sec % 60):02d}, "
          f"{out.stat().st_size / 1048576:.2f} MB")
    print(f"должина во секунди: {int(sec)}  (внеси го во episodes.json)")


if __name__ == "__main__":
    sys.exit(main())
