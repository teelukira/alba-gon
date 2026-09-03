const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { chromium } = require('playwright');

async function inspectOrder() {
  console.log('>>> [실물 기능 테스트] 유앤미24 로그인 및 주문 폼 정밀 분석');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. 로그인
  console.log('1. 로그인 시도...');
  await page.goto('http://www.younme24.com/main.asp', { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="userid"]', process.env.YOUNME_USER_ID);
  await page.fill('input[name="passwd"]', process.env.YOUNME_PASSWORD);
  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  console.log('   현재 URL:', page.url());

  // 2. 상온 주문 페이지 이동
  console.log('2. 상온 페이지(/app1/app.asp) 이동...');
  await page.goto('http://www.younme24.com/app1/app.asp', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 검색창 분석
  const inputs = await page.$$eval('input', els => els.map(e => ({ name: e.name, type: e.type, id: e.id, placeholder: e.placeholder })));
  console.log('   상온 페이지 입력창 목록:', inputs.filter(i => i.type !== 'hidden'));

  // 검색 폼 이름 확인
  const forms = await page.$$eval('form', fs => fs.map(f => ({ name: f.name, action: f.action, method: f.method })));
  console.log('   상온 페이지 폼 목록:', forms);

  // 스크린샷 저장
  const shotPath = path.join(__dirname, 'app1_screenshot.png');
  await page.screenshot({ path: shotPath });
  console.log('   상온 페이지 스크린샷 저장:', shotPath);

  await browser.close();
}

inspectOrder().catch(console.error);
