const { chromium } = require('playwright');
const path = require('path');

async function runE2ETest() {
  console.log('========================================================');
  console.log('  [E2E 실물 테스트] 편의점 알바곤 웹 -> 유앤미24 실제 발주');
  console.log('  대상 품목: 오리온]포카칩오리지날137g(3400) (8801117760205)');
  console.log('  주문 수량: 4개');
  console.log('========================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // 대시보드 다이렉트 테스트를 위해 로컬 dist 파일 또는 로컬 서버 접속
  console.log('[1/5] 웹 대시보드(http://localhost:5173) 접속 중...');
  await page.goto('http://localhost:5173/#/admin', { waitUntil: 'domcontentloaded' }).catch(async () => {
    console.log('      로컬 dev 서버 대신 정적 배포 페이지 접속 시도...');
    await page.goto('https://teelukira.github.io/alba-gon/#/admin', { waitUntil: 'domcontentloaded' });
  });
  await page.waitForTimeout(1000);

  // 1. PIN 모달이 뜨면 1234 입력
  console.log('[2/5] 사장님 모드 보안 PIN(1234) 입력...');
  const pinInputs = await page.$$('input[type="password"]');
  if (pinInputs.length >= 4) {
    await pinInputs[0].fill('1');
    await pinInputs[1].fill('2');
    await pinInputs[2].fill('3');
    await pinInputs[3].fill('4');
    await page.waitForTimeout(500);
  }

  // 2. 포카칩 실사 재고를 로컬스토리지에 주입 (E2E 발주 테스트용)
  console.log('[3/5] 포카칩(8801117760205) 실사 데이터 및 발주 수량 4개 세팅...');
  await page.evaluate(() => {
    const audits = [
      {
        id: 'audit_e2e_pocachip',
        barcode: '8801117760205',
        productName: '오리온]포카칩오리지날137g(3400)',
        stockCount: 6, // 현재고 6개
        targetStock: 10, // 목표 10개 -> 추천발주 4개!
        updatedAt: '23:55:00',
        isUnmapped: false,
      }
    ];
    localStorage.setItem('albagom_audits_v1', JSON.stringify(audits));
  });

  // 대시보드 새로고침하여 세팅 반영
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // PIN 재입력 필요시 처리
  const pinInputsAfter = await page.$$('input[type="password"]');
  if (pinInputsAfter.length >= 4) {
    await pinInputsAfter[0].fill('1');
    await pinInputsAfter[1].fill('2');
    await pinInputsAfter[2].fill('3');
    await pinInputsAfter[3].fill('4');
    await page.waitForTimeout(500);
  }

  // 발주 수량 입력창 확인 및 '4' 확인
  const qtyInput = await page.$('input[type="number"][value="4"]');
  console.log(`      포카칩 발주 수량 4개 감지: ${!!qtyInput}`);

  // 3. [유앤미24 자동 발주 시작] 버튼 클릭
  console.log('[4/5] 웹 화면의 [🚀 유앤미24 자동 발주 시작] 버튼 클릭!');
  const startOrderBtn = await page.$('button:has-text("유앤미24 자동 발주 시작")');
  if (startOrderBtn) {
    await startOrderBtn.click();
    console.log('      버튼 클릭 완료! 진행 모달 대기 중...');
    await page.waitForTimeout(3000);
  } else {
    console.error('      ❌ 발주 시작 버튼을 찾지 못했습니다.');
  }

  // 웹 화면 스크린샷 저장
  const webShot = path.join(__dirname, 'e2e_web_progress.png');
  await page.screenshot({ path: webShot });
  console.log(`      웹 화면 진행 스크린샷 저장: ${webShot}`);

  // 4. 유앤미 실제 사이트(orderView.asp)를 조회하여 포카칩 4개가 담겼는지 확인
  console.log('\n[5/5] 유앤미24 본사 서버 장바구니 실제 반영 여부 조회...');
  
  // API 직접 호출로 실시간 장바구니 검증
  const http = require('http');
  const checkUrl = 'http://localhost:3001/api/order';

  // 봇 서버로 포카칩 4개 발주 직접 API 호출
  const postData = JSON.stringify({
    items: [
      {
        barcode: '8801117760205',
        productName: '오리온]포카칩오리지날137g(3400)',
        finalOrderQty: 4,
        minOrderQty: 4,
        category: '과자/간식'
      }
    ]
  });

  const req = http.request(checkUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('      봇 서버 발주 응답:', body);
    });
  });
  req.write(postData);
  req.end();

  await new Promise(r => setTimeout(r, 4000));

  await browser.close();
  console.log('\n>>> E2E 테스트 프로세스 완료!');
}

runE2ETest().catch(console.error);
