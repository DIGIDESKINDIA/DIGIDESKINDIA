@echo off
pushd "d:\aaj\digital-desk-main (2)\digital-desk-main"

echo === Analyzing ViewDocument_v4.docx (current output) ===
npx tsx scripts/analyze-docx-format.mjs storage\fixtures\ViewDocument_v4.docx

echo.
echo === Analyzing ViewDocument_pdfgear.docx (golden reference) ===
npx tsx scripts/analyze-docx-format.mjs storage\fixtures\ViewDocument_pdfgear.docx

popd
