const mqtt = require('mqtt');

const STORE_ID = '1060';
const TOPIC_REQ = `albagom/orders/store_${STORE_ID}/request`;
const TOPIC_RES = `albagom/orders/store_${STORE_ID}/response`;

const client = mqtt.connect('mqtts://broker.hivemq.com:8883', {
  clientId: `test_client_${Math.random().toString(16).substring(2, 8)}`,
});

client.on('connect', () => {
  console.log('클라이언트 테스트 연결 완료. 응답 채널 구독 중...');
  client.subscribe(TOPIC_RES, () => {
    console.log('원격 주문 요청 발행 중 (동아]포카리스웨트펫500ml 20개)...');
    client.publish(TOPIC_REQ, JSON.stringify({
      orderId: 'test_' + Date.now(),
      items: [
        {
          barcode: '8801097250048',
          productName: '동아]포카리스웨트펫500ml',
          finalOrderQty: 20,
          minOrderQty: 20,
          category: '음료'
        }
      ]
    }));
  });
});

client.on('message', (topic, message) => {
  console.log('원격 주문 결과 수신:', message.toString());
  client.end();
  process.exit(0);
});

setTimeout(() => {
  console.log('타임아웃');
  process.exit(1);
}, 15000);
