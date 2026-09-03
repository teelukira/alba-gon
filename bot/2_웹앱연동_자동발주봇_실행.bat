@echo off
chcp 949 > nul
title [편의점 알바곤] 클라우드 실시간 자동 발주 봇

:: Node.js 기본 설치 경로 자동 감지 (재부팅 없이 바로 실행 지원)
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\node" set "PATH=%LocalAppData%\Programs\node;%PATH%"

echo ========================================================
echo   [편의점 알바곤] 유앤미24 클라우드 실시간 발주 봇
echo ========================================================
echo.
echo   [안내] 전 세계 어디서든 스마트폰으로 [발주 시작]을 누르면
echo   이 PC가 실시간으로 신호를 받아 유앤미24에 자동 발주합니다!
echo.
echo   - 알바 공용폰 (LTE/와이파이 무관)
echo   - 사장님 폰 (집, 이동 중 어디서든)
echo   - 타지역 친구 폰에서도 즉시 주문 연동!
echo.
echo   ※ 이 검은 창을 닫지 마시고 아래로 내려두세요 (최소화).
echo ========================================================
echo.

where node > nul 2>&1
if %errorlevel% neq 0 (
    echo [오류] Node.js를 찾을 수 없습니다!
    echo 먼저 '[처음한번만실행]프로그램설치.bat'을 실행해주시거나
    echo 컴퓨터를 한 번 재부팅해주세요.
    echo.
    pause
    exit /b
)

cd /d "%~dp0bot"
node src\relayBot.js

echo.
pause