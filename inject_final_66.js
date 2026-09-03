const mqtt = require('./bot/node_modules/mqtt');
const fs = require('fs');

const audits = JSON.parse(fs.readFileSync('./client/src/data/seedAudits.json', 'utf-8'));

const client = mqtt.connect('mqtts://broker.hivemq.com:8883', {
  clientId: `restorer_${Math.random().toString(16).substring(2, 8)}`,
  clean: true,
});

client.on('connect', () => {
  console.log(`Connected to broker. Publishing exactly ${audits.length} audits to store_1060...`);
  const topic = 'albagom/stores/store_1060/audits_sync';
  const payload = {
    type: 'AUDITS_UPDATE',
    senderId: 'system_exact_restorer_v2',
    senderRole: 'WORKER',
    storeId: '1060',
    timestamp: Date.now(),
    audits,
  };

  client.publish(topic, JSON.stringify(payload), { qos: 1, retain: true }, (err) => {
    if (err) {
      console.error('Publish error:', err);
    } else {
      console.log(`✅ [완료] 정확한 ${audits.length}개 품목(로그 원본 수량)이 클라우드 실시간 동기화로 발행되었습니다!`);
    }
    client.end();
  });
});