import urllib.request, urllib.parse, http.cookiejar, re, os

# .env 읽기
env_path = r'C:\Users\teelu\orca\projects\alba-gon\.env'
env = {}
with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

user_id = env.get('YOUNME_USER_ID', '1060')
user_pw = env.get('YOUNME_PASSWORD', '')

print(f'Using User ID: {user_id}')

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# 1. 로그인
login_url = 'http://www.younme24.com/member/login.asp'
post_data = urllib.parse.urlencode({'home': 'y', 'userid': user_id, 'passwd': user_pw}).encode('euc-kr')
req = urllib.request.Request(login_url, data=post_data, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'http://www.younme24.com/main.asp',
    'Content-Type': 'application/x-www-form-urlencoded'
})
resp = opener.open(req)
print('Login HTTP status:', resp.status)

# 2. 상온 발주 페이지 진입
app1_url = 'http://www.younme24.com/app1/app.asp'
req2 = urllib.request.Request(app1_url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'http://www.younme24.com/'
})
resp2 = opener.open(req2)
html2 = resp2.read().decode('euc-kr', errors='replace')

print('--- app1/app.asp forms and search inputs ---')
for form in re.findall(r'<form[^>]*>[\s\S]*?</form>', html2):
    if 'search' in form.lower() or 'keyword' in form.lower() or 'word' in form.lower() or 'form1' in form.lower():
        # extract inputs
        inputs = re.findall(r'<input[^>]*>', form)
        form_tag = re.findall(r'<form[^>]*>', form)[0]
        print('Form tag:', form_tag)
        for inp in inputs:
            print('  Input:', inp)

