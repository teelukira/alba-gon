import React, { useState } from 'react';
import { X } from 'lucide-react';
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
    if (pin.length >= 4) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (newPin === settings.managerPin) {
        onSuccess();
      } else {
        setError(true);
        setTimeout(() => setPin(''), 600);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-[2px] p-5">
      <div className="bg-surface rounded-3xl w-full max-w-xs p-6 shadow-xl animate-settle">
        <div className="flex justify-between items-center">
          <h2 className="text-[15px] font-medium text-ink">관리자 확인</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="w-9 h-9 -mr-2 rounded-full text-ink-faint hover:text-ink hover:bg-sunken flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-1 text-[13px] text-ink-faint">비밀번호 네 자리</p>

        {/* 입력 표시 */}
        <div className="flex justify-center gap-3 my-7" role="status" aria-live="polite">
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                idx < pin.length ? (error ? 'bg-brick' : 'bg-sage') : 'bg-line'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="-mt-4 mb-5 text-center text-[13px] text-brick">
            비밀번호가 맞지 않습니다
          </p>
        )}

        {/* 키패드 */}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) => {
            if (key === '') return <div key={i} />;

            if (key === 'del') {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={handleDelete}
                  className="h-14 rounded-2xl text-[13px] font-medium text-ink-soft hover:bg-sunken transition-colors"
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
                className="h-14 rounded-2xl bg-sunken hover:bg-line text-xl text-ink tabular transition-colors"
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
