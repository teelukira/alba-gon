import React, { useState } from 'react';
import { Trash2, RefreshCw, ArrowRightLeft, X } from 'lucide-react';
import { OrderFailure, OrderItem } from '../types';
import { storageService } from '../services/storage';
import { younmeOrderService } from '../services/younmeOrderService';

interface OrderFailureModalProps {
  failures: OrderFailure[];
  onUpdate: () => void;
  onClose: () => void;
  onOpenAliasModal: (barcode: string) => void;
}

const FAIL_LABEL: Record<string, string> = {
  BELOW_MIN_QTY: '수량 부족',
  DISCONTINUED: '단종',
};

export const OrderFailureModal: React.FC<OrderFailureModalProps> = ({
  failures,
  onUpdate,
  onClose,
  onOpenAliasModal,
}) => {
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [newQty, setNewQty] = useState<number>(10);

  const handleDelete = (id: string) => {
    storageService.deleteOrderFailure(id);
    onUpdate();
  };

  const handleClearAll = () => {
    if (confirm('실패 목록을 모두 비울까요?')) {
      storageService.clearOrderFailures();
      onUpdate();
    }
  };

  const handleRetryWithNewQty = async (failure: OrderFailure, customQty?: number) => {
    const qtyToOrder = customQty || failure.minOrderQty;
    setRetryingId(failure.id);

    const item: OrderItem = {
      barcode: failure.barcode,
      productName: failure.productName,
      currentStock: 0,
      targetStock: qtyToOrder,
      recommendedQty: qtyToOrder,
      finalOrderQty: qtyToOrder,
      minOrderQty: failure.minOrderQty,
      isBelowMinQty: false,
      status: 'PENDING',
    };

    try {
      const res = await younmeOrderService.executeOrder([item], () => {});
      if (res.successCount > 0) {
        storageService.deleteOrderFailure(failure.id);
        alert(`${failure.productName} ${qtyToOrder}개를 발주했습니다.`);
      } else {
        alert('다시 시도했지만 주문이 접수되지 않았습니다.');
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '발주에 실패했습니다.');
    } finally {
      setRetryingId(null);
      setEditingQtyId(null);
      onUpdate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-[2px] p-5">
      <div className="bg-surface rounded-3xl w-full max-w-3xl shadow-xl animate-settle overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 pb-5 flex justify-between items-start gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">발주되지 않은 상품</h2>
            <p className="mt-1 text-sm text-ink-soft leading-relaxed break-keep">
              수량을 고치거나 바코드를 연결한 뒤 다시 시도할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {failures.length > 0 && (
              <button
                onClick={handleClearAll}
                className="h-9 px-4 rounded-full text-[13px] font-medium text-ink-faint hover:text-brick hover:bg-brick-soft transition-colors"
              >
                모두 비우기
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="닫기"
              className="w-9 h-9 -mr-2 rounded-full text-ink-faint hover:text-ink hover:bg-sunken flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 flex-1 overflow-y-auto">
          {failures.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-faint">
              발주에 실패한 상품이 없습니다
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {failures.map((f) => (
                <li
                  key={f.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-ink leading-snug break-keep">
                      {f.productName}
                      {FAIL_LABEL[f.failReason] && (
                        <span className="ml-2 align-middle text-[13px] text-clay">
                          {FAIL_LABEL[f.failReason]}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-[13px] text-ink-faint tabular">
                      {f.barcode} · 요청 {f.attemptedQty}개 · 최소 {f.minOrderQty}개 ·{' '}
                      {f.failedAt}
                    </p>
                    {f.failDetail && (
                      <p className="mt-1 text-[13px] text-ink-soft leading-relaxed break-keep">
                        {f.failDetail}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {editingQtyId === f.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          value={newQty}
                          onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))}
                          aria-label="발주 수량"
                          autoFocus
                          className="w-16 h-9 px-2 text-center rounded-lg bg-canvas border border-sage-300 text-sm text-ink tabular focus:outline-none"
                        />
                        <button
                          onClick={() => handleRetryWithNewQty(f, newQty)}
                          className="h-9 px-4 rounded-full bg-sage hover:bg-sage-deep text-white text-[13px] font-medium transition-colors"
                        >
                          주문
                        </button>
                        <button
                          onClick={() => setEditingQtyId(null)}
                          aria-label="취소"
                          className="w-9 h-9 rounded-full text-ink-faint hover:text-ink hover:bg-sunken flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {f.failReason === 'BELOW_MIN_QTY' && (
                          <button
                            onClick={() => {
                              setEditingQtyId(f.id);
                              setNewQty(f.minOrderQty);
                            }}
                            className="h-9 px-4 rounded-full text-[13px] font-medium text-ink-soft hover:text-ink hover:bg-sunken whitespace-nowrap transition-colors"
                          >
                            {f.minOrderQty}개로 바꾸기
                          </button>
                        )}

                        {f.failReason === 'DISCONTINUED' && (
                          <button
                            onClick={() => onOpenAliasModal(f.barcode)}
                            className="h-9 px-4 rounded-full text-[13px] font-medium text-ink-soft hover:text-ink hover:bg-sunken inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            바코드 연결
                          </button>
                        )}

                        <button
                          disabled={retryingId === f.id}
                          onClick={() => handleRetryWithNewQty(f)}
                          aria-label="다시 시도"
                          className="w-9 h-9 rounded-full text-ink-faint hover:text-ink hover:bg-sunken flex items-center justify-center transition-colors"
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${retryingId === f.id ? 'animate-spin' : ''}`}
                          />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDelete(f.id)}
                      aria-label={`${f.productName} 삭제`}
                      className="w-9 h-9 rounded-full text-ink-faint hover:text-brick hover:bg-brick-soft flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
