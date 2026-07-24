@echo off
set REMINDER_SCHEDULER_ENABLED=false
cd /d "%~dp0..\backend"
node src\server.js
