import React, { useState } from 'react';
import { ArrowRightLeft, Plus, Trash2, X, Search, CheckCircle, Tag } from 'lucide-react';
import { BarcodeAlias, Product } from '../types';
import { storageService } from '../services/storage';

interface BarcodeAliasModalProps {
  initialOldBarcode?: string;
  onClose: () => void;
}

export const BarcodeAliasModal: React.FC<BarcodeAliasModalProps> = ({
  initialOldBarcode = '',
  onClose,
}) => {
  const [aliases, setAliases] = useState<BarcodeAlias[]>(storageService.getAliases());
  const [oldBarcode, setOldBarcode] = useState(initialOldBarcode);
  const [newBarcode, setNewBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [note, setNote] = useState('단종/패키지 리뉴얼 대체');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldBarcode.trim() || !newBarcode.trim()) return;

    // 상품명이 없으면 마스터 DB에서 찾거나 기본값
    let finalName = productName.trim();
    if (!finalName) {
      const found = storageService.findProduct(oldBarcode.trim()).product;
      finalName = found ? found.name : '대체 상품';
    }

    storageService.saveAlias({
      oldBarcode: oldBarcode.trim(),
      newBarcode: newBarcode.trim(),
      productName: finalName,
      note: note.trim(),
    });

    setAliases(storageService.getAliases());
    setOldBarcode('');
    setNewBarcode('');
    setProductName('');
  };

  const handleDelete = (id: string) => {
    if (confirm('이 바코드 매핑을 삭제하시겠습니까?')) {
      storageService.deleteAlias(id);
      setAliases(storageService.getAliases());
    }
  };

  const filtered = aliases.filter(
    (a) =>
      a.oldBarcode.includes(searchQuery) ||
      a.newBarcode.includes(searchQuery) ||
      a.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-indigo-400">
            <ArrowRightLeft className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-base">구형 바코드 ➡️ 신규 발주용 바코드 대체 관리</h3>
              <p className="text-[11px] text-slate-400">
                알바가 구형 바코드를 찍어도, 유앤미24에는 신규 바코드로 자동 주문됩니다.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 신규 매핑 등록 폼 */}
        <form onSubmit={handleAdd} className="p-4 bg-slate-800/60 border-b border-slate-800 text-xs">
          <h4 className="font-bold text-slate-200 mb-2 flex items-center space-x-1.5">
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>새 대체 바코드 연결 등록</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            <div>
              <label className="block text-slate-400 mb-0.5">알바가 찍을 구형 바코드</label>
              <input
                type="text"
                required
                placeholder="예: 8801123700001"
                value={oldBarcode}
                onChange={(e) => setOldBarcode(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-0.5">유앤미 주문용 신규 바코드</label>
              <input
                type="text"
                required
                placeholder="예: 8801123799999"
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 font-mono font-bold focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-0.5">상품명 (선택)</label>
              <input
                type="text"
                placeholder="상품명 입력"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-1">
            <input
              type="text"
              placeholder="사유 메모 (예: 2026년 리뉴얼 단종)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-2/3 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-[11px]"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold transition-colors shadow-sm"
            >
              대체 매핑 추가
            </button>
          </div>
        </form>

        {/* 검색 및 매핑 리스트 관리 */}
        <div className="p-4 flex-1 overflow-y-auto flex flex-col space-y-3">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="바코드 또는 상품명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden"
              />
            </div>
            <span className="text-xs text-slate-400">
              총 <strong className="text-indigo-400">{aliases.length}</strong>개 매핑 관리중
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              등록된 대체 바코드 매핑이 없습니다.
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[350px]">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex items-center justify-between hover:border-slate-600 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="font-semibold text-white">{item.productName}</span>
                      {item.note && (
                        <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                          {item.note}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 font-mono text-xs">
                      <span className="text-amber-400 font-bold">{item.oldBarcode}</span>
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-emerald-400 font-bold">{item.newBarcode}</span>
                      <span className="text-[10px] text-slate-500 font-sans">({item.updatedAt})</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition-colors"
                    title="매핑 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
