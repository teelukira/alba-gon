import React, { useState } from 'react';
import { Store, Shield, Settings, User } from 'lucide-react';
import { PinModal } from './PinModal';
import { SettingsModal } from './SettingsModal';

interface HeaderProps {
  currentMode: 'WORKER' | 'ADMIN';
  onSwitchMode: (mode: 'WORKER' | 'ADMIN') => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ currentMode, onSwitchMode, title }) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'SWITCH_ADMIN' | 'OPEN_SETTINGS' | null>(null);

  const handleAdminClick = () => {
    if (currentMode === 'ADMIN') {
      onSwitchMode('WORKER');
    } else {
      setPendingAction('SWITCH_ADMIN');
      setShowPinModal(true);
    }
  };

  const handleSettingsClick = () => {
    setPendingAction('OPEN_SETTINGS');
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    if (pendingAction === 'SWITCH_ADMIN') {
      onSwitchMode('ADMIN');
    } else if (pendingAction === 'OPEN_SETTINGS') {
      setShowSettingsModal(true);
    }
    setPendingAction(null);
  };

  return (
    <>
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-base tracking-tight text-white">편의점 알바곤</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                  currentMode === 'WORKER' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}>
                  {currentMode === 'WORKER' ? '알바 재고실사 모드' : '사장님 관리자 모드'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {title || (currentMode === 'WORKER' ? '공용폰 실시간 바코드 스캔' : '월/목 22시 재고 & 유앤미24 발주')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* 설정 버튼 (사장님 PIN 잠금) */}
            <button
              onClick={handleSettingsClick}
              title="유앤미 계정 및 시스템 설정"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* 사장님 / 알바 모드 전환 버튼 */}
            <button
              onClick={handleAdminClick}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentMode === 'ADMIN'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
              }`}
            >
              {currentMode === 'ADMIN' ? (
                <>
                  <User className="w-3.5 h-3.5" />
                  <span>알바모드 복귀</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>사장님 모드</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* PIN 인증 모달 */}
      {showPinModal && (
        <PinModal
          onSuccess={handlePinSuccess}
          onClose={() => {
            setShowPinModal(false);
            setPendingAction(null);
          }}
        />
      )}

      {/* 유앤미 계정 설정 모달 */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </>
  );
};
