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
      <header className="bg-surface/85 backdrop-blur-md sticky top-0 z-30 border-b border-line">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-sage-50 text-sage flex items-center justify-center shrink-0">
              <Store className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-[15px] text-ink truncate">알바곤</h1>
              <p className="text-[13px] text-ink-faint truncate">
                {title || (currentMode === 'WORKER' ? '재고 실사' : '재고 · 발주 관리')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleSettingsClick}
              title="설정"
              aria-label="설정"
              className="w-9 h-9 rounded-full text-ink-faint hover:text-ink hover:bg-sunken flex items-center justify-center transition-colors"
            >
              <Settings className="w-[18px] h-[18px]" />
            </button>

            <button
              onClick={handleAdminClick}
              className={`flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium transition-colors ${
                currentMode === 'ADMIN'
                  ? 'text-ink-soft hover:text-ink hover:bg-sunken'
                  : 'bg-sage text-white hover:bg-sage-deep'
              }`}
            >
              {currentMode === 'ADMIN' ? (
                <>
                  <User className="w-4 h-4" />
                  <span>실사 화면</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>관리</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {showPinModal && (
        <PinModal
          onSuccess={handlePinSuccess}
          onClose={() => {
            setShowPinModal(false);
            setPendingAction(null);
          }}
        />
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </>
  );
};
