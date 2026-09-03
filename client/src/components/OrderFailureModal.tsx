import React, { useState } from 'react';
import { AlertOctagon, Trash2, RefreshCw, ArrowRightLeft, X, Check, Edit2, AlertCircle } from 'lucide-react';
import { OrderFailure, OrderItem } from '../types';
import { storageService } from '../services/storage';
import { younmeOrderService } from '../services/younmeOrderService';

interface OrderFailureModalProps {
  failures: OrderFailure[];
  onUpdate: () => void;
  onClose: () => void;
  onOpenAliasModal: (barcode: string) => void;
}

export const OrderFailureModal: React.FC<OrderFailureModalProps> = ({
  failures,
  onUpdate,
  onClose,
  onOpenAliasModal,
}) => {
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [newQty, setNewQty] = useState<number>(10);

  // 사장님 요청: 특정 실패 행 삭제
  const handleDelete = (id: string) => {
    storageService.deleteOrderFailure(id);
    onUpdate();
  };

  // 사장님 요청: 전체 비우기
  const handleClearAll = () => {
    if (confirm('발주 실패 목록을 모두 비우시겠습니까?')) {
      storageService.clearOrderFailures();
      onUpdate();
    }
  };

  // 사장님 요청: 수량 수정 후 재시도
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
        // 성공 시 실패함에서 해당 행 자동 제거!
        storageService.deleteOrderFailure(failure.id);
        alert(`"${failure.productName}" ${qtyToOrder}개 발주 성공!`);
      } else {
        alert('재시도했으나 여전히 주문이 완료되지 않았습니다.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '발주 실패';
      alert(msg);
    } finally {
      setRetryingId(null);
      setEditingQtyId(null);
      onUpdate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-rose-500/40 rounded-3xl w-full max-w-3xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-rose-400">
            <AlertOctagon className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-base">유앤미24 발주 실패 관리함</h3>
              <p className="text-[11px] text-slate-400">
                주문이 거부되거나 단종/최소수량 미달인 항목입니다. 행을 삭제하거나 수량을 수정하여 재발주하세요.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {failures.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                전체 비우기
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 테이블 목록 */}
        <div className="p-4 flex-1 overflow-y-auto">
          {failures.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Check className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <p className="font-bold text-base text-white">발주 실패 항목이 없습니다!</p>
              <p className="text-xs text-slate-500 mt-1">모든 발주가 성공적으로 유앤미24에 접수되었습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {failures.map((f) => (
                <div
                  key={f.id}
                  className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-600 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white">{f.productName}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          f.failReason === 'BELOW_MIN_QTY'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : f.failReason === 'DISCONTINUED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {f.failReason === 'BELOW_MIN_QTY'
                          ? '최소수량 미달'
                          : f.failReason === 'DISCONTINUED'
                          ? '단종/검색불가'
                          : '품절/주문불가'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
                      <span className="text-slate-300">{f.barcode}</span>
                      <span>•</span>
                      <span>요청 {f.attemptedQty}개</span>
                      <span>•</span>
                      <span className="text-blue-400">최소 {f.minOrderQty}개 필요</span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-500">{f.failedAt}</span>
                    </div>

                    <p className="text-xs text-rose-300 font-medium flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{f.failDetail}</span>
                    </p>
                  </div>

                  {/* 사장님 조치 버튼들 (행 삭제, 수량 수정 재시도, 단종 매핑) */}
                  <div className="flex items-center space-x-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700/60">
                    {/* 수량 인라인 수정 폼 */}
                    {editingQtyId === f.id ? (
                      <div className="flex items-center space-x-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-blue-500">
                        <input
                          type="number"
                          min="1"
                          value={newQty}
                          onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-14 text-center font-bold text-xs bg-transparent text-white focus:outline-hidden"
                        />
                        <span className="text-[11px] text-slate-400">개로</span>
                        <button
                          onClick={() => handleRetryWithNewQty(f, newQty)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold rounded-lg text-white"
                        >
                          주문
                        </button>
                        <button
                          onClick={() => setEditingQtyId(null)}
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* 1. 최소수량 채워 재주문 */}
                        {f.failReason === 'BELOW_MIN_QTY' && (
                          <button
                            onClick={() => {
                              setEditingQtyId(f.id);
                              setNewQty(f.minOrderQty);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-colors flex items-center space-x-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{f.minOrderQty}개로 수량 변경</span>
                          </button>
                        )}

                        {/* 2. 단종 건 신규 바코드 대체 매핑 */}
                        {f.failReason === 'DISCONTINUED' && (
                          <button
                            onClick={() => onOpenAliasModal(f.barcode)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-colors flex items-center space-x-1"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>신규 바코드 매핑</span>
                          </button>
                        )}

                        {/* 3. 일반 재시도 */}
                        <button
                          disabled={retryingId === f.id}
                          onClick={() => handleRetryWithNewQty(f)}
                          className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors"
                          title="재시도"
                        >
                          <RefreshCw className={`w-4 h-4 ${retryingId === f.id ? 'animate-spin' : ''}`} />
                        </button>
                      </>
                    )}

                    {/* 4. 사장님 필수 요청: 행 삭제 버튼 */}
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 border border-rose-800/40 transition-colors"
                      title="이 항목 삭제 (발주 제외)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
