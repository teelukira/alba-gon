import React, { useState } from 'react';
import { Settings, X, Save, Key, UserCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-blue-400">
            <Settings className="w-5 h-5" />
            <h3 className="font-bold text-base">공용폰 & 시스템 설정</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* 유앤미 계정 설정 */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 space-y-3">
            <div className="flex items-center space-x-1.5 text-blue-300 font-semibold">
              <Key className="w-4 h-4" />
              <span>유앤미24 (younme24.com) 자동발주 계정</span>
            </div>
            <p className="text-[11px] text-slate-400">
              공용폰에 저장해두면 사장님이 원클릭으로 자동 발주를 넣을 때 사용됩니다. 알바는 PIN 번호가 없어 열람할 수 없습니다.
            </p>

            <div className="space-y-2">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">유앤미24 아이디</label>
                <input
                  type="text"
                  value={younmeId}
                  onChange={(e) => setYounmeId(e.target.value)}
                  placeholder="예: 11470 또는 사장님 아이디"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-medium">유앤미24 비밀번호</label>
                <input
                  type="password"
                  value={younmePw}
                  onChange={(e) => setYounmePw(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 사장님 보안 PIN 및 알바 설정 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
              <div className="flex items-center space-x-1.5 text-purple-300 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>사장님 PIN (4자리)</span>
              </div>
              <input
                type="password"
                maxLength={4}
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-center font-mono font-bold text-sm tracking-widest focus:outline-hidden focus:border-purple-500"
              />
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
              <div className="flex items-center space-x-1.5 text-emerald-300 font-semibold mb-1">
                <UserCheck className="w-4 h-4" />
                <span>기본 알바 이름</span>
              </div>
              <input
                type="text"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 현재 등록 상품 수 */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>마스터 DB 상품 수: <strong className="text-blue-400">{productCount}개</strong> (엑셀 자동탑재)</span>
            <span className="text-slate-500">호스팅 비용: ₩0 (무료)</span>
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-slate-300 transition-colors"
            >
              닫기
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>저장 완료!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>설정 저장하기</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
