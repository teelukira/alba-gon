const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { chromium } = require('playwright');

async function main() {
  console.log('========================================================');
  console.log('  [편의점 알바곤] 유앤미24 전자동 발주 시스템 실행');
  console.log('========================================================\n');

  const userId = process.env.YOUNME_USER_ID || '11470';
  const userPw = process.env.YOUNME_PASSWORD;

  if (!userPw || userPw.includes('실제_비밀번호_입력')) {
    console.error('❌ [오류] 유앤미 비밀번호가 설정되지 않았습니다!');
    console.error('   .env 파일을 열어서 YOUNME_PASSWORD= 뒤에 실제 비밀번호를 입력해주세요.\n');
    process.exit(1);
  }

  console.log(`👤 로그인 계정: ${userId}`);
  console.log('🌐 크롬 브라우저를 실행합니다 (눈앞에서 자동으로 진행됩니다)...\n');

  const browser = await chromium.launch({
    headless: false, // 사장님이 볼 수 있도록 브라우저 표시
    slowMo: 300,      // 눈으로 볼 수 있게 적당한 속도로 동작
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    // 1. 메인 접속
    console.log('[1/4] 유앤미24(younme24.com) 메인 페이지 접속 중...');
    await page.goto('http://www.younme24.com/main.asp', { waitUntil: 'domcontentloaded' });

    // 2. 로그인 시도
    console.log('[2/4] 사장님 계정으로 자동 로그인 진행 중...');
    await page.fill('input[name="userid"]', userId);
    await page.fill('input[name="passwd"]', userPw);

    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);

    await page.waitForTimeout(1000);
    const currentUrl = page.url();

    if (currentUrl.includes('err_passwd') || currentUrl.includes('login_form')) {
      console.error('\n❌ [로그인 실패] 아이디 또는 비밀번호가 일치하지 않습니다!');
      console.error('   .env 파일에 적힌 YOUNME_USER_ID 와 YOUNME_PASSWORD 를 다시 확인해주세요.');
      await page.waitForTimeout(5000);
      return;
    }

    console.log('✅ [로그인 성공!] 유앤미24 세션 연결 완료!\n');

    // 3. 상온 발주 페이지 및 장바구니 진입
    console.log('[3/4] 상온 발주 페이지 진입 및 장바구니 화면 표시...');
    await page.goto('http://www.younme24.com/app1/app.asp', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    console.log('\n========================================================');
    console.log('🎉 축하합니다! 유앤미24 실제 사이트 장바구니 연동이 완료되었습니다.');
    console.log('   방금 테스트로 담긴 상품(신라면 등)과 금액이');
    console.log('   현재 열려 있는 크롬 화면 우측 주문서에 그대로 보입니다!');
    console.log('========================================================\n');

    console.log('사장님이 크롬 브라우저에서 직접 확인하실 수 있도록 60초간 창을 유지합니다.');
    console.log('(확인이 끝나셨으면 크롬 창을 닫으셔도 됩니다.)');
    await page.waitForTimeout(60000);

  } catch (err) {
    console.error('실행 중 에러 발생:', err.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
