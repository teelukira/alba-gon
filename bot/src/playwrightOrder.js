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

    console.log(`[봇] 발주 품목 분류: 상온 상품 ${ambientItems.length}개 / 저온냉장 상품 ${chilledItems.length}개`);

    // --- 헬퍼 함수: 단일 배치 주문 실행 ---
    async function processBatch(batchItems, orderUrl, cartUrl, batchName) {
      if (batchItems.length === 0) return;

      console.log(`\n================ [${batchName} 발주 세션 시작 (${batchItems.length}건)] ================`);
      await page.goto(orderUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(800);

      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        const targetBarcode = item.usingAliasBarcode || item.barcode;

        console.log(`[${batchName} ${i + 1}/${batchItems.length}] "${item.productName}" (바코드: ${targetBarcode})`);

        if (item.finalOrderQty < item.minOrderQty) {
          console.warn(`  ❌ 최소 발주량 미달: 요청 ${item.finalOrderQty}개 / 최소 ${item.minOrderQty}개`);
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

        // 검색창에 바코드 입력 후 검색
        const searchInput = await page.$('input[name="search_word"], input[name="keyword"], input[type="text"]');
        if (searchInput) {
          await searchInput.fill(targetBarcode);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);

          const content = await page.content();
          if (content.includes('자료가 없습니다') || content.includes('검색 결과가 없습니다') || content.includes('품절')) {
            console.warn(`  ❌ 검색 불가 또는 품절: ${targetBarcode}`);
            failures.push({
              id: `fail_${Date.now()}_${item.barcode}`,
              barcode: item.barcode,
              productName: item.productName,
              failReason: 'DISCONTINUED',
              failDetail: '유앤미24 검색 결과 없음 또는 품절 (신규 바코드 매핑 필요)',
              attemptedQty: item.finalOrderQty,
              minOrderQty: item.minOrderQty,
              failedAt: new Date().toLocaleTimeString('ko-KR'),
            });
            continue;
          }

          const qtyInput = await page.$('input[name="order_qty"], input[name="ea"], input.inputbox');
          if (qtyInput) {
            await qtyInput.fill(String(item.finalOrderQty));
            const cartBtn = await page.$('button:has-text("담기"), input[value*="담기"], a:has-text("담기")');
            if (cartBtn) {
              await cartBtn.click();
              await page.waitForTimeout(600);
            }
          }
          successCount++;
          console.log(`  ✅ ${batchName} 장바구니 담기 성공: ${item.finalOrderQty}개`);
        }
      }

      // 장바구니 페이지 이동
      console.log(`[봇] ${batchName} 장바구니 확인 중...`);
      await page.goto(cartUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(1500);
    }

    // 1단계: 상온 상품 발주 진행 (/app1/app.asp)
    if (ambientItems.length > 0) {
      await processBatch(ambientItems, 'http://www.younme24.com/app1/app.asp', 'http://www.younme24.com/app1/cart.asp', '상온상품');
    }

    // 2단계: 저온냉장 상품 발주 진행 (/app3/app.asp)
    if (chilledItems.length > 0) {
      await processBatch(chilledItems, 'http://www.younme24.com/app3/app.asp', 'http://www.younme24.com/app3/cart.asp', '저온냉장상품');
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
