@echo off
title Alpine Concierge Tirol - Lokaler Entwicklungsserver

set "PATH=C:\Tools\node\node-v24.18.0-win-x64;%PATH%"

cd /d C:\GitHub\AC-Homepage

echo.
echo ==========================================
echo   Alpine Concierge Tirol wird gestartet
echo ==========================================
echo.
echo Website: http://localhost:8080
echo Zum Beenden: Strg + C
echo.

start "" http://localhost:8080

npx.cmd serve . -l 8080

pause
