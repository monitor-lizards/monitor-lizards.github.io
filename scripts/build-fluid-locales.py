#!/usr/bin/env python3
"""Generate localized Fluid landing pages from editorial copy and the existing site."""

import argparse
from html import escape
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
FLUID = ROOT / "public/fluid"
BASE = "https://monitorlizards.studio"
COPY = json.loads(Path(__file__).with_name("fluid-site-copy.json").read_text())
ENGLISH_PAGES = ("", "guide", "research", "privacy", "support", "roadmap")


def route(tag):
    return "/fluid/" if tag == "en" else f"/fluid/{tag}/"


def alternates():
    links = [
        f'<link rel="alternate" hreflang="{tag}" href="{BASE}{route(tag)}">'
        for tag in COPY
    ]
    links.append(f'<link rel="alternate" hreflang="x-default" href="{BASE}/fluid/">')
    return "\n".join(links)


def switcher(tag, *, landing=True):
    native = COPY[tag]
    links = []
    for offer, labels in COPY.items():
        current = ' aria-current="page"' if landing and offer == tag else ''
        links.append(
            f'<li><a href="{route(offer)}" lang="{offer}" hreflang="{offer}"{current}>'
            f'{escape(labels["native"])}</a></li>'
        )
    return (
        f'<details class="language-picker"><summary>{escape(native["language"])}'
        f'</summary><ul>{"".join(links)}</ul></details>'
    )


def replace_region(html, name, value, marker):
    region = f"<!-- {name} -->\n{value}\n<!-- /{name} -->"
    pattern = rf"<!-- {name} -->.*?<!-- /{name} -->"
    if re.search(pattern, html, re.S):
        return re.sub(pattern, lambda _: region, html, count=1, flags=re.S)
    if html.count(marker) < 1:
        raise ValueError(f"Unable to find insertion point for {name}")
    return html.replace(marker, region + "\n" + marker, 1)


def localized_page(tag, original_svg):
    data = COPY[tag]
    label = {key: escape(value, quote=True) for key, value in data.items()}
    title = f'Fluid: Dual N-Back · {label["title"]}'
    canonical = BASE + route(tag)
    english = label["english"]
    mixed_links = "".join(
        f'<a href="/fluid/{key}/" hreflang="en">{label[key]} ({english})</a>'
        for key in ("guide", "research", "support", "privacy")
    )
    return f"""<!doctype html>
<html lang="{tag}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#000000">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; font-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'">
<title>{title}</title>
<meta name="description" content="{label['description']}">
<link rel="canonical" href="{canonical}">
{alternates()}
<meta property="og:type" content="website"><meta property="og:title" content="{title}">
<meta property="og:description" content="{label['description']}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{BASE}/fluid/assets/social.png">
<link rel="icon" href="/fluid/assets/icon.png">
<link rel="stylesheet" href="/fluid/assets/site.css">
</head><body class="localized-landing">
<a class="skip" href="#main">{label['skip']}</a>
<div class="wrap">
<header class="topbar">
<a class="wordmark" href="{route(tag)}"><img src="/fluid/assets/fluid.svg" width="66" height="40" alt="Fluid"></a>
<nav><a href="#get-fluid">{label['get']}</a></nav>
{switcher(tag)}
</header>
<main id="main">
<section class="hero">
<div class="hero-copy"><p class="eyebrow">Fluid · Dual N-Back</p>
<h1>{label['title']}</h1>
<p class="lede">{label['description']}</p>
<div class="actions"><a class="button primary" href="#get-fluid">{label['get']} <span aria-hidden="true">↓</span></a></div></div>
<div class="composition" aria-hidden="true">{original_svg}</div>
</section>
<div class="strip"><span>{label['practice']}</span><span>{label['position']}</span><span>{label['sound']}</span><span>{label['progress']}</span></div>
<section class="section" id="the-practice"><div class="section-head"><h2>{label['learn']}</h2><p>{label['learnIntro']}</p></div>
<div class="utility-links"><a href="/fluid/guide/" hreflang="en">{label['guide']} ({english})</a></div></section>
<section class="section" id="get-fluid"><div class="section-head"><h2>{label['get']}</h2></div>
<div class="platforms"><div class="platform"><div><h3>Steam</h3><p>macOS · Windows</p></div><span class="platform-status">{label['soon']}</span></div>
<div class="platform"><div><h3>App Store</h3><p>iPhone · iPad</p></div><span class="platform-status">{label['soon']}</span></div></div></section>
</main>
<footer><p>© 2026 Monitor Lizards</p><nav>{mixed_links}</nav></footer>
</div></body></html>
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = {}
    for page in ENGLISH_PAGES:
        path = FLUID / page / "index.html"
        html = path.read_text()
        if page == "":
            start = html.index('<div class="composition"')
            svg = re.search(r'<svg\b.*?</svg>', html[start:], re.S).group()
            html = replace_region(html, "fluid-alternate-links", alternates(), "</head>")
        html = replace_region(
            html, "fluid-language-switch", switcher("en", landing=not page), "</header>"
        )
        expected[path] = html
    for tag in COPY:
        if tag != "en":
            expected[FLUID / tag / "index.html"] = localized_page(tag, svg)
    for path, content in expected.items():
        if args.check:
            if not path.exists() or path.read_text() != content:
                parser.error(f"Out of date: {path.relative_to(ROOT)}")
        else:
            path.parent.mkdir(exist_ok=True)
            path.write_text(content)
    print(f"{len(COPY)} language options; {len(expected)} pages checked")


if __name__ == "__main__":
    main()
