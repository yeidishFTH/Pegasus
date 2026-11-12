#!/usr/bin/env python3
"""Build a strictly scoped, reproducible Playgama review ZIP.

The ZIP contains only the isolated PULSE GRID distributor game and its bundled
sounds. Never package Pegasus root files, RE:GENESIS, credentials, or rights not
owned by the project. Packaging is not a submission or distribution license.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

HERE = Path(__file__).resolve().parent
TRACKS = (
    "bong_001", "click_002", "confirmation_001", "error_004",
    "maximize_003", "minimize_004", "music-loop",
)
FILES = (
    "index.html", "game.js", "playgama-bridge-config.json",
    *(f"audio/{track}.{extension}" for track in TRACKS for extension in ("ogg", "mp3")),
)
OUTPUT = HERE / "dist" / "PULSE_GRID_Playgama_review.zip"
MAX_SIZE = 300 * 1024 * 1024


def validate() -> None:
    for name in FILES:
        if not re.fullmatch(r"[A-Za-z0-9_./-]+", name) or ".." in Path(name).parts:
            raise ValueError(f"Unsafe archive filename: {name}")
        item = HERE / name
        if not item.is_file() or item.is_symlink():
            raise FileNotFoundError(f"Missing or unsafe game asset: {name}")

    html = (HERE / "index.html").read_text(encoding="utf-8")
    game = (HERE / "game.js").read_text(encoding="utf-8")
    cfg = json.loads((HERE / "playgama-bridge-config.json").read_text(encoding="utf-8"))
    if not isinstance(cfg, dict) or "advertisement" not in cfg:
        raise ValueError("Missing Playgama advertising configuration")
    if '<script src="https://bridge.playgama.com/' not in html:
        raise ValueError("Playgama Bridge must load before gameplay")
    if not all(token in html for token in ("bridge.initialize()", "game.js")):
        raise ValueError("Playgama bootstrap is incomplete")

    # No hidden outward payment, tracking, or third-party resource references.
    references = html + "\n" + game
    disallowed = (
        "paypal", "ko-fi", "stripe.com", "license-order.html",
        "google-analytics", "googletagmanager", "onrender.com",
        "localStorage", "sessionStorage",
    )
    for value in disallowed:
        if value.lower() in references.lower():
            raise ValueError(f"Distributor build references restricted resource: {value}")
    unexpected_urls = references.replace('https://bridge.playgama.com/v2/stable/playgama-bridge.js', '')
    if 'https://' in unexpected_urls or 'http://' in unexpected_urls:
        raise ValueError("Distributor build references offsite URL(s)")
    if sum((HERE / name).stat().st_size for name in FILES) > MAX_SIZE:
        raise ValueError("Playgama archive exceeds the 300 MB size limit")


def build() -> None:
    validate()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUTPUT, "w", compression=ZIP_DEFLATED, compresslevel=9) as zipfile:
        for name in FILES:
            entry = ZipInfo(name, date_time=(2026, 11, 12, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            zipfile.writestr(entry, (HERE / name).read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)

    with ZipFile(OUTPUT) as archive:
        actual = archive.namelist()
        if actual != list(FILES) or archive.testzip() is not None:
            raise ValueError("ZIP content/integrity validation failed")
    digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
    print(json.dumps({
        "status": "PACKAGED_ONLY_NOT_SUBMITTED",
        "path": str(OUTPUT.relative_to(HERE)),
        "files": len(FILES),
        "bytes": OUTPUT.stat().st_size,
        "sha256": digest,
    }, ensure_ascii=False))


if __name__ == "__main__":
    try:
        build()
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        print(f"Package verification failed: {exc}", file=sys.stderr)
        sys.exit(1)
