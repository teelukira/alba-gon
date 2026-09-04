import React, { useState } from 'react';
import { X } from 'lucide-react';
import { storageService } from '../services/storage';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const current = storageService.getSettings();
  const [younmeId, setYounmeId] = useState(current.younmeId);
  const [younmePw, setYounmePw] = useState(current.younmePw);
  const [managerPin, setManagerPin] = useState(current.managerPin);
  const [workerName, setWorkerName] = useState(current.workerName);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveSettings({
      younmeId: younmeId.trim(),
      younmePw: younmePw.trim(),
      managerPin: managerPin.trim() || '1234',
      workerName: workerName.trim() || '야간알바',
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const productCount = storageService.getProducts().length;

  const fieldClass =
    'w-full h-11 px-3.5 rounded-xl bg-canvas border border-line text-[15px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-sage-300 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/30 backdrop-blur-[2px] p-0 sm:p-5">
      <div className="bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-xl animate-rise max-h-[92vh] overflow-y-auto">
        <div className="p-6 pb-4 flex justify-between items-center gap-4">
          <h2 className="text-lg font-semibold text-ink">설정</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="w-9 h-9 -mr-2 rounded-full text-ink-faint hover:text-ink hover:bg-sunken flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 pb-6 space-y-6">
          {/* 유앤미24 계정 */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-ink">유앤미24 계정</h3>
              <p className="mt-1 text-[13px] text-ink-faint leading-relaxed break-keep">
                발주를 넣을 때 사용합니다. 비밀번호를 아는 사람만 열 수 있습니다.
              </p>
            </div>

            <div className="space-y-2.5">
              <label className="block">
                <span className="block mb-1.5 text-[13px] text-ink-soft">아이디</span>
                <input
                  type="text"
                  value={younmeId}
                  onChange={(e) => setYounmeId(e.target.value)}
                  autoComplete="off"
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="block mb-1.5 text-[13px] text-ink-soft">비밀번호</span>
                <input
                  type="password"
                  value={younmePw}
                  onChange={(e) => setYounmePw(e.target.value)}
                  autoComplete="off"
                  className={fieldClass}
                />
              </label>
            </div>
          </div>

          <div className="h-px bg-line" />

          {/* 매장 */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block mb-1.5 text-[13px] text-ink-soft">관리자 비밀번호</span>
              <input
                type="password"
                maxLength={4}
                inputMode="numeric"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value.replace(/[^0-9]/g, ''))}
                className={`${fieldClass} text-center tracking-[0.4em] tabular`}
              />
            </label>

            <label className="block">
              <span className="block mb-1.5 text-[13px] text-ink-soft">근무자 이름</span>
              <input
                type="text"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>

          <p className="text-[13px] text-ink-faint">
            등록된 상품 <span className="tabular">{productCount}</span>개
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-12 px-5 rounded-full text-sm font-medium text-ink-soft hover:bg-sunken transition-colors"
            >
              닫기
            </button>
            <button
              type="submit"
              className="flex-1 h-12 rounded-full bg-sage hover:bg-sage-deep text-white text-sm font-medium transition-colors"
            >
              {saved ? '저장했습니다' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
