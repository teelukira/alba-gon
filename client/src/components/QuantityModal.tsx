import React, { useState } from 'react';
import { Plus, Minus, Check, X, Tag, PackageCheck } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 text-white shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">
              {barcode}
            </span>
            <h3 className="font-bold text-lg mt-1 text-white leading-tight">
              {product ? product.name : '신규/미등록 상품'}
            </h3>
            {product && (
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
                <span>단가 ₩{product.cost.toLocaleString()}</span>
                <span>•</span>
                <span>소비자가 ₩{product.price.toLocaleString()}</span>
                <span>•</span>
                <span className="text-blue-400 font-semibold">최소발주 {product.minOrderQty}개</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 수량 대형 디스플레이 */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleAdjust(-1)}
              className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-slate-200 transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="text-center">
              <span className="text-xs text-slate-500 font-medium block">현재 매장 재고</span>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 text-center font-bold text-4xl text-white bg-transparent focus:outline-hidden font-mono"
              />
              <span className="text-xs text-slate-400">개</span>
            </div>

            <button
              type="button"
              onClick={() => handleAdjust(1)}
              className="w-12 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 flex items-center justify-center text-white transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* 고속 증감 버튼들 (+1, +5, +10, 0개 세팅) */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '0개 (품절)', val: 0, setExact: true },
              { label: '+1', val: 1 },
              { label: '+5', val: 5 },
              { label: '+10', val: 10 },
            ].map((btn, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => (btn.setExact ? setQuantity(0) : handleAdjust(btn.val))}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-bold text-slate-200 transition-colors border border-slate-700/60"
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* 확인 / 저장 버튼 */}
          <div className="pt-2 flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm transition-colors flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/30"
            >
              <Check className="w-5 h-5" />
              <span>재고 {quantity}개 저장 (다음 스캔)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
