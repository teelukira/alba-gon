// 스캔 피드백은 진동으로만 준다.
// 매장이 시끄러워도 손끝으로 인식 성공을 알 수 있고, 손님 앞에서 소리가 나지 않는다.
class FeedbackManager {
  private vibrate(pattern: number | number[]) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      // 진동을 지원하지 않는 기기는 그냥 넘어간다
    }
  }

  // 바코드 인식 성공 – 짧게 한 번
  playScanSuccess() {
    this.vibrate(40);
  }

  // 미등록 상품 – 두 번 끊어서, 확인이 필요하다는 신호
  playAlert() {
    this.vibrate([60, 60, 60]);
  }
}

export const soundManager = new FeedbackManager();
