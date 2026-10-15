"""Generate social-media style word-by-word Macedonian ASS captions."""
import math
from pathlib import Path

SENTENCES = [
    "Упатство за користење на автоматската перална.",
    "Возете до наплатната станица и извршете плаќање.",
    "Одберете ја посакуваната програма за перење.",
    "По вклучувањето на зеленото светло, продолжете полека напред.",
    "Насочете го предното лево тркало во означениот држач.",
    "Откако тркалото ќе биде правилно позиционирано, перењето автоматски ќе започне.",
    "За време на перењето не го придвижувајте возилото.",
    "Кога ќе се појави зеленото светло за излез, полека напуштете ја пералната.",
    "Ви благодариме за довербата и уживајте во беспрекорно чисто возило!",
]

# Accent pairs per sentence block (primary fill, outline) in BGR hex for ASS
PALETTE = [
    ("&H00F5FF&", "&H0066FF&"),  # cyan / blue
    ("&H00D4FF&", "&H009900&"),  # gold-ish / green
    ("&H7ADBFF&", "&H5500AA&"),  # coral / purple
    ("&H00FFCC&", "&H004488&"),  # mint / navy
    ("&H00BFFF&", "&H0000AA&"),  # sky / deep blue
    ("&H00FFFF&", "&H006633&"),  # aqua / dark green
    ("&H00CCFF&", "&H880044&"),  # peach / wine
    ("&H66FFCC&", "&H004466&"),  # seafoam / teal
    ("&H00FFFF&", "&HFF6600&"),  # bright / orange (finale)
]

DURATION = 49.946
INTRO = 0.4
OUTRO = 0.6
WIDTH, HEIGHT = 1080, 1920
CENTER_X = WIDTH // 2
WORD_Y = int(HEIGHT * 0.58)
HINT_Y = int(HEIGHT * 0.68)


def ass_time(seconds: float) -> str:
    if seconds < 0:
        seconds = 0
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    cs = int(round((s - int(s)) * 100))
    return f"{h}:{m:02d}:{int(s):02d}.{cs:02d}"


def clean_words(sentence: str) -> list[str]:
    words = sentence.replace(",", "").replace("!", "").replace(".", "").split()
    return [w for w in words if w]


def build_ass() -> str:
    blocks: list[tuple[list[str], str, str]] = []
    for i, sentence in enumerate(SENTENCES):
        words = clean_words(sentence)
        primary, outline = PALETTE[i % len(PALETTE)]
        blocks.append((words, primary, outline))

    total_words = sum(len(w) for w, _, _ in blocks)
    usable = DURATION - INTRO - OUTRO
    base_word = usable / total_words

    header = f"""[Script Info]
Title: NovaDrive Car Wash Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: {WIDTH}
PlayResY: {HEIGHT}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Word,Arial Black,92,&H00FFFFFF&,&H000000FF&,&H00000000&,&H80000000&,1,0,0,0,100,100,0,0,1,6,3,5,40,40,120,1
Style: Hint,Segoe UI Semibold,34,&H99FFFFFF&,&H000000FF&,&H00000000&,&H60000000&,0,0,0,0,100,100,0,0,1,3,2,5,60,60,80,1
Style: Step,Arial Black,28,&H00FFFFFF&,&H000000FF&,&H00000000&,&HAA000000&,1,0,0,0,100,100,2,0,3,0,8,7,50,50,180,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    events: list[str] = []
    t = INTRO
    step = 1

    for words, primary, outline in blocks:
        sentence_start = t
        sentence_words_duration = len(words) * base_word

        # Step badge for the sentence block
        badge_end = min(sentence_start + sentence_words_duration, DURATION - OUTRO)
        events.append(
            f"Dialogue: 0,{ass_time(sentence_start)},{ass_time(badge_end)},Step,,0,0,0,,"
            f"{{\\an7\\pos(90,170)\\fad(200,200)\\bord0\\shad0"
            f"\\1c{primary}\\3c{outline}\\4c&HAA000000&}}{step:02d}"
        )

        for wi, word in enumerate(words):
            start = t
            end = min(t + base_word, DURATION - OUTRO)
            if end <= start:
                continue

            # Pop-in scale + color accent on active word
            tags = (
                f"{{\\an5\\pos({CENTER_X},{WORD_Y})"
                f"\\fad(60,80)"
                f"\\1c{primary}\\3c{outline}\\4c&H90000000&"
                f"\\bord10\\shad5\\blur0.3"
                f"\\fscx80\\fscy80\\alpha&H40&"
                f"\\t(0,140,\\fscx112\\fscy112\\alpha&H00&)"
                f"\\t(140,260,\\fscx100\\fscy100)"
                f"\\t(0,80,\\frz-2)"
                f"\\t(80,180,\\frz0)"
                f"}}"
            )
            events.append(
                f"Dialogue: 1,{ass_time(start)},{ass_time(end)},Word,,0,0,0,,{tags}{word.upper()}"
            )
            t = end

        # Soft context line showing full sentence faded beneath
        hint_tags = (
            f"{{\\an5\\pos({CENTER_X},{HINT_Y})"
            f"\\fad(250,250)"
            f"\\1c&H55FFFFFF&\\3c&H00000000&\\bord0\\shad0"
            f"\\fscx95\\fscy95"
            f"}}"
        )
        full = " ".join(words)
        events.append(
            f"Dialogue: 0,{ass_time(sentence_start)},{ass_time(badge_end)},Hint,,0,0,0,,{hint_tags}{full}"
        )

        step += 1
        t += base_word * 0.15  # tiny breath between sentences

    return header + "\n".join(events) + "\n"


def main() -> None:
    out = Path(__file__).with_name("captions.ass")
    content = build_ass()
    out.write_text(content, encoding="utf-8-sig")
    print(f"Wrote {out} ({len(content)} bytes)")


if __name__ == "__main__":
    main()
