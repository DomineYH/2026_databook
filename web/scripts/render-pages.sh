#!/usr/bin/env bash
# Renders every 쪽 of the 자료집 PDF to public/pages/NNN.webp (ADR 0001). Needs poppler-utils + webp.
set -euo pipefail
cd "$(dirname "$0")/.."
PDF="../data_book/공유 및 제출용.pdf"
OUT=public/pages
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"
pdftoppm -scale-to-x 1600 -scale-to-y -1 -png "$PDF" "$TMP/p"
for f in "$TMP"/p-*.png; do
  n=$(basename "$f" .png); n=$((10#${n#p-}))
  cwebp -quiet -q 80 "$f" -o "$OUT/$(printf %03d "$n").webp"
done
ls "$OUT" | wc -l
# 공유 미리보기 카드: 표지 윗부분(제목)을 1200x630으로
pdftoppm -f 1 -l 1 -scale-to-x 1200 -scale-to-y -1 -x 0 -y 120 -W 1200 -H 630 -jpeg -jpegopt quality=85 -singlefile "$PDF" public/og
