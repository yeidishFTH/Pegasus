"""Validate downloadable publisher review ZIPs without requiring external libraries."""
from pathlib import Path
import re
import subprocess
from zipfile import ZipFile

root = Path(__file__).resolve().parent
for slug in ("pulse-grid", "pulse-orbit"):
    archive = root / "downloads" / f"{slug}-review.zip"
    assert archive.is_file(), f"Missing {archive}"
    with ZipFile(archive) as bundle:
        bad = bundle.testzip()
        assert bad is None, f"CRC error in {archive}: {bad}"
        names = set(bundle.namelist())
        assert "index.html" in names and "REVIEW-README.txt" in names, names
        text = bundle.read("index.html").decode("utf-8")
    assert "<!doctype html>" in text.lower()
    assert "<canvas" in text, "Not a playable canvas build"
    assert "viewport" in text
    assert "license" not in text.lower() or "commercial" in text.lower()  # no claim of automatic license
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", text, flags=re.S | re.I)
    for script in scripts:
        if script.strip().startswith('{"@context"'):
            continue
        result = subprocess.run(["node", "--check", "-"], input=script,
                                text=True, capture_output=True, check=False)
        assert result.returncode == 0, f"{slug} failed JS syntax: {result.stderr[:2000]}"
    print(f"PASS {archive.name} ({archive.stat().st_size} bytes, {len(scripts)} inline scripts)")
print("Publisher ZIP review packages verified")
