@echo off
cd /d "%~dp0..\frontend"
"C:\Program Files\nodejs\node.exe" "node_modules\next\dist\bin\next" dev -p 3000 > dev-server.cmd.log 2>&1
