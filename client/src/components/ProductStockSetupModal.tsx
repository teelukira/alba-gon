import React, { useState } from 'react';
import { PackageSearch, Search, Save, X, Check, Edit2, Sliders, ArrowUpDown } from 'lucide-react';
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

  // 카테고리 목록 추출
  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  // 필터링
  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery);
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // 개별 상품 목표재고/최소발주량 변경
  const handleItemChange = (barcode: string, field: 'targetStock' | 'minOrderQty', val: number) => {
    const updated = products.map((p) => {
      if (p.barcode === barcode) {
        return { ...p, [field]: Math.max(1, val) };
      }
      return p;
    });
    setProducts(updated);
    storageService.saveProducts(updated);
    setSavedId(barcode);
    setTimeout(() => setSavedId(null), 1000);
    onUpdated();
  };

  // 검색된 결과 일괄 변경
  const handleBatchUpdate = () => {
    if (!confirm(`현재 검색된 ${filtered.length}개 상품의 목표재고를 ${batchTargetStock}개, 최소발주량을 ${batchMinOrderQty}개로 일괄 변경하시겠습니까?`)) {
      return;
    }

    const filteredBarcodes = new Set(filtered.map(f => f.barcode));
    const updated = products.map((p) => {
      if (filteredBarcodes.has(p.barcode)) {
        return { ...p, targetStock: batchTargetStock, minOrderQty: batchMinOrderQty };
      }
      return p;
    });

    setProducts(updated);
    storageService.saveProducts(updated);
    alert(`${filtered.length}개 상품의 추천 재고 수량이 일괄 변경되었습니다!`);
    onUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 헤더 */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-blue-400">
            <Sliders className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-base">제품별 추천 재고수량 & 최소발주량 셋업</h3>
              <p className="text-[11px] text-slate-400">
                여기서 설정한 '목표 안전재고'를 기준으로 알바 실사 후 발주 추천량이 자동 계산됩니다.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 검색 및 필터 컨트롤 바 */}
        <div className="p-4 bg-slate-800/60 border-b border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="상품명 또는 바코드 검색 (예: 신라면, 치킨, 8801...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-300 focus:outline-hidden"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'ALL' ? '전체 카테고리' : c}</option>
              ))}
            </select>
          </div>

          {/* 일괄 변경 툴바 */}
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-medium">검색된 <strong className="text-blue-400">{filtered.length}</strong>개 품목 일괄 셋업:</span>
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-slate-500">목표재고</span>
                <input
                  type="number"
                  min="1"
                  value={batchTargetStock}
                  onChange={(e) => setBatchTargetStock(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 px-2 py-1 text-center font-bold font-mono bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                />
                <span className="text-[11px] text-slate-500">개</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-slate-500">최소발주</span>
                <input
                  type="number"
                  min="1"
                  value={batchMinOrderQty}
                  onChange={(e) => setBatchMinOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 px-2 py-1 text-center font-bold font-mono bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                />
                <span className="text-[11px] text-slate-500">개</span>
              </div>
            </div>

            <button
              onClick={handleBatchUpdate}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
            >
              일괄 적용
            </button>
          </div>
        </div>

        {/* 상품 테이블 */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] sticky top-0 z-10">
              <tr>
                <th className="p-3">바코드</th>
                <th className="p-3">상품명</th>
                <th className="p-3">카테고리</th>
                <th className="p-3 text-center">목표 안전재고 (진열추천수량)</th>
                <th className="p-3 text-center">최소 발주단위 (MOQ)</th>
                <th className="p-3 text-right">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.slice(0, 100).map((p) => (
                <tr key={p.barcode} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-mono text-[11px] text-slate-400">{p.barcode}</td>
                  <td className="p-3 font-medium text-white max-w-xs truncate">{p.name}</td>
                  <td className="p-3">
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                      {p.category}
                    </span>
                  </td>
                  {/* 목표 안전재고 설정 */}
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center space-x-1 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => handleItemChange(p.barcode, 'targetStock', p.targetStock - 1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={p.targetStock}
                        onChange={(e) => handleItemChange(p.barcode, 'targetStock', parseInt(e.target.value) || 1)}
                        className="w-12 text-center font-mono font-bold text-white bg-transparent focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleItemChange(p.barcode, 'targetStock', p.targetStock + 1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                      <span className="text-[10px] text-slate-500">개</span>
                    </div>
                  </td>
                  {/* 최소 발주단위 설정 */}
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center space-x-1 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => handleItemChange(p.barcode, 'minOrderQty', p.minOrderQty - 1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={p.minOrderQty}
                        onChange={(e) => handleItemChange(p.barcode, 'minOrderQty', parseInt(e.target.value) || 1)}
                        className="w-12 text-center font-mono font-bold text-blue-400 bg-transparent focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleItemChange(p.barcode, 'minOrderQty', p.minOrderQty + 1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                      <span className="text-[10px] text-slate-500">개</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {savedId === p.barcode ? (
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-end space-x-0.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>저장됨</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">자동저장</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <p className="text-center text-slate-500 text-xs mt-3">
              (처음 100개 상품만 표시 중입니다. 더 찾으시려면 위 검색창을 이용해 주세요)
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
