import React, { useState, useEffect } from 'react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { QuantityModal } from '../components/QuantityModal';
import { PhotoCaptureModal } from '../components/PhotoCaptureModal';
import { AuditItem, Product } from '../types';
import { storageService } from '../services/storage';
import { CheckCircle2, AlertCircle, Clock, Trash2, Edit3, Camera, Sparkles } from 'lucide-react';

export const WorkerApp: React.FC = () => {
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
  const [detectedProduct, setDetectedProduct] = useState<Product | undefined>(undefined);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [step, setStep] = useState<'IDLE' | 'QUANTITY' | 'PHOTO'>('IDLE');
  const [workerName, setWorkerName] = useState('야간알바');

  useEffect(() => {
    setAudits(storageService.getAudits());
    setWorkerName(storageService.getSettings().workerName);
  }, []);

  // 바코드 감지 핸들러
  const handleBarcodeDetected = (barcode: string) => {
    if (step !== 'IDLE') return; // 이미 모달 진행 중이면 무시

    setActiveBarcode(barcode);
    const { product } = storageService.findProduct(barcode);
    setDetectedProduct(product);

    if (product) {
      // 등록된 상품 -> 바로 수량 입력
      setPendingPhoto(null);
      setStep('QUANTITY');
    } else {
      // 미등록 상품 -> 사장님 피드백: "바코드 번호에 매핑된 상품명이 없다면 사진을 하나 더 찍어"
      setStep('PHOTO');
    }
  };

  // 사진 촬영 완료 핸들러
  const handlePhotoCaptured = (photoBase64: string) => {
    setPendingPhoto(photoBase64);
    setStep('QUANTITY');
  };

  // 사진 없이 건너뛰기
  const handlePhotoSkipped = () => {
    setPendingPhoto(null);
    setStep('QUANTITY');
  };

  // 수량 저장 완료 핸들러
  const handleSaveQuantity = (quantity: number) => {
    if (!activeBarcode) return;

    const isUnmapped = !detectedProduct;
    const productName = detectedProduct ? detectedProduct.name : '신규/미등록 상품';

    const saved = storageService.saveAudit({
      barcode: activeBarcode,
      productName,
      stockCount: quantity,
      targetStock: detectedProduct ? detectedProduct.targetStock : 10,
      minOrderQty: detectedProduct ? detectedProduct.minOrderQty : 10,
      photoUrl: pendingPhoto || undefined,
      isUnmapped,
      workerName,
    });

    setAudits(storageService.getAudits());
    handleCloseModals();
  };

  const handleCloseModals = () => {
    setStep('IDLE');
    setActiveBarcode(null);
    setDetectedProduct(undefined);
    setPendingPhoto(null);
  };

  const handleDeleteAudit = (id: string) => {
    if (confirm('이 실사 기록을 삭제하시겠습니까?')) {
      storageService.deleteAudit(id);
      setAudits(storageService.getAudits());
    }
  };

  const unmappedCount = audits.filter(a => a.isUnmapped).length;

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-20">
      {/* 실사 진행 상황 요약 카드 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
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
          <div className="flex items-center space-x-1 text-slate-500 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>실시간 자동저장</span>
          </div>
        )}
      </div>

      {/* 카메라 실시간 바코드 스캐너 */}
      <BarcodeScanner
        onDetected={handleBarcodeDetected}
        isPaused={step !== 'IDLE'}
      />

      {/* 최근 실사 완료 리스트 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-xs text-slate-400 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>최근 스캔한 재고 ({audits.length})</span>
          </h3>
          {audits.length > 0 && (
            <span className="text-[11px] text-slate-500">터치하여 수량 확인</span>
          )}
        </div>

        {audits.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center text-xs text-slate-500">
            위 카메라에 상품 바코드를 비추면 자동으로 인식됩니다.
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
                    onClick={() => handleDeleteAudit(item.id)}
                    className="text-slate-600 hover:text-rose-400 p-1"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
