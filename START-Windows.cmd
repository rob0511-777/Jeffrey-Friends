@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 goto missing
where npm.cmd >nul 2>&1
if errorlevel 1 goto missing
if not exist "node_modules\electron\dist\electron.exe" (
  echo Beim ersten Start wird Electron heruntergeladen.
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 goto failed
)
call npm.cmd start
if errorlevel 1 goto failed
exit /b 0
:missing
echo Bitte zuerst Node.js LTS von https://nodejs.org installieren.
echo Danach diese Datei erneut starten.
pause
exit /b 1
:failed
echo Der Start wurde abgebrochen. Die Fehlermeldung steht weiter oben.
pause
exit /b 1
