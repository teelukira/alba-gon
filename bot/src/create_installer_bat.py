b_install = """@echo off
chcp 65001 > nul
title [편의점 알바곤] 1분 자동 설치 도우미

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
    echo 설치 창에서 'Next'만 계속 누르고 컴퓨터를 한 번 껐다 켜주세요.
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
echo [3단계] 유앤미24 계정 설정 파일(.env)을 점검합니다...

cd /d "%~dp0"
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" > nul
    ) else (
        echo YOUNME_USER_ID=1060 > .env
        echo YOUNME_PASSWORD=여기에_유앤미비밀번호_입력 >> .env
    )
    echo.
    echo --------------------------------------------------------
    echo ★ 중요: 메모장 창이 열리면 유앤미 비밀번호를 입력하고 저장해주세요!
    echo --------------------------------------------------------
    notepad .env
) else (
    echo [성공] 계정 설정 파일(.env)이 이미 존재합니다.
)

echo.
echo ========================================================
echo   🎉 모든 설치와 준비가 완료되었습니다!
echo ========================================================
echo.
echo   [앞으로 사용 방법]
echo   1. 컴퓨터 켜실 때 '2_웹앱연동_자동발주봇_실행.bat' 을 더블클릭해두세요.
echo   2. 스마트폰으로 https://teelukira.github.io/alba-gon/ 에 접속해서
echo      [유앤미24 자동 발주 시작] 버튼을 누르시면 됩니다!
echo.
pause
"""

with open(r"C:\Users\teelu\orca\projects\alba-gon\[처음한번만실행]프로그램설치.bat", "w", encoding="cp949", errors="replace") as f:
    f.write(b_install)

print("Created [처음한번만실행]프로그램설치.bat!")
