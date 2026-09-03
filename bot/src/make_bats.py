b1 = """@echo off
chcp 65001 > nul
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

b2 = """@echo off
chcp 65001 > nul
title [편의점 알바곤] 유앤미24 웹앱 연동 발주 대기 봇

echo ========================================================
echo   [편의점 알바곤] 웹 앱 연동 유앤미 자동 발주 봇 실행
echo ========================================================
echo.
echo   [안내] 봇 서버가 켜졌습니다 (대기 중...)
echo   이제 사장님 폰이나 웹 브라우저(https://teelukira.github.io/alba-gon/)에서
echo   [유앤미24 자동 발주 시작] 버튼을 누르시면,
echo   이 PC에서 크롬 창이 자동으로 열리며 유앤미24에 실제 발주가 들어갑니다!
echo.
echo   ※ 이 검은 창을 닫지 마시고 최소화해두세요.
echo.

cd /d "%~dp0bot"
node src\\botServer.js

pause
"""

with open(r"C:\Users\teelu\orca\projects\alba-gon\1_유앤미_실제장바구니_확인.bat", "w", encoding="utf-8") as f:
    f.write(b1)

with open(r"C:\Users\teelu\orca\projects\alba-gon\2_웹앱연동_자동발주봇_실행.bat", "w", encoding="utf-8") as f:
    f.write(b2)

with open(r"C:\Users\teelu\orca\projects\alba-gon\유앤미_자동발주_시작.bat", "w", encoding="utf-8") as f:
    f.write(b1)

print("Batch files generated successfully!")
