import urllib.request, urllib.parse, http.cookiejar, re

env_path = r'C:\Users\teelu\orca\projects\alba-gon\.env'
env = {}
with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k.strip()] = v.strip()

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# 1. 로그인
login_data = urllib.parse.urlencode({'home': 'y', 'userid': env['YOUNME_USER_ID'], 'passwd': env['YOUNME_PASSWORD']}).encode('euc-kr')
opener.open('http://www.younme24.com/member/login.asp', login_data)

# 2. 현재 배송일자 가져오기 (app1/app.asp 에서 order_date 추출)
app_html = opener.open('http://www.younme24.com/app1/app.asp').read().decode('euc-kr', errors='replace')
m_date = re.search(r'name=[\"\']order_date[\"\']\s+value=[\"\'](\d+)[\"\']', app_html)
order_date = m_date.group(1) if m_date else '20260905'
print(f'📅 유앤미24 현재 발주 적용 일자: {order_date}')

# 3. 신라면 큰사발(8801043017022, 16개 박스단위) 장바구니 담기(orderAdd.asp) 테스트 호출
pcode = '8801043017022'
pname = '농]신라면큰사발113g'
qty = '16'
price = '1463'

order_add_url = (
    f'http://www.younme24.com/app1/orderAdd.asp?'
    f'order_dev=j&dev=&order_type=1&pcode={pcode}&quantity={qty}&unit=EA&price={price}&'
    f'order_date={order_date}&product_name={urllib.parse.quote(pname.encode("euc-kr"))}&valid=y'
)
print('🛒 장바구니 담기 요청 전송:', order_add_url)
resp_add = opener.open(order_add_url)
print('   응답 코드:', resp_add.status)

# 4. 장바구니 뷰(orderView.asp) 조회하여 진짜 담겼는지 확인
cart_url = f'http://www.younme24.com/app1/orderView.asp?order_date={order_date}&order_dev=j&order_type=1'
cart_html = opener.open(cart_url).read().decode('euc-kr', errors='replace')

print('\n================ [유앤미24 실제 장바구니 조회 결과] ================')
rows = re.findall(r'<tr[^>]*>[\s\S]*?</tr>', cart_html)
cart_items = []
for r in rows:
    if '신라면' in r or pcode in r or 'EA' in r:
        clean = re.sub(r'<[^>]+>', ' ', r).strip()
        clean = re.sub(r'\s+', ' ', clean)
        if clean and len(clean) > 5:
            cart_items.append(clean)

if cart_items:
    print('🎉 성공! 유앤미24 실제 장바구니에 상품이 정상적으로 담겼습니다!')
    for item in cart_items:
        print('  ▶', item)
else:
    print('장바구니 테이블 원문 추출:')
    for r in rows[5:15]:
        clean = re.sub(r'<[^>]+>', ' ', r).strip()
        if clean:
            print('  ▶', clean[:100])

