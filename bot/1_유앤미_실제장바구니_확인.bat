@echo off
chcp 949 > nul
title [편의점 알바곤] 유앤미24 실제 장바구니 확인

:: Node.js 기본 설치 경로 자동 감지 (재부팅 없이 바로 실행 지원)
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\node" set "PATH=%LocalAppData%\Programs\node;%PATH%"

echo ========================================================
echo   [편의점 알바곤] 유앤미24 로그인 및 장바구니 열기
echo ========================================================
echo.
echo   크롬 브라우저를 실행하여 유앤미24에 로그인하고
echo   현재 장바구니 화면을 화면에 띄웁니다...
echo.

where node > nul 2>&1
if %errorlevel% neq 0 (
    echo [오류] Node.js를 찾을 수 없습니다!
    echo 먼저 '[처음한번만실행]프로그램설치.bat'을 실행해주세요.
    echo.
    pause
    exit /b
)

cd /d "%~dp0bot"
node src\runOrderDirect.js

echo.
echo ========================================================
echo   확인이 완료되었습니다. 창을 닫으려면 아무 키나 누르세요.
echo ========================================================
pause