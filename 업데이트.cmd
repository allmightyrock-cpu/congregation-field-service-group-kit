@echo off
rem ------------------------------------------------------------
rem  Field Service Group Kit - Update launcher (Windows)
rem  Downloads the latest kit from GitHub, replaces program files
rem  only (your settings, keys and data are kept), then opens the
rem  installer screen so you can redeploy with one click.
rem ------------------------------------------------------------
chcp 65001 >nul
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\bootstrap.ps1" -Update %*
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo  [업데이트] 종료 코드 %RC% - 위 안내를 확인한 뒤 이 파일을 다시 실행하세요.
  pause
)
endlocal
