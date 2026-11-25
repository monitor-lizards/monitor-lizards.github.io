#!/usr/bin/env python3
"""Build website-sized WOFF2 fallbacks from the pinned Google Fonts sources."""

import argparse
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import shutil
import unicodedata

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
FLUID = ROOT / "public/fluid"
ASSETS = FLUID / "assets"
COPY = json.loads(Path(__file__).with_name("fluid-site-copy.json").read_text())
UPSTREAM = "https://github.com/google/fonts/tree/06bfe0d62a98375cb09c942fa18e68bd32cff057/ofl"
SOURCES = {
    "ja": ("NotoSansJP", "c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f"),
    "ko": ("NotoSansKR", "194018e6b2b293a7964f037b25c0249ce1418bc9ab3c971060a03aa57861e252"),
    "zh-Hans": ("NotoSansSC", "a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da"),
    "zh-Hant": ("NotoSansTC", "864727d210d54f2537bbe23b3a839436c3992af72de9322af5270897246bd44f"),
    "th": ("NotoSansThai", "5a1c559bb539583c8a1fd99d1c5b9491e5e14478c9cd2bd0970d5c3096cc9ef8"),
}


class PageText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []

    def handle_data(self, data):
        self.text.append(data)


def characters(text):
    return {
        ord(char)
        for char in unicodedata.normalize("NFC", text)
        if not char.isspace() and unicodedata.category(char) not in {"Cc", "Cf"}
    }


def brand_coverage():
    cmaps = []
    for name in ("PryvidSans-Regular", "RobochyiSans-Regular", "RobochyiSans-Semi"):
        with TTFont(ASSETS / f"{name}.otf") as font:
            cmaps.append(set(font.getBestCmap()))
    return set.intersection(*cmaps)


def export_face(font, tag, needed, target):
    if missing := needed - set(font.getBestCmap()):
        raise ValueError(f"Missing glyphs for {tag}: {', '.join(f'U+{cp:04X}' for cp in sorted(missing))}")
    if "fvar" in font:
        defaults = {axis.axisTag: axis.defaultValue for axis in font["fvar"].axes}
        font = instantiateVariableFont(font, defaults)
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=needed)
    subsetter.subset(font)
    family = f"Fluid Web {tag}"
    postscript = f"FluidWeb-{tag}"
    names = {1: family, 2: "Regular", 3: postscript, 4: family, 6: postscript, 16: family, 17: "Regular"}
    for record in list(font["name"].names):
        if record.nameID in names:
            font["name"].setName(names[record.nameID], record.nameID, record.platformID, record.platEncID, record.langID)
    font.flavor = "woff2"
    font.recalcTimestamp = False
    font.save(target)
    with TTFont(target) as exported:
        assert needed <= set(exported.getBestCmap()), target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sources", type=Path, help="Directory with the original Noto .ttf files and OFL notices")
    args = parser.parse_args()
    out = ASSETS / "fonts"
    out.mkdir(exist_ok=True)
    brand = brand_coverage()
    web_copy = {tag: characters("".join(values.values())) for tag, values in COPY.items()}
    english = PageText()
    for page in ("", "guide", "privacy", "research", "roadmap", "support"):
        english.feed((FLUID / page / "index.html").read_text())
    # Locale names on the English pages are styled with the same fallback as their
    # landing page. Their Han, Hangul and Thai glyphs belong to those subsets.
    english_script = characters("".join(COPY[tag]["native"] for tag in SOURCES))
    missing = (characters("".join(english.text)) - english_script) - brand
    if missing:
        raise ValueError(f"English pages need a fallback for {''.join(map(chr, sorted(missing)))}")
    manifest = {"source": UPSTREAM, "fonts": {}}
    for tag, (name, pin) in SOURCES.items():
        source = args.sources / f"{name}.ttf"
        if sha256(source.read_bytes()).hexdigest() != pin:
            raise ValueError(f"Unexpected source revision: {source.name}")
        with TTFont(source, recalcTimestamp=False) as font:
            needed = web_copy[tag] - brand
            target = out / f"{tag}.woff2"
            export_face(font, tag, needed, target)
        notice = f"{name}-OFL.txt"
        shutil.copyfile(args.sources / notice, out / notice)
        manifest["fonts"][tag] = {
            "source": source.name,
            "source_sha256": pin,
            "sha256": sha256(target.read_bytes()).hexdigest(),
            "covered_codepoints": len(needed),
            "license_notice": notice,
        }
    for tag, chars in web_copy.items():
        if tag not in SOURCES:
            assert chars <= brand, tag
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
