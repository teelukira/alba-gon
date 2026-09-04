import React, { useState } from 'react';
import { ArrowRight, Trash2, X, Search } from 'lucide-react';
import { BarcodeAlias } from '../types';
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
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldBarcode.trim() || !newBarcode.trim()) return;

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
    setNote('');
  };

  const handleDelete = (id: string) => {
    if (confirm('이 연결을 삭제할까요?')) {
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

  const fieldClass =
    'w-full h-11 px-3.5 rounded-xl bg-canvas border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-sage-300 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-[2px] p-5">
      <div className="bg-surface rounded-3xl w-full max-w-2xl shadow-xl animate-settle overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 pb-5 flex justify-between items-start gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">대체 바코드</h2>
            <p className="mt-1 text-sm text-ink-soft leading-relaxed break-keep">
              매장에서 옛날 바코드를 찍어도 새 바코드로 발주됩니다.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="w-9 h-9 -mr-2 -mt-1 rounded-full text-ink-faint hover:text-ink hover:bg-sunken flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 새 연결 */}
        <form onSubmit={handleAdd} className="px-6 pb-5 space-y-2.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label className="block">
              <span className="block mb-1.5 text-[13px] text-ink-soft">매장에서 찍는 바코드</span>
              <input
                type="text"
                required
                value={oldBarcode}
                onChange={(e) => setOldBarcode(e.target.value)}
                className={`${fieldClass} tabular`}
              />
            </label>
            <label className="block">
              <span className="block mb-1.5 text-[13px] text-ink-soft">발주할 바코드</span>
              <input
                type="text"
                required
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
                className={`${fieldClass} tabular`}
              />
            </label>
            <label className="block">
              <span className="block mb-1.5 text-[13px] text-ink-soft">상품명</span>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              type="text"
              placeholder="메모 (선택)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${fieldClass} flex-1`}
            />
            <button
              type="submit"
              className="h-11 px-5 rounded-full bg-sage hover:bg-sage-deep text-white text-sm font-medium shrink-0 transition-colors"
            >
              추가
            </button>
          </div>
        </form>

        <div className="h-px bg-line shrink-0" />

        {/* 목록 */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="바코드 또는 상품명"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="연결 검색"
              className="w-full h-10 pl-10 pr-4 rounded-full bg-canvas border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-sage-300 transition-colors"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-faint">
              {aliases.length === 0 ? '등록된 연결이 없습니다' : '검색 결과가 없습니다'}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((item) => (
                <li key={item.id} className="py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-ink leading-snug break-keep">
                      {item.productName}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-faint tabular flex items-center gap-1.5 flex-wrap">
                      <span>{item.oldBarcode}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-ink-soft">{item.newBarcode}</span>
                      {item.note && <span className="font-sans">· {item.note}</span>}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    aria-label={`${item.productName} 연결 삭제`}
                    className="w-9 h-9 rounded-full text-ink-faint hover:text-brick hover:bg-brick-soft flex items-center justify-center shrink-0 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
