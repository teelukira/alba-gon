import React, { useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import { Product } from '../types';
import { storageService } from '../services/storage';

interface ProductStockSetupModalProps {
  onClose: () => void;
  onUpdated: () => void;
}

export const ProductStockSetupModal: React.FC<ProductStockSetupModalProps> = ({
  onClose,
  onUpdated,
}) => {
  const [products, setProducts] = useState<Product[]>(storageService.getProducts());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [batchTargetStock, setBatchTargetStock] = useState<number>(10);
  const [batchMinOrderQty, setBatchMinOrderQty] = useState<number>(10);
  const [savedId, setSavedId] = useState<string | null>(null);

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery);
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleItemChange = (
    barcode: string,
    field: 'targetStock' | 'minOrderQty',
    val: number
  ) => {
    const updated = products.map((p) =>
      p.barcode === barcode ? { ...p, [field]: Math.max(1, val) } : p
    );
    setProducts(updated);
    storageService.saveProducts(updated);
    setSavedId(barcode);
    setTimeout(() => setSavedId(null), 1000);
    onUpdated();
  };

  const handleBatchUpdate = () => {
    if (
      !confirm(
        `${filtered.length}개 상품의 목표 재고를 ${batchTargetStock}개, 발주단위를 ${batchMinOrderQty}개로 바꿉니다.`
      )
    ) {
      return;
    }

    const filteredBarcodes = new Set(filtered.map((f) => f.barcode));
    const updated = products.map((p) =>
      filteredBarcodes.has(p.barcode)
        ? { ...p, targetStock: batchTargetStock, minOrderQty: batchMinOrderQty }
        : p
    );

    setProducts(updated);
    storageService.saveProducts(updated);
    onUpdated();
  };

  const numberFieldClass =
    'w-16 h-9 text-center rounded-lg bg-canvas border border-line text-sm text-ink tabular focus:outline-none focus:border-sage-300 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-[2px] p-5">
      <div className="bg-surface rounded-3xl w-full max-w-4xl shadow-xl animate-settle overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-6 pb-5 flex justify-between items-start gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">목표 재고</h2>
            <p className="mt-1 text-sm text-ink-soft leading-relaxed break-keep">
              여기서 정한 목표 재고를 채우도록 발주 수량이 계산됩니다.
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

        {/* 검색 · 일괄 변경 */}
        <div className="px-6 pb-5 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="상품명 또는 바코드"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="상품 검색"
                className="w-full h-10 pl-10 pr-4 rounded-full bg-canvas border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-sage-300 transition-colors"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="분류"
              className="h-10 px-4 rounded-full bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-sage-300 transition-colors"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? '전체' : c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft">
            <span className="text-[13px] text-ink-faint">
              검색된 {filtered.length}개를 한 번에
            </span>
            <label className="inline-flex items-center gap-2">
              <span className="text-[13px]">목표</span>
              <input
                type="number"
                min="1"
                value={batchTargetStock}
                onChange={(e) => setBatchTargetStock(Math.max(1, parseInt(e.target.value) || 1))}
                className={numberFieldClass}
              />
            </label>
            <label className="inline-flex items-center gap-2">
              <span className="text-[13px]">발주단위</span>
              <input
                type="number"
                min="1"
                value={batchMinOrderQty}
                onChange={(e) => setBatchMinOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                className={numberFieldClass}
              />
            </label>
            <button
              onClick={handleBatchUpdate}
              className="h-9 px-4 rounded-full bg-sunken hover:bg-line text-[13px] font-medium text-ink-soft transition-colors"
            >
              적용
            </button>
          </div>
        </div>

        <div className="h-px bg-line shrink-0" />

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="text-[13px] text-ink-faint border-b border-line">
                <th className="font-medium py-3 pr-3">상품</th>
                <th className="font-medium py-3 px-3 text-center whitespace-nowrap">목표</th>
                <th className="font-medium py-3 px-3 text-center whitespace-nowrap">발주단위</th>
                <th className="py-3 pl-3 w-16">
                  <span className="sr-only">저장 상태</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.slice(0, 100).map((p) => (
                <tr key={p.barcode}>
                  <td className="py-3 pr-3 max-w-md">
                    <span className="block text-ink leading-snug break-keep">{p.name}</span>
                    <span className="block mt-0.5 text-[13px] text-ink-faint tabular">
                      {p.barcode} · {p.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input
                      type="number"
                      min="1"
                      value={p.targetStock}
                      onChange={(e) =>
                        handleItemChange(p.barcode, 'targetStock', parseInt(e.target.value) || 1)
                      }
                      aria-label={`${p.name} 목표 재고`}
                      className={numberFieldClass}
                    />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input
                      type="number"
                      min="1"
                      value={p.minOrderQty}
                      onChange={(e) =>
                        handleItemChange(p.barcode, 'minOrderQty', parseInt(e.target.value) || 1)
                      }
                      aria-label={`${p.name} 최소 발주단위`}
                      className={numberFieldClass}
                    />
                  </td>
                  <td className="py-3 pl-3">
                    {savedId === p.barcode && (
                      <span className="inline-flex items-center gap-1 text-[13px] text-sage">
                        <Check className="w-3.5 h-3.5" />
                        저장
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length > 100 && (
            <p className="py-4 text-center text-[13px] text-ink-faint">
              100개까지 보입니다. 검색으로 좁혀 주세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
