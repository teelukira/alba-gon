import React, { useState, useEffect } from 'react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { QuantityModal } from '../components/QuantityModal';
import { PhotoCaptureModal } from '../components/PhotoCaptureModal';
import { AuditItem, Product } from '../types';
import { storageService } from '../services/storage';
import { cloudSyncService, SyncStatus } from '../services/cloudSyncService';
import { CheckCircle2, Clock, Trash2, Camera, Cloud, CloudCheck, RefreshCw, Send } from 'lucide-react';

export const WorkerApp: React.FC = () => {
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
  const [detectedProduct, setDetectedProduct] = useState<Product | undefined>(undefined);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [step, setStep] = useState<'IDLE' | 'QUANTITY' | 'PHOTO'>('IDLE');
  const [workerName, setWorkerName] = useState('주간알바');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('DISCONNECTED');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState(false);

  useEffect(() => {
    setAudits(storageService.getAudits());
    setWorkerName(storageService.getSettings().workerName);

    // 1. 클라우드 실시간 동기화 연결
    cloudSyncService.connect(undefined, 'WORKER');

    // 2. 다른 기기(사장님 등)에서 동기화 이벤트 수신 시 화면 즉시 갱신
    const unsubSync = cloudSyncService.onSync((newAudits) => {
      setAudits(newAudits);
    });

    // 3. 연결 상태 감시
    const unsubStatus = cloudSyncService.onStatusChange((st, time) => {
      setSyncStatus(st);
      if (time) setLastSyncTime(time);
    });

    return () => {
      unsubSync();
      unsubStatus();
    };
  }, []);

  // 바코드 감지 핸들러
  const handleBarcodeDetected = (barcode: string) => {
    if (step !== 'IDLE') return;

    setActiveBarcode(barcode);
    const { product } = storageService.findProduct(barcode);
    setDetectedProduct(product);

    if (product) {
      setPendingPhoto(null);
      setStep('QUANTITY');
    } else {
      setStep('PHOTO');
    }
  };

  const handlePhotoCaptured = (photoBase64: string) => {
    setPendingPhoto(photoBase64);
    setStep('QUANTITY');
  };

  const handlePhotoSkipped = () => {
    setPendingPhoto(null);
    setStep('QUANTITY');
  };

  // 수량 저장 완료 핸들러 -> 로컬 저장 + 사장님 폰으로 즉시 클라우드 전송!
  const handleSaveQuantity = (quantity: number) => {
    if (!activeBarcode) return;

    const isUnmapped = !detectedProduct;
    const productName = detectedProduct ? detectedProduct.name : '신규/미등록상품';

    storageService.saveAudit({
      barcode: activeBarcode,
      productName,
      stockCount: quantity,
      targetStock: detectedProduct ? detectedProduct.targetStock : 10,
      minOrderQty: detectedProduct ? detectedProduct.minOrderQty : 1,
      photoUrl: pendingPhoto || undefined,
      isUnmapped,
      workerName,
    });

    const updated = storageService.getAudits();
    setAudits(updated);
    handleCloseModals();

    // ★ 클라우드 브로드캐스트 (사장님 스마트폰으로 0.1초 만에 자동 전송)
    cloudSyncService.broadcastAudits(updated, 'WORKER');
  };

  const handleCloseModals = () => {
    setStep('IDLE');
    setActiveBarcode(null);
    setDetectedProduct(undefined);
    setPendingPhoto(null);
  };

  const handleDeleteAudit = (id: string) => {
    storageService.deleteAudit(id);
    const updated = storageService.getAudits();
    setAudits(updated);
    cloudSyncService.broadcastAudits(updated, 'WORKER');
  };

  // 사장님께 수동 즉시 전송 버튼
  const handleManualSendToAdmin = async () => {
    setIsSending(true);
    const success = await cloudSyncService.broadcastAudits(audits, 'WORKER');
    setIsSending(false);
    if (success) {
      setSendSuccessMsg(true);
      setTimeout(() => setSendSuccessMsg(false), 3000);
    }
  };

  const unmappedCount = audits.filter((a) => a.isUnmapped).length;

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-20">
      {/* 1. 실시간 클라우드 동기화 상태 배너 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xs flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              syncStatus === 'CONNECTED' ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-amber-400'
            }`}
          />
          <div className="flex flex-col">
            <span className="font-semibold text-slate-200 text-[11px] flex items-center space-x-1">
              <span>{syncStatus === 'CONNECTED' ? '사장님 폰과 실시간 연결됨' : '클라우드 연결 중..'}</span>
            </span>
            {lastSyncTime && (
              <span className="text-[10px] text-slate-500">마지막 동기화: {lastSyncTime}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleManualSendToAdmin}
          disabled={isSending || audits.length === 0}
          className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-[11px] transition-all flex items-center space-x-1 shadow-xs shadow-blue-600/30"
          title="현재 실사 목록을 사장님 폰으로 즉시 전송"
        >
          {isSending ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Send className="w-3 h-3" />
          )}
          <span>{sendSuccessMsg ? '전송 완료!' : '사장님께 전송'}</span>
        </button>
      </div>

      {/* 2. 실사 진행 상황 요약 카드 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base">
            {audits.length}
          </div>
          <div>
            <span className="font-bold text-white block">오늘 실사 품목</span>
            <span className="text-slate-400 text-[11px]">{workerName} 근무자</span>
          </div>
        </div>

        {unmappedCount > 0 ? (
          <div className="flex items-center space-x-1.5 bg-amber-950/70 border border-amber-800/60 px-2.5 py-1 rounded-xl text-amber-300">
            <Camera className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px]">미등록 사진 {unmappedCount}개</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>실시간 자동 보존</span>
          </div>
        )}
      </div>

      {/* 3. 카메라 실시간 바코드 스캐너 */}
      <BarcodeScanner onDetected={handleBarcodeDetected} isPaused={step !== 'IDLE'} />

      {/* 4. 최근 실사 완료 리스트 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-xs text-slate-400 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>최근 스캔한 재고 ({audits.length})</span>
          </h3>
          {audits.length > 0 && (
            <span className="text-[11px] text-slate-500">실시간 클라우드 보관 중</span>
          )}
        </div>

        {audits.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center text-xs text-slate-500">
            위 카메라에 상품 바코드를 비추면 자동으로 인식합니다.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
            {audits.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800/90 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="space-y-0.5 max-w-[68%]">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-xs text-white truncate block">
                      {item.productName}
                    </span>
                    {item.isUnmapped && (
                      <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded shrink-0">
                        사진첨부
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                    <span>{item.barcode}</span>
                    <span>•</span>
                    <span className="text-slate-500">{item.updatedAt}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-mono font-bold text-sm">
                    {item.stockCount}개
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAudit(item.id);
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 active:bg-rose-900 text-slate-400 hover:text-rose-300 transition-colors border border-slate-700/60"
                    title="실사 기록 삭제"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 사진 촬영 모달 (미등록 신상품일 때) */}
      {step === 'PHOTO' && activeBarcode && (
        <PhotoCaptureModal
          barcode={activeBarcode}
          onCaptured={handlePhotoCaptured}
          onSkip={handlePhotoSkipped}
          onClose={handleCloseModals}
        />
      )}

      {/* 수량 입력 모달 */}
      {step === 'QUANTITY' && activeBarcode && (
        <QuantityModal
          barcode={activeBarcode}
          product={detectedProduct}
          initialQuantity={1}
          onSave={handleSaveQuantity}
          onClose={handleCloseModals}
        />
      )}
    </div>
  );
};