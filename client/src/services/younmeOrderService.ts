import { OrderItem, OrderFailure } from '../types';
import { storageService } from './storage';
import mqtt from 'mqtt';

export interface OrderProgressEvent {
  status: 'STARTING' | 'LOGGING_IN' | 'SEARCHING' | 'ADDING_CART' | 'SUBMITTING' | 'DONE' | 'ERROR';
  message: string;
  percent: number;
  currentProduct?: string;
}

export const younmeOrderService = {
  // 웹 프론트엔드 또는 로컬 봇을 통한 자동 발주 실행
  async executeOrder(
    items: OrderItem[],
    onProgress: (event: OrderProgressEvent) => void
  ): Promise<{ successCount: number; failures: OrderFailure[] }> {
    onProgress({
      status: 'STARTING',
      message: '유앤미24 자동 발주 엔진 시작 중...',
      percent: 5,
    });

    const settings = storageService.getSettings();

    // 1. 로컬 봇 서버가 켜져 있는지 확인 (포트 3001)
    let isBotServerAvailable = false;
    try {
      const ping = await fetch('http://localhost:3001/api/health', { method: 'GET' });
      if (ping.ok) isBotServerAvailable = true;
    } catch {
      isBotServerAvailable = false;
    }

    if (!isBotServerAvailable && (!settings.younmeId || !settings.younmePw)) {
      throw new Error('유앤미24 계정 설정이 필요합니다. 우측 상단 톱니바퀴 설정에서 계정을 입력해주세요.');
    }

    if (isBotServerAvailable) {
      // 로컬 Playwright 브라우저 봇 서버로 실제 주문 요청 전송
      onProgress({
        status: 'LOGGING_IN',
        message: '로컬 자동화 브라우저 실행 및 유앤미24 로그인 시도 중...',
        percent: 20,
      });

      const response = await fetch('http://localhost:3001/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: { id: settings.younmeId, pw: settings.younmePw },
          items,
        }),
      });

      if (!response.ok) {
        throw new Error('자동 발주 서버 처리 중 오류가 발생했습니다.');
      }

      const result = await response.json();
      if (result.failures && result.failures.length > 0) {
        storageService.addOrderFailures(result.failures);
      }
      onProgress({
        status: 'DONE',
        message: `발주 완료! 성공: ${result.successCount}건, 실패/제외: ${result.failures.length}건`,
        percent: 100,
      });
      return result;
    }

    // 2. 외부 네트워크(스마트폰 / 타지역): 클라우드 실시간 릴레이를 통해 매장 PC 봇 호출!
    return new Promise((resolve, reject) => {
      onProgress({
        status: 'STARTING',
        message: '외부 네트워크 감지 ➡️ 클라우드 릴레이로 매장 PC 봇 연결 중...',
        percent: 10,
      });

      const storeId = settings.younmeId || '1060';
      const orderId = `order_${Date.now()}`;
      const topicReq = `albagom/orders/store_${storeId}/request`;
      const topicProgress = `albagom/orders/store_${storeId}/progress`;
      const topicRes = `albagom/orders/store_${storeId}/response`;

      // 브라우저 호환 보안 WSS MQTT 브로커
      const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
        clientId: `web_${storeId}_${Math.random().toString(16).substring(2, 8)}`,
        clean: true,
        connectTimeout: 8000,
      });

      let finished = false;
      const timeoutTimer = setTimeout(() => {
        if (!finished) {
          finished = true;
          try { client.end(); } catch {}
          reject(new Error('매장 PC 봇으로부터 응답이 없습니다. 매장 PC에서 [2_웹앱연동_자동발주봇_실행.bat]을 켜두셨는지 확인해주세요!'));
        }
      }, 40000);

      client.on('connect', () => {
        client.subscribe([topicProgress, topicRes], (err) => {
          if (err) {
            clearTimeout(timeoutTimer);
            client.end();
            return reject(new Error('클라우드 채널 구독 실패: ' + err.message));
          }

          // 매장 PC 봇으로 주문서 실시간 전송
          client.publish(topicReq, JSON.stringify({ orderId, items }));
          onProgress({
            status: 'SEARCHING',
            message: '📡 매장 PC로 발주 신호 전송 완료! 매장 PC가 유앤미 발주를 진행 중...',
            percent: 25,
          });
        });
      });

      client.on('message', (topic, payload) => {
        try {
          const data = JSON.parse(payload.toString());
          if (data.orderId !== orderId) return;

          if (topic === topicProgress) {
            onProgress({
              status: data.status,
              percent: data.percent,
              message: data.message,
            });
          } else if (topic === topicRes) {
            finished = true;
            clearTimeout(timeoutTimer);
            try { client.end(); } catch {}

            if (data.status === 'ERROR') {
              reject(new Error(data.message));
            } else {
              if (data.failures && data.failures.length > 0) {
                storageService.addOrderFailures(data.failures);
              }
              onProgress({
                status: 'DONE',
                percent: 100,
                message: data.message || '유앤미24 발주 완료!',
              });
              resolve({
                successCount: data.successCount || items.length,
                failures: data.failures || [],
              });
            }
          }
        } catch (e) {
          console.error('릴레이 수신 파싱 오류:', e);
        }
      });

      client.on('error', (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeoutTimer);
          try { client.end(); } catch {}
          reject(new Error(`클라우드 릴레이 연결 실패: ${err.message}`));
        }
      });
    });
  },
};
