import React, { useState, useEffect } from 'react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { QuantityModal } from '../components/QuantityModal';
import { PhotoCaptureModal } from '../components/PhotoCaptureModal';
import { AuditItem, Product } from '../types';
import { storageService } from '../services/storage';
import { cloudSyncService, SyncStatus } from '../services/cloudSyncService';
import { Trash2, Camera, RefreshCw, Check } from 'lucide-react';

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

    cloudSyncService.connect(undefined, 'WORKER');

    const unsubSync = cloudSyncService.onSync((newAudits) => {
      setAudits(newAudits);
    });

    const unsubStatus = cloudSyncService.onStatusChange((st, time) => {
      setSyncStatus(st);
      if (time) setLastSyncTime(time);
    });

    return () => {
      unsubSync();
      unsubStatus();
    };
  }, []);

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

  const handleSaveQuantity = (quantity: number) => {
    if (!activeBarcode) return;

    const isUnmapped = !detectedProduct;
    const productName = detectedProduct ? detectedProduct.name : '미등록 상품';

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
  const isConnected = syncStatus === 'CONNECTED';

  return (
    <div className="max-w-md mx-auto px-5 py-6 space-y-6 pb-24">
      {/* 오늘 실사 현황 */}
      <section>
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm text-ink-faint">{workerName}</p>
            <p className="mt-1 text-[28px] leading-none font-semibold text-ink tabular">
              {audits.length}
              <span className="ml-1.5 text-base font-normal text-ink-faint">개 확인</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[13px] text-ink-faint">
            <span
              className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-sage' : 'bg-clay'}`}
              aria-hidden
            />
            <span>{isConnected ? '연결됨' : '연결 중'}</span>
          </div>
        </div>

        {unmappedCount > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-clay">
            <Camera className="w-3.5 h-3.5" />
            사진으로 남긴 미등록 {unmappedCount}개
          </p>
        )}
      </section>

      {/* 스캐너 */}
      <BarcodeScanner onDetected={handleBarcodeDetected} isPaused={step !== 'IDLE'} />

      {/* 스캔 목록 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-soft">스캔한 재고</h2>
          {audits.length > 0 && (
            <button
              type="button"
              onClick={handleManualSendToAdmin}
              disabled={isSending}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-sage hover:text-sage-deep disabled:text-ink-faint transition-colors"
            >
              {isSending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : sendSuccessMsg ? (
                <Check className="w-3.5 h-3.5" />
              ) : null}
              <span>{sendSuccessMsg ? '보냈습니다' : '지금 보내기'}</span>
            </button>
          )}
        </div>

        {audits.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-faint leading-relaxed text-balance break-keep">
            상품 바코드를 비추면 자동으로 인식합니다
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {audits.map((item) => (
              <li key={item.id} className="py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-ink leading-snug break-keep">
                    {item.productName}
                    {item.isUnmapped && (
                      <span className="ml-1.5 align-middle text-[12px] text-clay">사진</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-faint tabular">
                    {item.barcode} · {item.updatedAt}
                  </p>
                </div>

                <span className="text-[17px] font-semibold text-ink tabular shrink-0">
                  {item.stockCount}
                </span>

                <button
                  type="button"
                  onClick={() => handleDeleteAudit(item.id)}
                  aria-label={`${item.productName} 삭제`}
                  className="w-9 h-9 rounded-full text-ink-faint hover:text-brick hover:bg-brick-soft flex items-center justify-center shrink-0 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {lastSyncTime && audits.length > 0 && (
          <p className="pt-1 text-[13px] text-ink-faint">마지막 전송 {lastSyncTime}</p>
        )}
      </section>

      {step === 'PHOTO' && activeBarcode && (
        <PhotoCaptureModal
          barcode={activeBarcode}
          onCaptured={handlePhotoCaptured}
          onSkip={handlePhotoSkipped}
          onClose={handleCloseModals}
        />
      )}

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
