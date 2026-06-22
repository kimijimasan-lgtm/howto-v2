@echo off
chcp 65001 >nul

:: ブラウザでClaude.aiを開く
start "" "https://claude.ai"

:: 少し待ってからコマンドプロンプトでclaudeを起動
timeout /t 2 /nobreak >nul
start "Claude Code" cmd /k "cd /d "C:\Users\kimij\OneDrive\ドキュメント\00_ClaudeCode\howto-v2" && claude"

:: ウィンドウが起動するまで待機
timeout /t 3 /nobreak >nul

:: PowerShellでウィンドウを左右に並べる
powershell -ExecutionPolicy Bypass -Command ^
"Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport(\"user32.dll\")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport(\"user32.dll\")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport(\"user32.dll\")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport(\"user32.dll\")] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
    [DllImport(\"user32.dll\")] public static extern bool IsWindowVisible(IntPtr hWnd);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
}
'@; ^
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea; ^
$halfW = [int]($screen.Width / 2); ^
$cmdHwnd = $null; ^
$browserHwnd = $null; ^
[WinAPI]::EnumWindows({ param($h,$l); ^
    $sb = New-Object System.Text.StringBuilder 256; ^
    [WinAPI]::GetWindowText($h, $sb, 256) | Out-Null; ^
    $t = $sb.ToString(); ^
    if ([WinAPI]::IsWindowVisible($h)) { ^
        if ($t -like '*Claude Code*') { $script:cmdHwnd = $h }; ^
        if ($t -like '*Claude*' -and $t -notlike '*Claude Code*' -and ($t -like '*Edge*' -or $t -like '*Chrome*' -or $t -like '*Firefox*')) { $script:browserHwnd = $h } ^
    }; ^
    $true ^
}, [IntPtr]::Zero) | Out-Null; ^
if ($cmdHwnd) { [WinAPI]::SetWindowPos($cmdHwnd, [IntPtr]::Zero, 0, 0, $halfW, $screen.Height, 0x0040) }; ^
if ($browserHwnd) { [WinAPI]::SetWindowPos($browserHwnd, [IntPtr]::Zero, $halfW, 0, $halfW, $screen.Height, 0x0040) }"

exit
