@echo off
echo %DATE% %TIME% - Starting server
cd /d "d:\aaj\digital-desk-main (2)\digital-desk-main"
start /B cmd /c "npm run dev > storage\server.log 2>&1"

REM Wait for server
set /a waited=0
:check
curl.exe -s -o NUL --connect-timeout 2 http://localhost:3000 2>nul
if %ERRORLEVEL% NEQ 0 (
    timeout /t 1 /nobreak >nul
    set /a waited+=1
    if %waited% LSS 45 goto check
)
echo %TIME% - Server ready after %waited% seconds

REM Run conversion
echo %TIME% - Starting conversion
curl.exe -X POST -F "file=@c:\Users\Sumit kumar\Downloads\ViewDocument.pdf" http://localhost:3000/api/pdf/pdf-to-word -o storage\fixtures\ViewDocument_v4.docx --connect-timeout 5 --max-time 120

if exist storage\fixtures\ViewDocument_v4.docx (
    echo SUCCESS - File created
    for %%I in (storage\fixtures\ViewDocument_v4.docx) do echo Size: %%~zI bytes
) else (
    echo FAILED - File not created
)

REM Kill server
taskkill /F /IM node.exe /T 2>nul
echo %TIME% - Done
