const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const http = require('http');
const querystring = require('querystring');

const USER_ID = process.env.YOUNME_USER_ID || '1060';
const USER_PW = process.env.YOUNME_PASSWORD;

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
    throw new Error('유앤미24 세션 쿠키 획득 실패. 아이디/비밀번호를 확인해주세요.');
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

  const appHtml = appRes.body.toString('latin1'); // ASCII matching for date
  const mDate = appHtml.match(/name=["']order_date["']\s+value=["'](\d+)["']/);
  const orderDate = mDate ? mDate[1] : '20260905';

  let successCount = 0;
  const failures = [];

  // 3. 품목 순회하며 장바구니 추가
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const targetBarcode = item.usingAliasBarcode || item.barcode;
    const isChilled = item.category?.includes('냉동') || item.category?.includes('저온');
    const folder = isChilled ? 'app3' : 'app1';

    const percent = Math.round(20 + ((i + 1) / items.length) * 75);
    if (onProgress) {
      onProgress({
        status: 'ADDING_CART',
        percent,
        message: `[${i + 1}/${items.length}] "${item.productName}" ${item.finalOrderQty}개 장바구니 담는 중...`,
      });
    }

    try {
      // 유앤미24는 Classic ASP(EUC-KR)이므로 복잡한 UTF-8 한글 파라미터 대신
      // 바코드(pcode)와 수량(quantity)만 넘기면 자체 DB에서 정확한 상품명과 단가를 매핑합니다.
      const addPath = `/${folder}/orderAdd.asp?order_dev=j&dev=&order_type=1&pcode=${targetBarcode}&quantity=${item.finalOrderQty}&unit=EA&price=0&order_date=${orderDate}&valid=y`;

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

      // 유앤미24는 장바구니 담기 성공 시 orderView.asp 로 302 리다이렉트합니다.
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
