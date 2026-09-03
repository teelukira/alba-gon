import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { storageService } from '../services/storage';

interface PinModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ onSuccess, onClose }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const settings = storageService.getSettings();

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);

      if (newPin.length === 4) {
        if (newPin === settings.managerPin) {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => setPin(''), 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xs p-6 text-white shadow-2xl text-center">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2 text-blue-400">
            <Lock className="w-5 h-5" />
            <span className="font-bold text-sm">사장님 PIN 인증</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-6">사장님 전용 4자리 비밀번호를 입력해주세요.</p>

        {/* PIN 표시 동그라미 */}
        <div className="flex justify-center space-x-3 mb-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                idx < pin.length
                  ? error
                    ? 'bg-rose-500 scale-110'
                    : 'bg-blue-500 scale-110 shadow-sm shadow-blue-500/50'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-rose-400 mb-4 animate-shake">
            비밀번호가 일치하지 않습니다.
          </p>
        )}

        {/* 3x4 키패드 */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[220px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) => {
            if (key === '') {
              return <div key={i} />;
            }
            if (key === 'del') {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={handleDelete}
                  className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center"
                >
                  지움
                </button>
              );
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleKeyPress(key)}
                className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-white font-bold text-lg transition-colors flex items-center justify-center shadow-xs"
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
