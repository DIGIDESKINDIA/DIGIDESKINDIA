@echo off
echo Killing existing node processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 3 /nobreak >nul

echo Starting dev server...
cd /d "d:\aaj\digital-desk-main (2)\digital-desk-main"

:: Start server in background
start /B cmd /c "npm run dev"

:: Wait for server to be ready
echo Waiting for server to start (max 30 seconds)...
set /a count=0
:waitloop
set /a count+=1
curl.exe -s -o NUL -w "%%{http_code}" http://localhost:3000 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    timeout /t 1 /nobreak >nul 2>&1
    if %count% LSS 30 (
        goto waitloop
    )
)
echo Server should be ready

:: Run the conversion
echo Running PDF conversion...
curl.exe -X POST -F "file=@c:\Users\Sumit kumar\Downloads\ViewDocument.pdf" http://localhost:3000/api/pdf/pdf-to-word -o storage\fixtures\ViewDocument_v4.docx --connect-timeout 60 --max-time 120
echo Conversion exit code: %ERRORLEVEL%

:: Check output
if exist storage\fixtures\ViewDocument_v4.docx (
    echo SUCCESS - File created
    for %I in (storage\fixtures\ViewDocument_v4.docx) do @echo Size: %~zI bytes
) else (
    echo FAILED - File not created
)

:: Kill the server
taskkill /F /IM node.exe /T 2>nul

end
