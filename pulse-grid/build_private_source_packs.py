#!/usr/bin/env python3
"""Build isolated, private PULSE game-source review packages.

Run:
    python3 pulse-grid/build_private_source_packs.py --self-test
    python3 pulse-grid/build_private_source_packs.py --output ~/pulse-private-delivery

The command never uploads, emails, licenses, or sells a package. It deliberately
does not copy the historical Pegasus repository, unrelated games, or assets
whose inclusion has not been separately approved.
"""
import argparse
import hashlib
import json
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
TITLES = {
    "pulse-grid": ("PULSE GRID", "index.html"),
    "pulse-orbit": ("PULSE ORBIT", "orbit.html"),
}
ALLOWED_ARCHIVE_FILES = {"index.html", "MANIFEST.json", "SOURCE-REVIEW-NOTICE.txt"}

NOTICE = """PRIVATE SOURCE REVIEW — NOT A LICENSE OR PURCHASE RECEIPT

This archive is an isolated source snapshot for the named PULSE game only.
It is not the full Pegasus repository and contains no unrelated projects,
accounts, infrastructure, or secrets. It is not a transfer of exclusive IP.

No permission to distribute, host commercially, rebrand, monetize, or resell
is granted by possession of this archive. Exact files, lawful rights,
allowed modifications, territory, term, pricing, support and delivery must
be agreed in writing. Provide any final deliverables only after verifying
the agreed payment directly with the payment provider.

Important disclosures:
* Development was substantially AI-assisted; some source was public before
  any prospective transaction. Do not promise exclusive ownership.
* This is the original public HTML source snapshot, NOT a publisher SDK build
  or a cleared/white-label version. It can contain external navigation,
  seller-specific payment or social links, and references to assets outside
  this package. Remove/replace those before commercial deployment under an
  approved written agreement.
* No third-party artwork, account, domain, or repository-wide rights are
  included by implication. Independently review provenance before granting
  rights to additional assets or delivering a customized version.
"""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def add_bytes(zf: ZipFile, name: str, data: bytes) -> None:
    entry = ZipInfo(name, (2026, 11, 10, 0, 0, 0))
    entry.compress_type = ZIP_DEFLATED
    entry.external_attr = 0o100644 << 16
    zf.writestr(entry, data)


def create_pack(slug: str, dest: Path) -> Path:
    title, filename = TITLES[slug]
    source_file = (HERE / filename).resolve(strict=True)
    if source_file.parent != HERE:
        raise RuntimeError("Source path escaped the PULSE-only directory")
    source = source_file.read_bytes()
    if b"<!doctype html>" not in source.lower() or b"<canvas" not in source.lower():
        raise RuntimeError(f"Not a standalone HTML5 Canvas source: {filename}")
    if len(source) < 3000:
        raise RuntimeError(f"Suspiciously short source: {filename}")

    manifest = {
        "title": title,
        "source_path": f"pulse-grid/{filename}",
        "source_sha256": sha256(source),
        "source_size_bytes": len(source),
        "rights_status": "review_only; written agreement and verified payment required",
        "development_disclosure": "substantially AI-assisted; previously publicly available",
        "scope": "one game only; excludes unrelated repository files and projects",
    }
    destination = dest / f"{slug}-source-private.zip"
    with ZipFile(destination, "w") as zf:
        add_bytes(zf, "index.html", source)
        add_bytes(zf, "MANIFEST.json", (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode())
        add_bytes(zf, "SOURCE-REVIEW-NOTICE.txt", NOTICE.encode())

    with ZipFile(destination) as zf:
        if zf.testzip() is not None:
            raise RuntimeError("ZIP CRC validation failed")
        if set(zf.namelist()) != ALLOWED_ARCHIVE_FILES:
            raise RuntimeError("Unexpected file included in private package")
        got = json.loads(zf.read("MANIFEST.json"))
        if got["source_sha256"] != sha256(zf.read("index.html")):
            raise RuntimeError("Source checksum mismatch")
        if got["source_path"] != f"pulse-grid/{filename}":
            raise RuntimeError("Unexpected original source path")
        if "RE:GENESIS" in " ".join(zf.namelist()).upper():
            raise RuntimeError("Unrelated game included")
    return destination


def build(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    for slug in TITLES:
        path = create_pack(slug, dest)
        print(f"PASS {path.name} | {path.stat().st_size} bytes | SHA256 {sha256(path.read_bytes())}")
    print("Private source packages created; NO licenses issued or files sent.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true", help="validate packages in a temporary directory, then delete")
    group.add_argument("--output", type=Path, help="write private ZIPs outside the GitHub checkout")
    args = parser.parse_args()
    if args.self_test:
        with tempfile.TemporaryDirectory(prefix="pulse-license-check-") as tmp:
            build(Path(tmp))
        print("PASS self-test; temporary packages deleted")
        return

    output = args.output.expanduser().resolve()
    # Never place unapproved private source-delivery ZIPs in the public website
    # tree or anywhere else in the potentially public Git repository.
    if output == REPO or REPO in output.parents:
        parser.error("--output must be OUTSIDE the entire Git checkout")
    build(output)


if __name__ == "__main__":
    main()
