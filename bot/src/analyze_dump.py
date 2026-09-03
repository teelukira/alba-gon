import re

with open(r'C:\Users\teelu\orca\projects\alba-gon\bot\src\app1_dump.html', 'r', encoding='utf-8') as f:
    html = f.read()

print('--- Links ---')
for m in re.finditer(r'<a[^>]*href=["\']?([^"\'>\s]+)[^>]*>(.*?)</a>', html, re.DOTALL):
    url = m.group(1)
    text = re.sub(r'<[^>]+>', '', m.group(2)).strip()
    if url.startswith('javascript') or 'app' in url or 'shop' in url or 'order' in url:
        print(f'{text} --> {url}')

print('--- IFrames ---')
for m in re.finditer(r'<iframe[^>]*src=["\']?([^"\'>\s]+)', html):
    print('iframe:', m.group(1))

print('--- Left menu categories ---')
left = re.findall(r'<div class=["\']leftNav["\']>[\s\S]*?</div>', html)
if left:
    print(left[0][:1500])

