const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * 유앤미24(younme24.com) 실제 브라우저 자동 발주 실행 함수
 * @param {object} credentials - { id, pw }
 * @param {Array} items - [{ barcode, productName, finalOrderQty, minOrderQty, category }]
 */
async function runPlaywrightOrder(credentials, items) {
  console.log('====================================================');
  console.log(' [유앤미24 자동 발주 봇] 실제 브라우저 자동화 시작');
  console.log(` 로그인 계정: ${credentials.id}`);
  console.log(` 발주 요청 품목 수: ${items.length}개`);
  console.log('====================================================');

  // 사장님이 눈으로 확인할 수 있도록 브라우저를 직접 띄움 (headless: false)
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300, // 동작을 눈으로 확인할 수 있도록 살짝 지연
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    locale: 'ko-KR',
  });

  const page = await context.newPage();

  const failures = [];
  let successCount = 0;

  try {
    // 1. 유앤미24 메인 접속
    console.log('[봇] 유앤미24 메인 페이지 접속 중...');
    await page.goto('http://www.younme24.com/main.asp', { waitUntil: 'domcontentloaded' });

    // 2. 로그인 수행
    console.log('[봇] 로그인 폼 작성 및 로그인 진행...');
    await page.fill('input[name="userid"]', credentials.id);
    await page.fill('input[name="passwd"]', credentials.pw);

    // 로그인 버튼 클릭 및 네비게이션 대기
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);

    console.log('[봇] 로그인 완료! 주문 페이지 이동 중...');
    await page.waitForTimeout(1000);

    // 3. 상온 상품과 저온 상품 분리
    const ambientItems = items.filter(i => !i.category?.includes('냉동') && !i.category?.includes('저온'));
    const chilledItems = items.filter(i => i.category?.includes('냉동') || i.category?.includes('저온'));

    console.log(`[봇] 발주 품목 분류: 상온 상품 ${ambientItems.length}건 / 저온냉장 상품 ${chilledItems.length}건`);

    // --- 고속 정확 발주 함수 ---
    async function processBatch(batchItems, appFolder, batchName) {
      if (batchItems.length === 0) return;

      console.log(`\n================ [${batchName} 발주 세션 시작 (${batchItems.length}건)] ================`);
      await page.goto(`http://www.younme24.com/${appFolder}/app.asp`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // 발주일자 추출
      const orderDate = await page.$eval('input[name="order_date"]', el => el.value).catch(() => '20260905');
      console.log(`[봇] 현재 ${batchName} 발주일자: ${orderDate}`);

      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        const targetBarcode = item.usingAliasBarcode || item.barcode;

        console.log(`[${batchName} ${i + 1}/${batchItems.length}] "${item.productName}" (바코드: ${targetBarcode}, 수량: ${item.finalOrderQty}개)`);

        if (item.finalOrderQty < item.minOrderQty) {
          console.warn(`  ❌ 최소 발주량 미달 (요청 ${item.finalOrderQty}개 / 최소 ${item.minOrderQty}개)`);
          failures.push({
            id: `fail_${Date.now()}_${item.barcode}`,
            barcode: item.barcode,
            productName: item.productName,
            failReason: 'BELOW_MIN_QTY',
            failDetail: `최소 발주량 미달 (요청: ${item.finalOrderQty}개 / 최소: ${item.minOrderQty}개)`,
            attemptedQty: item.finalOrderQty,
            minOrderQty: item.minOrderQty,
            failedAt: new Date().toLocaleTimeString('ko-KR'),
          });
          continue;
        }

        try {
          // 유앤미 orderAdd.asp 직접 호출
          const addUrl = `http://www.younme24.com/${appFolder}/orderAdd.asp?order_dev=j&dev=&order_type=1&pcode=${targetBarcode}&quantity=${item.finalOrderQty}&unit=EA&price=0&order_date=${orderDate}&product_name=${encodeURIComponent(item.productName)}&valid=y`;
          
          await page.goto(addUrl, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(300);
          successCount++;
          console.log(`  ✅ [성공] "${item.productName}" ${item.finalOrderQty}개 장바구니 추가 완료!`);
        } catch (err) {
          console.error(`  ❌ 장바구니 추가 실패: ${err.message}`);
          failures.push({
            id: `fail_${Date.now()}_${item.barcode}`,
            barcode: item.barcode,
            productName: item.productName,
            failReason: 'SYSTEM_ERROR',
            failDetail: err.message,
            attemptedQty: item.finalOrderQty,
            minOrderQty: item.minOrderQty,
            failedAt: new Date().toLocaleTimeString('ko-KR'),
          });
        }
      }

      // 해당 세션 장바구니 화면으로 이동하여 눈으로 확인 가능하게 함
      console.log(`[봇] ${batchName} 최종 장바구니 화면으로 이동합니다...`);
      await page.goto(`http://www.younme24.com/${appFolder}/app.asp`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }

    // 1단계: 상온 상품 발주 (/app1/)
    if (ambientItems.length > 0) {
      await processBatch(ambientItems, 'app1', '상온상품');
    }

    // 2단계: 저온냉장 상품 발주 (/app3/)
    if (chilledItems.length > 0) {
      await processBatch(chilledItems, 'app3', '저온냉장상품');
    }

  } catch (err) {
    console.error('[봇] 자동 발주 실행 중 오류 발생:', err.message);
  }

  console.log('====================================================');
  console.log(` [결과] 성공: ${successCount}건, 실패/제외: ${failures.length}건`);
  console.log('====================================================');

  return { successCount, failures };
}

module.exports = { runPlaywrightOrder };

// 단독 실행 시 테스트용
if (require.main === module) {
  const testCreds = { id: '11470', pw: 'testpw' };
  const testItems = [
    { barcode: '8801123724680', productName: '마늘퐁닭매콤마늘치킨', finalOrderQty: 10, minOrderQty: 10, category: '냉동' },
  ];
  runPlaywrightOrder(testCreds, testItems);
}
