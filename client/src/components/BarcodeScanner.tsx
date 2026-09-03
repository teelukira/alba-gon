import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, CameraOff, RefreshCw, Zap, Keyboard, Sparkles } from 'lucide-react';
import { soundManager } from '../services/sound';

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  isPaused: boolean;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, isPaused }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // 샘플 바코드 (테스트 및 데모 편의용)
  const sampleBarcodes = [
    { code: '8801123724680', name: '마늘퐁닭매콤마늘치킨' },
    { code: '8801123701445', name: '켄터키핫도그' },
    { code: '8801227180030', name: '사조고기포자만두' },
    { code: '8809999999999', name: '미등록신상품' },
  ];

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
          setHasCamera(false);
          setCameraError('사용 가능한 카메라 장치를 찾을 수 없습니다.');
          return;
        }

        // 후면 카메라(environment) 우선 선택
        const selectedDevice = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('후면') ||
          device.label.toLowerCase().includes('rear')
        ) || videoInputDevices[0];

        if (videoRef.current && active) {
          await codeReader.decodeFromVideoDevice(
            selectedDevice.deviceId,
            videoRef.current,
            (result, err) => {
              if (result && active) {
                const text = result.getText().trim();
                soundManager.playScanSuccess();
                onDetected(text);
              }
              if (err && !(err.name === 'NotFoundException')) {
                // Ignore typical frame decode misses
              }
            }
          );
        }
      } catch (err: unknown) {
        if (active) {
          setHasCamera(false);
          const errorMessage = err instanceof Error ? err.message : '카메라 권한을 허용해주세요.';
          setCameraError(errorMessage);
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      setIsScanning(false);
      // 스트림 정지
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isPaused, facingMode, onDetected]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      soundManager.playScanSuccess();
      onDetected(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  const handleSampleClick = (code: string) => {
    soundManager.playScanSuccess();
    onDetected(code);
  };

  return (
    <div className="relative bg-black rounded-3xl overflow-hidden shadow-xl border border-slate-800">
      {/* 카메라 뷰파인더 */}
      <div className="relative aspect-4/3 sm:aspect-16/9 bg-slate-950 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${isPaused ? 'opacity-30 blur-xs' : 'opacity-100'} transition-all`}
          playsInline
          muted
        />

        {/* 조준선 레이저 가이드 애니메이션 */}
        {!isPaused && isScanning && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="relative w-64 h-40 border-2 border-emerald-500/60 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              {/* 모서리 강조선 */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* 스캔 레이저 빔 */}
              <div className="w-full h-0.5 bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
              
              <span className="absolute -bottom-7 text-[11px] font-semibold text-emerald-300 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                바코드를 사각형 안에 비춰주세요
              </span>
            </div>
          </div>
        )}

        {/* 카메라 에러 또는 비권한 시 안내 */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-white">
            <CameraOff className="w-10 h-10 text-rose-400 mb-2" />
            <p className="font-bold text-sm mb-1">카메라를 불러올 수 없습니다</p>
            <p className="text-xs text-slate-400 mb-4 max-w-xs">{cameraError}</p>
            <p className="text-xs text-blue-400">아래 직접 입력창이나 빠른 테스트 버튼을 사용하세요.</p>
          </div>
        )}
      </div>

      {/* 하단 보조 컨트롤 바 */}
      <div className="p-3 bg-slate-900/95 border-t border-slate-800 space-y-2.5">
        {/* 직접 바코드 번호 입력 */}
        <form onSubmit={handleManualSubmit} className="flex space-x-1.5">
          <div className="relative flex-1">
            <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="바코드 번호 직접 입력 (숫자)"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 font-mono focus:outline-hidden focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            입력
          </button>
        </form>

        {/* 빠른 테스트용 샘플 바코드 버튼들 */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <span className="text-slate-500 flex items-center shrink-0 font-medium mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 mr-1" />
            빠른스캔:
          </span>
          {sampleBarcodes.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => handleSampleClick(s.code)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-slate-300 hover:text-white shrink-0 font-medium transition-colors border border-slate-700/60"
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
