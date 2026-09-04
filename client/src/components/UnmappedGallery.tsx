import React, { useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
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
  const [selectedAudit, setSelectedAudit] = useState<AuditItem | null>(
    unmappedAudits[0] || null
  );
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('기타');
  const [minOrderQty, setMinOrderQty] = useState(10);
  const [targetStock, setTargetStock] = useState(10);
  const [cost, setCost] = useState(1400);

  const handleSelect = (audit: AuditItem) => {
    setSelectedAudit(audit);
    setProductName(audit.productName === '미등록 상품' ? '' : audit.productName);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAudit || !productName.trim()) return;

    const newProduct: Product = {
      barcode: selectedAudit.barcode,
      name: productName.trim(),
      category,
      price: 0,
      cost: Number(cost) || 0,
      targetStock: Number(targetStock) || 10,
      minOrderQty: Number(minOrderQty) || 10,
      photoUrl: selectedAudit.photoUrl,
      isNewProduct: false,
    };
    storageService.addProduct(newProduct);

    storageService.saveAudit({
      ...selectedAudit,
      productName: productName.trim(),
      isUnmapped: false,
      targetStock: newProduct.targetStock,
      minOrderQty: newProduct.minOrderQty,
    });

    onProductMapped();

    // 다음 상품으로
    const remaining = unmappedAudits.filter((a) => a.barcode !== selectedAudit.barcode);
    if (remaining.length > 0) {
      setSelectedAudit(remaining[0]);
      setProductName('');
    } else {
      setSelectedAudit(null);
    }
  };

  const fieldClass =
    'w-full h-11 px-3.5 rounded-xl bg-canvas border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-sage-300 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-[2px] p-5">
      <div className="bg-surface rounded-3xl w-full max-w-2xl shadow-xl animate-settle overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 pb-5 flex justify-between items-start gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">이름 없는 상품</h2>
            <p className="mt-1 text-sm text-ink-soft leading-relaxed break-keep">
              사진을 보고 이름을 적어 두면 다음부터 자동으로 인식합니다.
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

        {unmappedAudits.length === 0 ? (
          <p className="px-6 pb-12 pt-6 text-center text-sm text-ink-faint">
            등록할 상품이 없습니다
          </p>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5 px-6 pb-6">
            {/* 사진 */}
            <div className="space-y-3">
              <div className="aspect-square bg-sunken rounded-2xl overflow-hidden flex items-center justify-center">
                {selectedAudit?.photoUrl ? (
                  <img
                    src={selectedAudit.photoUrl}
                    alt="등록할 상품"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-7 h-7 text-ink-faint mx-auto mb-2" />
                    <span className="text-[13px] text-ink-faint">사진 없음</span>
                  </div>
                )}
              </div>

              {unmappedAudits.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {unmappedAudits.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleSelect(a)}
                      aria-label={`바코드 ${a.barcode} 선택`}
                      className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 transition-all ${
                        selectedAudit?.id === a.id
                          ? 'ring-2 ring-sage ring-offset-2 ring-offset-surface'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      {a.photoUrl ? (
                        <img src={a.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full bg-sunken flex items-center justify-center text-[13px] text-ink-faint tabular">
                          {a.barcode.slice(-4)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 입력 */}
            {selectedAudit && (
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-[13px] text-ink-faint">바코드</p>
                    <p className="mt-0.5 text-[15px] text-ink tabular">
                      {selectedAudit.barcode}
                    </p>
                    <p className="mt-1 text-[13px] text-ink-faint">
                      매장 재고 {selectedAudit.stockCount}개
                    </p>
                  </div>

                  <label className="block">
                    <span className="block mb-1.5 text-[13px] text-ink-soft">상품명</span>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="사진을 보고 적어 주세요"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className={fieldClass}
                    />
                  </label>

                  <label className="block">
                    <span className="block mb-1.5 text-[13px] text-ink-soft">분류</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="냉동/즉석">냉동/즉석</option>
                      <option value="유제품/음료">유제품/음료</option>
                      <option value="라면/면류">라면/면류</option>
                      <option value="과자/간식">과자/간식</option>
                      <option value="빵류">빵류</option>
                      <option value="기타">기타</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="block mb-1.5 text-[13px] text-ink-soft">발주단위</span>
                      <input
                        type="number"
                        min="1"
                        value={minOrderQty}
                        onChange={(e) =>
                          setMinOrderQty(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className={`${fieldClass} text-center tabular`}
                      />
                    </label>
                    <label className="block">
                      <span className="block mb-1.5 text-[13px] text-ink-soft">목표</span>
                      <input
                        type="number"
                        min="1"
                        value={targetStock}
                        onChange={(e) =>
                          setTargetStock(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className={`${fieldClass} text-center tabular`}
                      />
                    </label>
                    <label className="block">
                      <span className="block mb-1.5 text-[13px] text-ink-soft">매입가</span>
                      <input
                        type="number"
                        min="0"
                        value={cost}
                        onChange={(e) => setCost(parseInt(e.target.value) || 0)}
                        className={`${fieldClass} text-center tabular`}
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-12 rounded-full bg-sage hover:bg-sage-deep text-white text-sm font-medium transition-colors mt-auto"
                >
                  등록
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
