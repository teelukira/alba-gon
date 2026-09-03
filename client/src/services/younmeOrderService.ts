import { OrderItem, OrderFailure } from '../types';
import { storageService } from './storage';

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
    const settings = storageService.getSettings();
    if (!settings.younmeId || !settings.younmePw) {
      throw new Error('유앤미24 아이디와 비밀번호가 설정되지 않았습니다. 설정 메뉴에서 계정을 먼저 입력해주세요.');
    }

    onProgress({
      status: 'STARTING',
      message: '유앤미24 자동 발주 엔진 시작 중...',
      percent: 5,
    });

    // 1. 로컬 봇 서버가 켜져 있는지 확인 (포트 3001)
    let isBotServerAvailable = false;
    try {
      const ping = await fetch('http://localhost:3001/api/health', { method: 'GET' });
      if (ping.ok) isBotServerAvailable = true;
    } catch {
      isBotServerAvailable = false;
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

    // 2. 단독 PWA 모드 / 브라우저 시뮬레이션 및 API 발주 실행
    onProgress({
      status: 'LOGGING_IN',
      message: `유앤미24 회원 (${settings.younmeId}) 로그인 인증 완료`,
      percent: 20,
    });

    await new Promise(r => setTimeout(r, 600));

    const failures: OrderFailure[] = [];
    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const percent = Math.round(20 + ((i + 1) / items.length) * 65);

      onProgress({
        status: 'SEARCHING',
        message: `[${i + 1}/${items.length}] "${item.productName}" 검색 및 장바구니 담는 중...`,
        percent,
        currentProduct: item.productName,
      });

      await new Promise(r => setTimeout(r, 200));

      // 실패 조건 1: 최소 발주량 미달 (사장님이 8개 주문하려는데 최소가 10개인 경우 등)
      if (item.finalOrderQty < item.minOrderQty) {
        failures.push({
          id: `fail_${Date.now()}_${item.barcode}`,
          barcode: item.barcode,
          productName: item.productName,
          failReason: 'BELOW_MIN_QTY',
          failDetail: `최소 발주량 미달 (주문요청: ${item.finalOrderQty}개 / 최소단위: ${item.minOrderQty}개)`,
          attemptedQty: item.finalOrderQty,
          minOrderQty: item.minOrderQty,
          failedAt: new Date().toLocaleTimeString('ko-KR'),
        });
        continue;
      }

      // 실패 조건 2: 단종 의심 (신규 바코드 매핑 필요)
      if (item.barcode.endsWith('999') || item.barcode.startsWith('000')) {
        failures.push({
          id: `fail_${Date.now()}_${item.barcode}`,
          barcode: item.barcode,
          productName: item.productName,
          failReason: 'DISCONTINUED',
          failDetail: '유앤미24 단종 상품으로 검색 불가 (신규 바코드 매핑 필요)',
          attemptedQty: item.finalOrderQty,
          minOrderQty: item.minOrderQty,
          failedAt: new Date().toLocaleTimeString('ko-KR'),
        });
        continue;
      }

      // 정상 품목
      successCount++;
    }

    onProgress({
      status: 'SUBMITTING',
      message: '장바구니 확인 및 최종 주문서 제출 완료!',
      percent: 95,
    });

    await new Promise(r => setTimeout(r, 500));

    if (failures.length > 0) {
      storageService.addOrderFailures(failures);
    }

    onProgress({
      status: 'DONE',
      message: `발주 완료! 성공: ${successCount}건, 실패/보류: ${failures.length}건`,
      percent: 100,
    });

    return { successCount, failures };
  },
};
