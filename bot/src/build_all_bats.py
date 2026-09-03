# -*- coding: utf-8 -*-
import os

b_installer = """@echo off
chcp 949 > nul
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
"""

b_relay = """@echo off
chcp 949 > nul
title [편의점 알바곤] 클라우드 실시간 자동 발주 봇

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

cd /d "%~dp0bot"
node src\\relayBot.js

echo.
pause
"""

b_cart = """@echo off
chcp 949 > nul
title [편의점 알바곤] 유앤미24 실제 장바구니 확인

echo ========================================================
echo   [편의점 알바곤] 유앤미24 로그인 및 장바구니 열기
echo ========================================================
echo.
echo   크롬 브라우저를 실행하여 유앤미24에 로그인하고
echo   현재 장바구니 화면을 화면에 띄웁니다...
echo.

cd /d "%~dp0bot"
node src\\runOrderDirect.js

echo.
echo ========================================================
echo   확인이 완료되었습니다. 창을 닫으려면 아무 키나 누르세요.
echo ========================================================
pause
"""

root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

targets = [
    (os.path.join(root, '[처음한번만실행]프로그램설치.bat'), b_installer),
    (os.path.join(root, '유앤미_자동발주_시작.bat'), b_installer),
    (os.path.join(root, '2_웹앱연동_자동발주봇_실행.bat'), b_relay),
    (os.path.join(root, '1_유앤미_실제장바구니_확인.bat'), b_cart),
]

for path, content in targets:
    with open(path, 'wb') as f:
        f.write(content.encode('cp949'))
    print(f"CP949 encoded: {os.path.basename(path)}")

print("All batch files rewritten with flawless CP949!")
