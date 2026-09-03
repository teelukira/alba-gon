@echo off
chcp 949 >nul
title 알바곤 - 이번 66개 품목 정상가격으로 유앤미 담기
cd /d "%~dp0"

echo ========================================================
echo   [유앤미24] 66개 품목 정상 공급단가 포함 자동 담기
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
    ) else (
        echo [오류] Node.js 를 찾을 수 없습니다.
        pause
        exit /b 1
    )
)

node bot/src/order_66_direct.js

echo.
pause