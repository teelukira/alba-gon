const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { runPlaywrightOrder } = require('./playwrightOrder');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.BOT_PORT || 3001;

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'younme-order-bot', uptime: process.uptime() });
});

// 유앤미24 실제 브라우저 자동 발주 API
app.post('/api/order', async (req, res) => {
  const { credentials, items } = req.body || {};

  const id = credentials?.id || process.env.YOUNME_USER_ID;
  const pw = credentials?.pw || process.env.YOUNME_PASSWORD;

  if (!id || !pw || pw.includes('실제_비밀번호_입력')) {
    return res.status(400).json({
      error: '유앤미24 계정 정보가 없습니다. .env 파일에 실제 비밀번호를 입력해주세요.',
    });
  }

  console.log(`[봇] 발주 시작 요청 접수: 아이디=${id}, 품목 수=${items?.length || 0}`);

  try {
    const result = await runPlaywrightOrder({ id, pw }, items || []);
    res.json({
      successCount: result.successCount,
      failures: result.failures,
      message: '발주 처리가 완료되었습니다.',
    });
  } catch (err) {
    console.error('[봇] 발주 실행 중 치명적 오류:', err);
    res.status(500).json({ error: err.message || '서버 오류' });
  }
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` 편의점 알바곤 - 유앤미24 자동 발주 봇`);
  console.log(` 포트: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
