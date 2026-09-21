@echo off
taskkill /F /IM node.exe /T 2>nul
timeout /t 3 /nobreak >nul
echo Done
