@echo off
cd /d "%~dp0"
echo Server starting in %CD%
echo Open: http://localhost:8080
echo Note: Firebase login does not work on local IP (HTTP only).
echo Press Ctrl+C to stop.
python -m http.server 8080
