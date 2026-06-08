@echo off
cd /d "C:\Users\kimij\OneDrive\ƒhƒLƒ…ƒƒ“ƒg\00_ClaudeCode\howto-v2"
git add .
git commit -m "save"
git push
if errorlevel 1 goto error
echo Done.
goto end
:error
echo Failed.
:end
pause