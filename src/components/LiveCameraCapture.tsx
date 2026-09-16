import React, { useRef, useState, useEffect } from 'react';
import { Language } from '../types';
import {
  Camera,
  X,
  RefreshCw,
  Eye,
  Sparkles,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { removeBackgroundAndMakeWhite } from '../utils/backgroundRemover';

interface LiveCameraCaptureProps {
  onCapture: (capturedDataUrl: string) => void;
  onClose: () => void;
  language: Language;
}

export const LiveCameraCapture: React.FC<LiveCameraCaptureProps> = ({
  onCapture,
  onClose,
  language,
}) => {
  const isAr = language === 'ar';
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [autoRemoveBg, setAutoRemoveBg] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [processing, setProcessing] = useState(false);

  // Start webcam stream
  const startCamera = async (facing: 'user' | 'environment') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      setErrorMessage(null);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 1280 },
          aspectRatio: { ideal: 1 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasPermission(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? isAr
            ? 'تم رفض إذن الوصول إلى الكاميرا من المتصفح. يرجى السماح بالكاميرا في إعدادات الموقع.'
            : 'Camera access denied by browser. Please grant permission in browser settings.'
          : isAr
          ? 'تعذر العثور على كاميرا متصلة أو تشغيلها.'
          : 'Unable to start camera video stream.'
      );
    }
  };

  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const toggleFacingMode = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    try {
      setProcessing(true);
      const video = videoRef.current;
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 640;

      // Crop center square
      const size = Math.min(vWidth, vHeight);
      const sx = (vWidth - size) / 2;
      const sy = (vHeight - size) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw mirrored if user-facing camera for natural feel
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (facingMode === 'user') {
        ctx.translate(600, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, sx, sy, size, size, 0, 0, 600, 600);

      // Restore transform
      if (facingMode === 'user') {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      let capturedDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // Automatic background removal if toggled
      if (autoRemoveBg) {
        const bgResult = await removeBackgroundAndMakeWhite(capturedDataUrl, {
          sensitivity: 35,
          feather: true,
        });
        capturedDataUrl = bgResult.dataUrl;
      }

      onCapture(capturedDataUrl);
      onClose();
    } catch (err) {
      console.error('Capture error:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm sm:text-base">
              {isAr ? 'كاميرا التصوير المباشر مع دليل الأبعاد' : 'Live Camera with DOS Framing Guide'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport with Live SVG Overlay */}
        <div className="relative bg-black flex items-center justify-center overflow-hidden min-h-[360px] sm:min-h-[420px]">
          {hasPermission === false ? (
            <div className="p-6 text-center text-slate-300 space-y-3">
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
              <p className="text-xs sm:text-sm">{errorMessage}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
              >
                {isAr ? 'إعادة المحاولة' : 'Try Again'}
              </button>
            </div>
          ) : (
            <div className="relative w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] overflow-hidden rounded-xl bg-slate-950 border-2 border-blue-500 shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover select-none ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Real-time State Department Official Proportional Framing Overlay */}
              {showOverlay && (
                <svg
                  viewBox="0 0 600 600"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  {/* Central Vertical Alignment Guide */}
                  <line
                    x1="300"
                    y1="0"
                    x2="300"
                    y2="600"
                    stroke="rgba(59, 130, 246, 0.7)"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />

                  {/* Top of Head Guide (Top ~110px) */}
                  <line
                    x1="120"
                    y1="110"
                    x2="480"
                    y2="110"
                    stroke="rgba(239, 68, 68, 0.85)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text x="300" y="100" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">
                    {isAr ? 'قمة الرأس (Top of Head)' : 'Top of Head Boundary'}
                  </text>

                  {/* Max & Min Eye Level Zone (56% to 69% from bottom = 264px to 186px from top) */}
                  <rect
                    x="80"
                    y="186"
                    width="440"
                    height="78"
                    fill="rgba(16, 185, 129, 0.12)"
                    stroke="rgba(16, 185, 129, 0.7)"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  <text x="90" y="230" fill="#10b981" fontSize="12" fontWeight="bold">
                    {isAr ? 'منطقة العينين (Eye Level 56%-69%)' : 'Official Eye Level Zone'}
                  </text>

                  {/* Head Oval Target Area (50% to 69% total height) */}
                  <ellipse
                    cx="300"
                    cy="290"
                    rx="115"
                    ry="170"
                    fill="none"
                    stroke="rgba(59, 130, 246, 0.85)"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                  />

                  {/* Chin Guide */}
                  <line
                    x1="180"
                    y1="460"
                    x2="420"
                    y2="460"
                    stroke="rgba(239, 68, 68, 0.85)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text x="300" y="480" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">
                    {isAr ? 'أسفل الذقن (Chin Level)' : 'Chin Area'}
                  </text>
                </svg>
              )}

              {/* Overlay Dimensions Badge */}
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-[10px] font-mono font-bold text-emerald-400 rounded border border-emerald-500/30">
                600 × 600 (1:1)
              </div>
            </div>
          )}
        </div>

        {/* Live Controls Toolbar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Auto Background Removal Toggle */}
            <button
              type="button"
              onClick={() => setAutoRemoveBg(!autoRemoveBg)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                autoRemoveBg
                  ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>
                {isAr
                  ? autoRemoveBg
                    ? 'حذف الخلفية تلقائياً: مفعّل'
                    : 'حذف الخلفية واستبدالها بالأبيض'
                  : autoRemoveBg
                  ? 'Auto White BG: ON'
                  : 'Auto White Background'}
              </span>
            </button>

            <div className="flex items-center gap-2">
              {/* Overlay Toggle */}
              <button
                type="button"
                onClick={() => setShowOverlay(!showOverlay)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold border ${
                  showOverlay
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle Proportional Overlay"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isAr ? 'دليل الأبعاد' : 'Guides'}</span>
              </button>

              {/* Flip Camera */}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg font-semibold"
                title="Switch Camera"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isAr ? 'قلب الكاميرا' : 'Flip'}</span>
              </button>
            </div>
          </div>

          {/* Capture Trigger Button */}
          <div className="flex items-center justify-center pt-2">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={processing || hasPermission === false}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold rounded-full text-sm shadow-lg shadow-emerald-900/40 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {processing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
              <span>{isAr ? 'التقاط الصورة واعتمادها (600×600)' : 'Capture Official Photo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
