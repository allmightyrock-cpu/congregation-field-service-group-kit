@echo off
rem ------------------------------------------------------------
rem  Field Service Group Kit - Installer launcher (Windows)
rem  Double-click this file. It prepares the runtime on first run
rem  (portable Node + tools, downloaded once) and opens the
rem  installer screen in your browser. Safe to run again.
rem ------------------------------------------------------------
chcp 65001 >nul
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\bootstrap.ps1" %*
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo  [설치 도우미] 종료 코드 %RC% - 위 안내를 확인한 뒤 이 파일을 다시 실행하세요.
  pause
)
endlocal
