import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { WorkerApp } from './pages/WorkerApp';
import { AdminDashboard } from './pages/AdminDashboard';
import { storageService } from './services/storage';

export function App() {
  const [mode, setMode] = useState<'WORKER' | 'ADMIN'>('WORKER');

  useEffect(() => {
    // 기본 상품 DB 초기화
    storageService.getProducts();
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col selection:bg-sage-100">
      <Header currentMode={mode} onSwitchMode={setMode} />
      <main className="flex-1 w-full">
        {mode === 'WORKER' ? <WorkerApp /> : <AdminDashboard />}
      </main>
    </div>
  );
}

export default App;
