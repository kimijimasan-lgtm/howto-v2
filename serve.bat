@echo off
cd /d "C:\Users\kimij\OneDrive\ƒhƒLƒ…ƒƒ“ƒg\00_ClaudeCode\howto-v2"
echo Server starting...
echo Access from iPhone: http://192.168.68.54:8080
echo Note: Firebase login does not work on local IP (HTTP only).
echo Press Ctrl+C to stop.
python -m http.server 8080