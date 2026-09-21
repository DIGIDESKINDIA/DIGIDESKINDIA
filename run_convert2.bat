@echo off
REM Kill all existing node processes
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

cd /d "d:\aaj\digital-desk-main (2)\digital-desk-main"

REM Start server in background and redirect output
start /B cmd /c "npm run dev > storage\server_start.log 2>&1"

REM Wait for server to be ready (poll for 30 seconds)
echo Waiting for server = %DATE% %TIME% > storage\convert_result.txt
set /a waited=0
:checkserver
curl.exe -s -o NUL --connect-timeout 2 http://localhost:3000 2>nul
if %ERRORLEVEL% NEQ 0 (
    timeout /t 1 /nobreak >nul
    set /a waited+=1
    if %waited% LSS 30 goto checkserver
)
echo Server responded after %waited% seconds >> storage\convert_result.txt

REM Run the conversion with a 120-second timeout
echo Starting conversion at %TIME% >> storage\convert_result.txt
curl.exe -X POST -F "file=@c:\Users\Sumit kumar\Downloads\ViewDocument.pdf" http://localhost:3000/api/pdf/pdf-to-word -o storage\fixtures\ViewDocument_v4.docx --connect-timeout 5 --max-time 120
echo Conversion curl exit code: %ERRORLEVEL% >> storage\convert_result.txt
echo Finished conversion at %TIME% >> storage\convert_result.txt

REM Check result
if exist storage\fixtures\ViewDocument_v4.docx (
    echo SUCCESS - File created >> storage\convert_result.txt
    for %%I in (storage\fixtures\ViewDocument_v4.docx) do echo Size: %%~zI bytes >> storage\convert_result.txt
) else (
    echo FAILED - File not created >> storage\convert_result.txt
)

REM Kill the server
taskkill /F /IM node.exe /T 2>nul

end
