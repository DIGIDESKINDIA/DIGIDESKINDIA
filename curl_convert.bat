@echo off
cd /d "d:\aaj\digital-desk-main (2)\digital-desk-main"
curl.exe -X POST -F "file=@c:\Users\Sumit kumar\Downloads\ViewDocument.pdf" http://localhost:3000/api/pdf/pdf-to-word -o storage/fixtures/ViewDocument_v4.docx
echo Exit code: %ERRORLEVEL%
dir storage\fixtures\ViewDocument_v4.docx
