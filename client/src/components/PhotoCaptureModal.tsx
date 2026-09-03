import React, { useRef, useState, useEffect } from 'react';
import { Camera, AlertCircle, Check, X, RefreshCw, Upload } from 'lucide-react';
import { soundManager } from '../services/sound';

interface PhotoCaptureModalProps {
  barcode: string;
  onCaptured: (photoBase64: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  barcode,
  onCaptured,
  onSkip,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);

  useEffect(() => {
    soundManager.playAlert();
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 800 }, height: { ideal: 800 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreamActive(true);
        }
      } catch {
        setStreamActive(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(dataUrl);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCaptured(capturedPhoto);
    } else {
      onSkip();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-sm p-5 text-white shadow-2xl">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2 text-amber-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <h3 className="font-bold text-sm">조회되지 않는 미등록 바코드</h3>
              <p className="text-[11px] text-amber-300 font-mono">바코드: {barcode}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mb-3 leading-relaxed">
          마스터 목록에 없는 상품입니다. 사장님이 확인 후 매핑하실 수 있도록 <strong className="text-emerald-400">상품 앞면(이름/실물)</strong> 사진을 촬영해주세요!
        </p>

        {/* 촬영 뷰파인더 또는 촬영된 사진 미리보기 */}
        <div className="relative aspect-square bg-black rounded-2xl overflow-hidden border border-slate-700 mb-4 flex items-center justify-center">
          {capturedPhoto ? (
            <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
          ) : streamActive ? (
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          ) : (
            <div className="text-center p-6">
              <Camera className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">카메라를 켤 수 없습니다.</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-blue-400 hover:bg-slate-700"
              >
                사진 앨범에서 선택
              </button>
            </div>
          )}

          {/* 다시 찍기 버튼 */}
          {capturedPhoto && (
            <button
              onClick={() => setCapturedPhoto(null)}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-xs text-white font-semibold backdrop-blur-xs flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>다시 찍기</span>
            </button>
          )}
        </div>

        {/* 사진 셔터 및 컨트롤 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {!capturedPhoto ? (
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
            >
              사진 없이 건너뛰기
            </button>
            <button
              type="button"
              onClick={streamActive ? handleCaptureSnapshot : () => fileInputRef.current?.click()}
              className="flex-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20"
            >
              <Camera className="w-4 h-4" />
              <span>사진 찰칵 촬영</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/30"
          >
            <Check className="w-4 h-4" />
            <span>이 사진으로 저장하고 수량 입력</span>
          </button>
        )}
      </div>
    </div>
  );
};
