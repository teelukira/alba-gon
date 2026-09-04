import React, { useState } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import { Product } from '../types';

interface QuantityModalProps {
  barcode: string;
  product?: Product;
  initialQuantity?: number;
  onSave: (quantity: number) => void;
  onClose: () => void;
}

export const QuantityModal: React.FC<QuantityModalProps> = ({
  barcode,
  product,
  initialQuantity = 1,
  onSave,
  onClose,
}) => {
  const [quantity, setQuantity] = useState<number>(initialQuantity);

  const handleAdjust = (delta: number) => {
    setQuantity((prev) => Math.max(0, prev + delta));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(quantity);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/25 backdrop-blur-[2px] p-0 sm:p-4">
      <div className="bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-xl animate-rise">
        <div className="p-6 pb-0 flex justify-between items-start gap-4">
          <div className="min-w-0">
            <p className="text-[13px] text-ink-faint tabular">{barcode}</p>
            <h2 className="mt-1 text-xl font-semibold text-ink leading-snug break-keep">
              {product ? product.name : '미등록 상품'}
            </h2>
            {product && (
              <p className="mt-1.5 text-[13px] text-ink-faint">
                최소 발주 {product.minOrderQty}개 · 매입 {product.cost.toLocaleString()}원
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="w-9 h-9 -mr-2 -mt-1 rounded-full text-ink-faint hover:text-ink hover:bg-sunken flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 수량 */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => handleAdjust(-1)}
              aria-label="수량 감소"
              className="w-14 h-14 rounded-full bg-sunken hover:bg-line text-ink flex items-center justify-center shrink-0 transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="text-center min-w-0">
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                aria-label="재고 수량"
                className="w-28 text-center text-5xl font-semibold text-ink bg-transparent focus:outline-none tabular"
              />
              <p className="mt-1 text-[13px] text-ink-faint">현재 재고</p>
            </div>

            <button
              type="button"
              onClick={() => handleAdjust(1)}
              aria-label="수량 증가"
              className="w-14 h-14 rounded-full bg-sage-50 hover:bg-sage-100 text-sage flex items-center justify-center shrink-0 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* 자주 쓰는 값 */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '품절', val: 0, setExact: true },
              { label: '+1', val: 1 },
              { label: '+5', val: 5 },
              { label: '+10', val: 10 },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => (btn.setExact ? setQuantity(0) : handleAdjust(btn.val))}
                className="h-11 rounded-xl bg-sunken hover:bg-line text-sm font-medium text-ink-soft transition-colors tabular"
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-full bg-sage hover:bg-sage-deep text-white font-medium transition-colors"
          >
            저장하고 다음 스캔
          </button>
        </form>
      </div>
    </div>
  );
};
