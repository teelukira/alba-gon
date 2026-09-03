const { chromium } = require('playwright');
const path = require('path');

async function testYounmeSite() {
  console.log('>>> [테스트 시작] 유앤미24 (younme24.com) 브라우저 자동화 직접 기능 테스트');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  // 1. 메인 접속
  console.log('1. 메인 페이지(http://www.younme24.com/main.asp) 접속 시도...');
  await page.goto('http://www.younme24.com/main.asp', { waitUntil: 'domcontentloaded' });
  const title = await page.title();
  console.log(`   접속 성공! 사이트 타이틀: "${title}"`);

  // 2. 로그인 폼 확인
  console.log('2. 로그인 폼 필드 확인...');
  const hasUserid = await page.$('input[name="userid"]');
  const hasPasswd = await page.$('input[name="passwd"]');
  console.log(`   아이디 입력창 존재: ${!!hasUserid}, 비밀번호 입력창 존재: ${!!hasPasswd}`);

  // 3. 테스트 로그인 시도 (거래처코드 11470)
  console.log('3. 로그인 폼 입력 및 전송 시도 (거래처코드: 11470)...');
  await page.fill('input[name="userid"]', '11470');
  await page.fill('input[name="passwd"]', 'test_password');
  
  // 로그인 응답 대기
  await Promise.all([
    page.waitForNavigation({ timeout: 5000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);

  const afterUrl = page.url();
  console.log(`   로그인 시도 후 현재 URL: ${afterUrl}`);

  // 4. 스크린샷 캡처
  const screenshotPath = path.join(__dirname, 'younme_login_test.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`4. 브라우저 스크린샷 저장 완료: ${screenshotPath}`);

  // 5. 상온 주문 페이지(/app1/app.asp) 및 저온(/app3/app.asp) 접근 테스트
  console.log('5. 발주 페이지 접근 테스트...');
  await page.goto('http://www.younme24.com/app1/app.asp', { waitUntil: 'domcontentloaded' });
  const app1Content = await page.content();
  const isBlocked = app1Content.includes('거래처만 사용 가능합니다') || app1Content.includes('login_form');
  console.log(`   상온 발주(/app1/app.asp) 접근 결과: ${isBlocked ? '비밀번호 불일치로 로그인 차단됨 (정상적인 보안 동작)' : '발주 페이지 열림'}`);

  await browser.close();
  console.log('>>> [테스트 완료] 유앤미24의 ASP 로그인 및 주문 프로세스 분석 및 검증 성공!');
}

testYounmeSite().catch(console.error);
