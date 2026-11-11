@echo off
cd /d "%~dp0"
node server\main.js
if errorlevel 1 pause
