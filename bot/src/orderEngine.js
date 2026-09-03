const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const http = require('http');
const querystring = require('querystring');

const USER_ID = process.env.YOUNME_USER_ID || '1060';
const USER_PW = process.env.YOUNME_PASSWORD;

// 1. 기본 마스터 데이터 로드 (460여 개 품목 유앤미 공식 공급단가 캐시)
let seedMap = {};
try {
  const seedList = require('./seedProducts.json');
  for (const p of seedList) {
    seedMap[p.barcode] = p;
  }
} catch (e) {
  try {
    const fallbackList = require('../../client/src/data/seedProducts.json');
    for (const p of fallbackList) {
      seedMap[p.barcode] = p;
    }
  } catch (err) {}
}

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer,
        });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

/**
 * 유앤미24 사이트에서 바코드로 실시간 공식 공급단가(price) 및 단위(unit) 조회
 */
async function fetchYounmeProductInfo(sessionCookie, folder, barcode, orderDate) {
  try {
    const searchPayload = querystring.stringify({
      order_date: orderDate,
      order_dev: 'j',
      order_type: '1',
      search_dev: 'product_name',
      search_word: '',
      search_word2: barcode,
    });

    const res = await httpRequest({
      hostname: 'www.younme24.com',
      port: 80,
      path: `/${folder}/product_list.asp`,
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(searchPayload),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    }, searchPayload);

    const html = res.body.toString('latin1');
    const regex = new RegExp(`cart_add\\(['"]${barcode}['"],\\s*['"]\\d+['"],\\s*['"]([^'"]*)['"],\\s*['"]([^'"]*)['"],.*?['"]([^'"]*)['"],\\s*['"]([^'"]*)['"]`);
    const match = html.match(regex);
    if (match) {
      return {
        unit: match[1] || 'EA',
        price: parseInt(match[2], 10) || 0,
        cs: match[3] || 'j',
        valid: match[4] || 'y',
      };
    }
  } catch (e) {
    console.warn(`[orderEngine] 단가 실시간 조회 예외 (${barcode}):`, e.message);
  }
  return null;
}

async function runDirectOrderAdd(items, onProgress) {
  if (!USER_PW) {
    throw new Error('.env 파일에 YOUNME_PASSWORD 가 설정되어 있지 않습니다.');
  }

  // 1. 유앤미24 로그인
  const loginPayload = querystring.stringify({
    home: 'y',
    userid: USER_ID,
    passwd: USER_PW,
  });

  const loginRes = await httpRequest({
    hostname: 'www.younme24.com',
    port: 80,
    path: '/member/login.asp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(loginPayload),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  }, loginPayload);

  // 세션 쿠키 추출
  const rawCookies = loginRes.headers['set-cookie'] || [];
  const sessionCookie = rawCookies.map(c => c.split(';')[0]).join('; ');
  if (!sessionCookie) {
    throw new Error('유앤미24 세션 쿠키 획득 실패. 아이디와 비밀번호를 확인해주세요.');
  }

  // 2. 상온 발주 일자 확인
  const appRes = await httpRequest({
    hostname: 'www.younme24.com',
    port: 80,
    path: '/app1/app.asp',
    method: 'GET',
    headers: {
      'Cookie': sessionCookie,
      'User-Agent': 'Mozilla/5.0',
    },
  });

  const appHtml = appRes.body.toString('latin1');
  const mDate = appHtml.match(/name=["']order_date["']\s+value=["'](\d+)["']/);
  const orderDate = mDate ? mDate[1] : '20260905';

  let successCount = 0;
  const failures = [];

  // 3. 품목 순회하며 정확한 단가(price)를 포함하여 장바구니 추가
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const targetBarcode = item.usingAliasBarcode || item.barcode;
    const isChilled = item.category?.includes('냉동') || item.category?.includes('저온');
    const folder = isChilled ? 'app3' : 'app1';

    const percent = Math.round(20 + ((i + 1) / items.length) * 75);

    // ★ 단가(price) 결정: 웹앱 전송값 -> 로컬 마스터 캐시 -> 유앤미 실시간 조회 -> 안전 기본값
    let determinedPrice = Number(item.cost) || Number(item.price) || 0;
    let determinedUnit = 'EA';
    let determinedCs = 'j';

    if (!determinedPrice || determinedPrice <= 0) {
      if (seedMap[targetBarcode] && seedMap[targetBarcode].cost > 0) {
        determinedPrice = seedMap[targetBarcode].cost;
      }
    }

    // 여전히 가격이 없으면 유앤미 사이트에서 실시간 단가 조회
    if (!determinedPrice || determinedPrice <= 0) {
      const liveInfo = await fetchYounmeProductInfo(sessionCookie, folder, targetBarcode, orderDate);
      if (liveInfo && liveInfo.price > 0) {
        determinedPrice = liveInfo.price;
        determinedUnit = liveInfo.unit || 'EA';
        determinedCs = liveInfo.cs || 'j';
      } else {
        // 최종 안전단가 (유앤미 12만원 미만 오류 방지)
        determinedPrice = 3000;
      }
    }

    if (onProgress) {
      onProgress({
        status: 'ADDING_CART',
        percent,
        message: `[${i + 1}/${items.length}] "${item.productName}" ${item.finalOrderQty}개 (단가: ${determinedPrice.toLocaleString()}원) 담는 중..`,
      });
    }

    try {
      // ★ price 파라미터에 실제 공급단가를 넘겨 유앤미 장바구니 및 총 주문금액이 정상 계산되도록 함!
      const addPath = `/${folder}/orderAdd.asp?order_dev=j&dev=${determinedCs}&order_type=1&pcode=${targetBarcode}&quantity=${item.finalOrderQty}&unit=${determinedUnit}&price=${determinedPrice}&order_date=${orderDate}&valid=y`;

      const addRes = await httpRequest({
        hostname: 'www.younme24.com',
        port: 80,
        path: addPath,
        method: 'GET',
        headers: {
          'Cookie': sessionCookie,
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const location = addRes.headers['location'] || '';
      const isSuccess = (addRes.statusCode === 200 || addRes.statusCode === 302) && !location.includes('msg=err');

      if (isSuccess) {
        successCount++;
      } else {
        failures.push({
          id: `fail_${Date.now()}_${item.barcode}`,
          barcode: item.barcode,
          productName: item.productName,
          failReason: 'HTTP_ERROR',
          failDetail: `서버 응답: ${addRes.statusCode} (${location || '오류'})`,
          attemptedQty: item.finalOrderQty,
          minOrderQty: item.minOrderQty,
          failedAt: new Date().toLocaleTimeString('ko-KR'),
        });
      }
    } catch (err) {
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

  return { successCount, failures };
}

module.exports = { runDirectOrderAdd };