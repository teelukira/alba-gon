import React, { useState } from 'react';
import { Image as ImageIcon, Check, X, Tag, Plus, AlertTriangle } from 'lucide-react';
import { AuditItem, Product } from '../types';
import { storageService } from '../services/storage';

interface UnmappedGalleryProps {
  unmappedAudits: AuditItem[];
  onProductMapped: () => void;
  onClose: () => void;
}

export const UnmappedGallery: React.FC<UnmappedGalleryProps> = ({
  unmappedAudits,
  onProductMapped,
  onClose,
}) => {
  const [selectedAudit, setSelectedAudit] = useState<AuditItem | null>(unmappedAudits[0] || null);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('기타');
  const [minOrderQty, setMinOrderQty] = useState(10);
  const [targetStock, setTargetStock] = useState(10);
  const [price, setPrice] = useState(2000);
  const [cost, setCost] = useState(1400);

  const handleSelect = (audit: AuditItem) => {
    setSelectedAudit(audit);
    setProductName(audit.productName === '신규/미등록 상품' ? '' : audit.productName);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAudit || !productName.trim()) return;

    // 1. 마스터 DB에 정식 등록
    const newProduct: Product = {
      barcode: selectedAudit.barcode,
      name: productName.trim(),
      category,
      price: Number(price) || 0,
      cost: Number(cost) || 0,
      targetStock: Number(targetStock) || 10,
      minOrderQty: Number(minOrderQty) || 10,
      photoUrl: selectedAudit.photoUrl,
      isNewProduct: false,
    };
    storageService.addProduct(newProduct);

    // 2. 실사 기록의 상품명 및 미등록 플래그 갱신
    storageService.saveAudit({
      ...selectedAudit,
      productName: productName.trim(),
      isUnmapped: false,
      targetStock: newProduct.targetStock,
      minOrderQty: newProduct.minOrderQty,
    });

    onProductMapped();

    // 다음 미등록 상품으로 자동 전환
    const remaining = unmappedAudits.filter(a => a.barcode !== selectedAudit.barcode);
    if (remaining.length > 0) {
      setSelectedAudit(remaining[0]);
      setProductName('');
    } else {
      setSelectedAudit(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-amber-400">
            <ImageIcon className="w-5 h-5" />
            <h3 className="font-bold text-sm sm:text-base">미등록 상품 사진 검수 & 상품명 등록</h3>
            <span className="text-xs bg-amber-950 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800 font-semibold">
              {unmappedAudits.length}건 대기중
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {unmappedAudits.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-bold text-base text-white">모든 신규 상품 검수가 완료되었습니다!</p>
            <p className="text-xs text-slate-500 mt-1">알바가 찍은 미등록 상품이 모두 마스터 DB에 등록되었습니다.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {/* 좌측: 사진 및 상품 목록 */}
            <div className="space-y-3">
              {selectedAudit?.photoUrl ? (
                <div className="aspect-square bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-inner flex items-center justify-center">
                  <img
                    src={selectedAudit.photoUrl}
                    alt="Product"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-slate-600">
                  <ImageIcon className="w-12 h-12 mb-2" />
                  <span className="text-xs text-slate-500">알바가 찍은 사진 없음</span>
                </div>
              )}

              {/* 하단 미등록 바코드 썸네일 리스트 */}
              <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
                {unmappedAudits.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleSelect(a)}
                    className={`p-1.5 rounded-xl border shrink-0 text-left transition-all ${
                      selectedAudit?.id === a.id
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-black overflow-hidden flex items-center justify-center mb-1">
                      {a.photoUrl ? (
                        <img src={a.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono block truncate w-12 text-center">
                      ...{a.barcode.slice(-4)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 우측: 사장님 상품 정보 입력 폼 */}
            {selectedAudit && (
              <form onSubmit={handleSave} className="space-y-3 text-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                    <span className="text-[11px] text-slate-400">인식된 바코드 번호</span>
                    <p className="font-mono font-bold text-base text-emerald-400">{selectedAudit.barcode}</p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      알바 조사 재고: <strong className="text-white">{selectedAudit.stockCount}개</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      상품명 입력 <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="사진을 보고 상품명을 적어주세요 (예: 포켓몬초코롤)"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">카테고리</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-hidden"
                      >
                        <option value="냉동/즉석">냉동/즉석</option>
                        <option value="유제품/음료">유제품/음료</option>
                        <option value="라면/면류">라면/면류</option>
                        <option value="과자/간식">과자/간식</option>
                        <option value="빵류">빵류</option>
                        <option value="기타">기타</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        최소 발주량 (MOQ)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={minOrderQty}
                        onChange={(e) => setMinOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">목표 안전재고</label>
                      <input
                        type="number"
                        min="1"
                        value={targetStock}
                        onChange={(e) => setTargetStock(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-hidden font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">매입 단가 (₩)</label>
                      <input
                        type="number"
                        min="0"
                        value={cost}
                        onChange={(e) => setCost(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex space-x-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/30"
                  >
                    <Check className="w-4 h-4" />
                    <span>마스터 DB에 영구 등록하기</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
