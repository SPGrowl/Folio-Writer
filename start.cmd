@echo off
cd /d "%~dp0"

start "folio-service" cmd /k "cd /d "%~dp0service" && pnpm dev"
start "folio-web" cmd /k "cd /d "%~dp0" && pnpm dev"

echo 已分别打开后端与前端窗口。
pause