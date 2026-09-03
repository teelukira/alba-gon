@echo off
chcp 949 > nul
title [편의점 알바곤] 1분 자동 설치 도우미

:: Node.js 기본 설치 경로 자동 감지 (재부팅 없이 바로 실행 지원)
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\node" set "PATH=%LocalAppData%\Programs\node;%PATH%"

echo ========================================================
echo   [편의점 알바곤] 유앤미24 자동 발주 프로그램 설치
echo ========================================================
echo.
echo   [1단계] 컴퓨터에 필수 프로그램(Node.js)이 있는지 검사합니다...
echo.

node -v > nul 2>&1
if %errorlevel% neq 0 (
    echo [알림] Node.js 가 아직 설치되지 않았습니다!
    echo.
    echo 웹 브라우저가 열리면 초록색 [LTS 버전] 버튼을 눌러 다운받으신 뒤,
    echo 설치 창에서 'Next'만 계속 누르고 설치를 완료해주세요.
    echo (설치 후 재부팅 없이 바로 이 창을 다시 실행하시면 됩니다)
    echo.
    start https://nodejs.org/ko
    pause
    exit /b
)

echo [성공] Node.js 정상 설치 확인 완료!
echo.
echo [2단계] 발주 프로그램에 필요한 필수 부품들을 설치합니다...
echo (인터넷 속도에 따라 약 10초~30초 소요됩니다)
echo.

cd /d "%~dp0bot"
call npm install --no-audit --no-fund

echo.
echo [3단계] 유앤미24 계정 설정 파일(.env)을 확인합니다...
echo.

cd /d "%~dp0"
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" > nul
    ) else (
        echo YOUNME_USER_ID=1060 > .env
        echo YOUNME_PASSWORD=여기에_유앤미비밀번호_입력 >> .env
    )
)

echo --------------------------------------------------------
echo ★ 중요: 화면에 메모장 창이 열렸습니다!
echo   1) 아이디(YOUNME_USER_ID) 확인
echo   2) 비밀번호(YOUNME_PASSWORD) 입력
echo   3) 저장(Ctrl + S) 후 메모장을 닫아주세요!
echo --------------------------------------------------------
echo.
start notepad "%~dp0.env"

echo ========================================================
echo   모든 설치와 준비가 완료되었습니다!
echo ========================================================
echo.
echo   [앞으로 사용 방법]
echo   1. 컴퓨터 켜실 때 '2_웹앱연동_자동발주봇_실행.bat' 을 더블클릭해두세요.
echo   2. 스마트폰으로 https://teelukira.github.io/alba-gon/ 에 접속해서
echo      [유앤미24 자동 발주 시작] 버튼을 누르시면 됩니다!
echo.
pause