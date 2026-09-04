import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { CameraOff, Keyboard, Search, ChevronRight } from 'lucide-react';
import { soundManager } from '../services/sound';
import { storageService } from '../services/storage';
import { Product } from '../types';

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  isPaused: boolean;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, isPaused }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [matchedProducts, setMatchedProducts] = useState<Product[]>([]);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (isPaused) return;

    let active = true;
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    const startCamera = async () => {
      try {
        setCameraError(null);
        setIsScanning(true);

        const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (videoInputDevices.length === 0) {
          setCameraError('카메라를 찾을 수 없습니다.');
          return;
        }

        // 후면 카메라 우선
        const selectedDevice =
          videoInputDevices.find(
            (device) =>
              device.label.toLowerCase().includes('back') ||
              device.label.toLowerCase().includes('후면') ||
              device.label.toLowerCase().includes('rear')
          ) || videoInputDevices[0];

        if (videoRef.current && active) {
          await codeReader.decodeFromVideoDevice(
            selectedDevice.deviceId,
            videoRef.current,
            (result) => {
              if (result && active) {
                soundManager.playScanSuccess();
                onDetected(result.getText().trim());
              }
            }
          );
        }
      } catch (err: unknown) {
        if (active) {
          setCameraError(
            err instanceof Error ? err.message : '카메라 권한을 허용해주세요.'
          );
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      setIsScanning(false);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isPaused, onDetected]);

  // 바코드 뒷자리 또는 상품명으로 실시간 검색
  useEffect(() => {
    const trimmed = manualBarcode.trim();
    setMatchedProducts(
      trimmed.length >= 2 ? storageService.searchProductsByPattern(trimmed, 8) : []
    );
  }, [manualBarcode]);

  const handleSelectProduct = (p: Product) => {
    soundManager.playScanSuccess();
    onDetected(p.barcode);
    setManualBarcode('');
    setMatchedProducts([]);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = manualBarcode.trim();
    if (!query) return;

    if (matchedProducts.length === 1) {
      handleSelectProduct(matchedProducts[0]);
      return;
    }

    soundManager.playScanSuccess();
    onDetected(query);
    setManualBarcode('');
    setMatchedProducts([]);
  };

  // 검색어와 일치하는 자리를 굵게
  const renderHighlightedBarcode = (barcode: string, query: string) => {
    const q = query.trim();
    const idx = q ? barcode.lastIndexOf(q) : -1;
    if (idx === -1) return <span className="tabular text-ink-faint">{barcode}</span>;

    return (
      <span className="tabular text-ink-faint">
        {barcode.substring(0, idx)}
        <span className="font-semibold text-ink">
          {barcode.substring(idx, idx + q.length)}
        </span>
        {barcode.substring(idx + q.length)}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* 뷰파인더 */}
      <div className="relative aspect-4/3 bg-sunken rounded-2xl overflow-hidden">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity ${
            isPaused ? 'opacity-40' : 'opacity-100'
          }`}
          playsInline
          muted
        />

        {!isPaused && isScanning && !cameraError && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-3/5 h-1/3 rounded-xl ring-2 ring-white/70 shadow-[0_0_0_100vmax_rgba(46,42,37,0.28)]" />
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 bg-sunken flex flex-col items-center justify-center gap-2 p-6 text-center">
            <CameraOff className="w-7 h-7 text-ink-faint" />
            <p className="text-sm text-ink-soft">카메라를 열 수 없습니다</p>
            <p className="text-[13px] text-ink-faint leading-relaxed break-keep">
              아래에 바코드 뒷자리나 상품명을 입력해 주세요
            </p>
          </div>
        )}
      </div>

      {/* 직접 입력 */}
      <div className="relative">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Keyboard className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="바코드 뒷자리 또는 상품명"
              aria-label="바코드 또는 상품명 입력"
              className="w-full h-12 pl-10 pr-4 rounded-full bg-surface border border-line text-[15px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-sage-300 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="h-12 px-5 rounded-full bg-sunken hover:bg-line text-sm font-medium text-ink-soft shrink-0 transition-colors"
          >
            입력
          </button>
        </form>

        {/* 일치하는 상품 */}
        {manualBarcode.trim().length >= 2 && (
          <div className="absolute left-0 right-0 bottom-full mb-2 bg-surface border border-line rounded-2xl shadow-lg overflow-hidden z-40 animate-settle">
            {matchedProducts.length > 0 ? (
              <ul className="max-h-72 overflow-y-auto divide-y divide-line">
                {matchedProducts.map((p) => (
                  <li key={p.barcode}>
                    <button
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-sunken transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] text-ink leading-snug break-keep">
                          {p.name}
                        </span>
                        <span className="block mt-0.5 text-[13px]">
                          {renderHighlightedBarcode(p.barcode, manualBarcode)}
                          <span className="text-ink-faint"> · 최소 {p.minOrderQty}개</span>
                        </span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-5 text-center">
                <Search className="w-5 h-5 text-ink-faint mx-auto mb-2" />
                <p className="text-sm text-ink">등록되지 않은 바코드입니다</p>
                <p className="mt-1 text-[13px] text-ink-faint leading-relaxed break-keep">
                  입력을 누르면 사진 촬영으로 넘어갑니다
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
