const { chromium } = require('playwright');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function captureCart() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // 로그인
  await page.goto('http://www.younme24.com/main.asp');
  await page.fill('input[name="userid"]', process.env.YOUNME_USER_ID);
  await page.fill('input[name="passwd"]', process.env.YOUNME_PASSWORD);
  await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);

  // 상온 발주 화면 진입
  await page.goto('http://www.younme24.com/app1/app.asp');
  await page.waitForTimeout(2000);

  // 스크린샷 저장
  const shotPath = path.join(__dirname, 'younme_cart_live_view.png');
  await page.screenshot({ path: shotPath });
  console.log('LIVE CART SCREENSHOT SAVED:', shotPath);

  await browser.close();
}

captureCart().catch(console.error);
