import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { WorkerApp } from './pages/WorkerApp';
import { AdminDashboard } from './pages/AdminDashboard';
import { storageService } from './services/storage';

export function App() {
  const [mode, setMode] = useState<'WORKER' | 'ADMIN'>('WORKER');

  useEffect(() => {
    // 앱 초기 실행 시 기본 상품 DB 초기화 (459개 상품 탑재)
    storageService.getProducts();

    // 초기 샘플 실사 데이터가 없으면 알바 체험을 위해 몇 개 넣어둠
    const audits = storageService.getAudits();
    if (audits.length === 0) {
      storageService.saveAudit({
        barcode: '8801123724680',
        productName: '$롯데햄)마늘퐁닭매콤마늘치킨200g(냉동)',
        stockCount: 2,
        targetStock: 10,
        minOrderQty: 10,
        isUnmapped: false,
        workerName: '야간알바',
      });
      storageService.saveAudit({
        barcode: '8801123701445',
        productName: '$롯데햄)켄터키핫도그75g(냉동)',
        stockCount: 7,
        targetStock: 15,
        minOrderQty: 10,
        isUnmapped: false,
        workerName: '야간알바',
      });
      storageService.saveAudit({
        barcode: '8809999999999',
        productName: '신규/미등록 상품',
        stockCount: 5,
        targetStock: 10,
        minOrderQty: 10,
        isUnmapped: true,
        workerName: '야간알바',
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header currentMode={mode} onSwitchMode={setMode} />
      <main className="flex-1 w-full">
        {mode === 'WORKER' ? <WorkerApp /> : <AdminDashboard />}
      </main>
    </div>
  );
}

export default App;
