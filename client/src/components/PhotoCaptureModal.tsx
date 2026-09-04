import React, { useRef, useState, useEffect } from 'react';
import { Camera, Check, X, RefreshCw } from 'lucide-react';
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
      setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/30 backdrop-blur-[2px] p-0 sm:p-5">
      <div className="bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-xl animate-rise">
        <div className="p-6 pb-4 flex justify-between items-start gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">처음 보는 상품입니다</h2>
            <p className="mt-1 text-[13px] text-ink-faint tabular">{barcode}</p>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed break-keep">
              상품 앞면이 보이게 찍어 두면 나중에 이름을 등록할 수 있습니다.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="w-9 h-9 -mr-2 -mt-1 rounded-full text-ink-faint hover:text-ink hover:bg-sunken flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6">
          <div className="relative aspect-square bg-sunken rounded-2xl overflow-hidden flex items-center justify-center">
            {capturedPhoto ? (
              <img src={capturedPhoto} alt="촬영한 상품" className="w-full h-full object-cover" />
            ) : streamActive ? (
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            ) : (
              <div className="text-center px-6">
                <Camera className="w-7 h-7 text-ink-faint mx-auto mb-2" />
                <p className="text-sm text-ink-soft">카메라를 열 수 없습니다</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 h-10 px-4 rounded-full bg-surface text-sm font-medium text-ink-soft hover:text-ink transition-colors"
                >
                  앨범에서 선택
                </button>
              </div>
            )}

            {capturedPhoto && (
              <button
                onClick={() => setCapturedPhoto(null)}
                className="absolute top-3 right-3 h-9 px-4 rounded-full bg-surface/90 backdrop-blur-sm text-[13px] font-medium text-ink-soft hover:text-ink inline-flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                다시 찍기
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="p-6">
          {!capturedPhoto ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSkip}
                className="h-12 px-5 rounded-full text-sm font-medium text-ink-soft hover:bg-sunken shrink-0 transition-colors"
              >
                건너뛰기
              </button>
              <button
                type="button"
                onClick={
                  streamActive ? handleCaptureSnapshot : () => fileInputRef.current?.click()
                }
                className="flex-1 h-12 rounded-full bg-sage hover:bg-sage-deep text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Camera className="w-4 h-4" />
                촬영
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full h-12 rounded-full bg-sage hover:bg-sage-deep text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              저장하고 수량 입력
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
