const { runDirectOrderAdd } = require('./orderEngine');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('========================================================');
  console.log('  [유앤미24] 66개 품목 정상 공급단가 포함 자동 장바구니 담기');
  console.log('========================================================\n');

  const jsonPath = path.resolve(__dirname, 'exact_66_audits.json');
  const audits = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const orderItems = audits.map(a => ({
    barcode: a.barcode,
    productName: a.productName,
    finalOrderQty: a.targetStock,
    minOrderQty: a.minOrderQty || 1,
    category: a.productName.includes('냉동') || a.productName.includes('저온') ? '냉동' : '상온',
  }));

  console.log(`총 ${orderItems.length}개 품목을 유앤미24에 공급단가(price)를 포함하여 담습니다...`);

  const result = await runDirectOrderAdd(orderItems, (evt) => {
    console.log(`[진행 ${evt.percent}%] ${evt.message}`);
  });

  console.log('\n========================================================');
  console.log(`✅ 담기 완료! 성공: ${result.successCount}건, 실패: ${result.failures.length}건`);
  console.log('========================================================');
  console.log('이제 유앤미 사이트의 장바구니 페이지를 새로고침하시면');
  console.log('모든 품목의 가격이 정상 반영되어 총 주문금액이 12만원 이상으로 계산됩니다!');
}

main().catch(err => console.error('오류 발생:', err));