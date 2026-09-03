import urllib.request
import urllib.parse
import re

url = 'http://www.younme24.com/member/login.asp'
data = urllib.parse.urlencode({'home': 'y', 'userid': 'test1234', 'passwd': 'wrongpassword'}).encode('euc-kr')
req = urllib.request.Request(url, data=data, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'http://www.younme24.com/main.asp',
    'Content-Type': 'application/x-www-form-urlencoded'
})
resp = urllib.request.urlopen(req)
html = resp.read().decode('euc-kr', errors='replace')
for line in html.split('\n'):
    if 'alert' in line or 'history' in line or 'location' in line:
        print('JS Action:', line.strip())
