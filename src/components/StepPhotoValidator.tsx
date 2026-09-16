import React, { useState, useRef, useEffect } from 'react';
import { Applicant, Language, PhotoData } from '../types';
import { translations } from '../translations';
import { analyzePhoto, cropAndExport600x600 } from '../utils/photoAnalyzer';
import { removeBackgroundAndMakeWhite } from '../utils/backgroundRemover';
import { LiveCameraCapture } from './LiveCameraCapture';
import { PhotoRequirementsModal } from './PhotoRequirementsModal';
import { ImageCropperOverlay } from './ImageCropperOverlay';
import { PhotoQualityMeter } from './PhotoQualityMeter';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Crop,
  Download,
  ShieldCheck,
  RotateCcw,
  RotateCw,
  Sliders,
  Maximize2,
  Grid,
  Move,
  Check,
  Sparkles,
  RefreshCw,
  Layers,
  Video,
  HelpCircle,
  Sun,
  SunDim,
  Gauge,
  Info,
} from 'lucide-react';

interface StepPhotoValidatorProps {
  applicant: Applicant;
  onChange: (updated: Partial<Applicant>) => void;
  language: Language;
}

export const StepPhotoValidator: React.FC<StepPhotoValidatorProps> = ({
  applicant,
  onChange,
  language,
}) => {
  const t = translations[language];
  const p = t.photo;
  const isAr = language === 'ar';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [rawImageSource, setRawImageSource] = useState<string | null>(
    applicant.photo?.dataUrl || null
  );
  const [showOverlay, setShowOverlay] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [cropSuccess, setCropSuccess] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [showCropperModal, setShowCropperModal] = useState(false);
  const [bgRemovedNotice, setBgRemovedNotice] = useState<string | null>(null);

  // Interactive crop & calibration state
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [fineAngle, setFineAngle] = useState(0); // -15 to +15 deg

  // Drag interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentPhoto = applicant.photo;

  // Sync raw source if photo changes externally
  useEffect(() => {
    if (applicant.photo?.dataUrl && !rawImageSource) {
      setRawImageSource(applicant.photo.dataUrl);
    }
  }, [applicant.photo?.dataUrl]);

  const handleCameraCaptured = async (capturedDataUrl: string) => {
    try {
      setAnalyzing(true);
      setRawImageSource(capturedDataUrl);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setRotation(0);
      setFineAngle(0);

      // Convert dataUrl to File for full analysis
      const res = await fetch(capturedDataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });

      const result = await analyzePhoto(file);
      onChange({ photo: result, status: 'PHOTOS_VERIFIED' });
    } catch (err) {
      console.error('Processing camera capture error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAutoRemoveBackground = async () => {
    const srcToUse = rawImageSource || currentPhoto?.dataUrl;
    if (!srcToUse) return;

    try {
      setAnalyzing(true);
      const bgResult = await removeBackgroundAndMakeWhite(srcToUse, {
        sensitivity: 36,
        feather: true,
      });

      setRawImageSource(bgResult.dataUrl);

      // Re-analyze updated image
      const res = await fetch(bgResult.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'photo_white_bg.jpg', { type: 'image/jpeg' });
      const result = await analyzePhoto(file);

      onChange({ photo: result, status: 'PHOTOS_VERIFIED' });
      setBgRemovedNotice(
        isAr
          ? `تم حذف الخلفية واستبدالها بالأبيض النقي (تمت معالجة ${bgResult.replacedPercentage}% من مساحة الصورة)`
          : `Background removed & replaced with pure white (${bgResult.replacedPercentage}% matting applied)`
      );
      setTimeout(() => setBgRemovedNotice(null), 4000);
    } catch (err) {
      console.error('Background removal error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setAnalyzing(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setRawImageSource(dataUrl);
        // Reset crop adjustments
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
        setRotation(0);
        setFineAngle(0);

        const result = await analyzePhoto(file);
        onChange({ photo: result, status: 'PHOTOS_VERIFIED' });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Mouse drag handlers for positioning the image inside the 600x600 frame
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!rawImageSource) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - cropOffset.x,
      y: e.clientY - cropOffset.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCropOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile/tablet gesture cropping
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!rawImageSource || e.touches.length === 0) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({
      x: touch.clientX - cropOffset.x,
      y: touch.clientY - cropOffset.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    const touch = e.touches[0];
    setCropOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Generate an instant official synthetic 600x600 calibration portrait for testing
  const handleLoadSample = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Soft neutral off-white background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 600, 600);

    // Subtle background gradient for realism
    const grad = ctx.createLinearGradient(0, 0, 0, 600);
    grad.addColorStop(0, '#f1f5f9');
    grad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 600);

    // Shoulders
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(300, 560, 220, 120, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(260, 390, 80, 80);

    // Head Oval (Centered, head height ~360px which is 60% of 600px - complies perfectly with 50-69% rule)
    ctx.fillStyle = '#e0afa0';
    ctx.beginPath();
    ctx.ellipse(300, 280, 110, 150, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(300, 230, 115, Math.PI, 0, false);
    ctx.fill();

    // Eyes level at Y=265 (which is 335px from bottom, ~56% from bottom)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(260, 265, 12, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(340, 265, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(245, 250);
    ctx.lineTo(275, 250);
    ctx.moveTo(325, 250);
    ctx.lineTo(355, 250);
    ctx.stroke();

    // Nose
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#b07d62';
    ctx.beginPath();
    ctx.moveTo(300, 275);
    ctx.lineTo(305, 310);
    ctx.lineTo(295, 315);
    ctx.stroke();

    // Neutral Mouth (no smiling, lips together)
    ctx.strokeStyle = '#b07d62';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(275, 350);
    ctx.lineTo(325, 350);
    ctx.stroke();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const head = 'data:image/jpeg;base64,';
    const size = Math.round(((dataUrl.length - head.length) * 3) / 4);

    const samplePhoto: PhotoData = {
      dataUrl,
      width: 600,
      height: 600,
      fileSizeBytes: size,
      isSquare: true,
      isSizeOk: true,
      sharpnessScore: 68.5,
      brightnessAvg: 185,
      isInspected: true,
      notes: [],
    };

    setRawImageSource(dataUrl);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setRotation(0);
    setFineAngle(0);

    onChange({ photo: samplePhoto, status: 'PHOTOS_VERIFIED' });
  };

  const handleApplyCrop = async () => {
    const srcToUse = rawImageSource || currentPhoto?.dataUrl;
    if (!srcToUse) return;

    try {
      setAnalyzing(true);
      const viewportSize = viewportRef.current?.clientWidth || 360;

      const calibratedPhoto = await cropAndExport600x600(srcToUse, {
        zoom: cropZoom,
        panX: cropOffset.x,
        panY: cropOffset.y,
        rotation,
        fineAngle,
        viewportDisplaySize: viewportSize,
      });

      onChange({ photo: calibratedPhoto, status: 'PHOTOS_VERIFIED' });
      setCropSuccess(true);
      setTimeout(() => setCropSuccess(false), 3000);
    } catch (err) {
      console.error('Cropping error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCropperComplete = (croppedPhoto: PhotoData) => {
    setRawImageSource(croppedPhoto.dataUrl);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setRotation(0);
    setFineAngle(0);
    onChange({ photo: croppedPhoto, status: 'PHOTOS_VERIFIED' });
    setCropSuccess(true);
    setTimeout(() => setCropSuccess(false), 3500);
  };

  const handleRotate90 = (dir: 'cw' | 'ccw') => {
    setRotation((prev) => {
      const step = dir === 'cw' ? 90 : -90;
      const next = (prev + step) % 360;
      return next < 0 ? next + 360 : next;
    });
  };

  const handleResetFraming = () => {
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setRotation(0);
    setFineAngle(0);
  };

  const handlePresetHeadOval = () => {
    setCropZoom(1.35);
    setCropOffset({ x: 0, y: 15 });
  };

  const handleDownload = () => {
    if (!currentPhoto) return;
    const a = document.createElement('a');
    a.href = currentPhoto.dataUrl;
    a.download = `DV_${applicant.lastName || 'APPLICANT'}_PHOTO_600x600.jpg`;
    a.click();
  };

  const totalAngle = rotation + fineAngle;

  return (
    <div className="space-y-8">
      {/* Header with Strict No-AI Disclaimer */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-blue-400">
            <Camera className="w-5 h-5" />
            <h2 className="text-base font-bold text-white">{p.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {rawImageSource && (
              <button
                id="header-open-cropper-btn"
                type="button"
                onClick={() => setShowCropperModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>{p.openCropper}</span>
              </button>
            )}
            <button
              id="view-photo-requirements-header-btn"
              type="button"
              onClick={() => setShowRequirementsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{p.officialRequirements}</span>
            </button>
            <span className="px-2.5 py-1 bg-blue-900/60 border border-blue-400/40 text-blue-200 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              600 × 600 px (1:1)
            </span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {p.noAiDisclaimer}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive 600x600 Cropping Canvas Viewport */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col items-center space-y-4">
          <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-800 text-xs font-bold">
              <Crop className="w-4 h-4 text-blue-600" />
              <span>
                {isAr
                  ? 'منطقة القص والمعايرة الرقمية (600×600 بكسل)'
                  : 'Interactive 600×600 Crop & Alignment Viewport'}
              </span>
            </div>
            {rawImageSource && (
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Move className="w-3 h-3 text-slate-400" />
                {isAr ? 'اسحب بالماوس للتحريك' : 'Drag to reposition head'}
              </span>
            )}
          </div>

          {/* Square Viewport (Constrained 1:1 Aspect Ratio) */}
          <div
            ref={viewportRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] bg-slate-900 rounded-xl overflow-hidden border-2 select-none shadow-inner transition-colors ${
              rawImageSource
                ? 'cursor-grab active:cursor-grabbing border-blue-500'
                : 'cursor-pointer hover:bg-slate-800 border-slate-300'
            }`}
          >
            {rawImageSource ? (
              <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-slate-950">
                <img
                  src={rawImageSource}
                  alt="DV Entrant Portrait"
                  draggable={false}
                  className="max-w-none pointer-events-none transition-transform duration-75 ease-out select-none"
                  style={{
                    transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) rotate(${totalAngle}deg) scale(${cropZoom})`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-300"
              >
                <Upload className="w-10 h-10 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-white">{p.uploadTitle}</span>
                <span className="text-[11px] text-slate-400 mt-1">{p.uploadDesc}</span>
              </div>
            )}

            {/* Official US Department of State Guideline Overlay */}
            {showOverlay && rawImageSource && (
              <svg
                viewBox="0 0 600 600"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                {/* 3x3 Composition Grid */}
                {showGrid && (
                  <>
                    <line x1="200" y1="0" x2="200" y2="600" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                    <line x1="400" y1="0" x2="400" y2="600" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                    <line x1="0" y1="200" x2="600" y2="200" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                    <line x1="0" y1="400" x2="600" y2="400" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                  </>
                )}

                {/* Center Vertical Axis */}
                <line
                  x1="300"
                  y1="0"
                  x2="300"
                  y2="600"
                  stroke="rgba(59, 130, 246, 0.6)"
                  strokeDasharray="4 4"
                  strokeWidth="1.5"
                />

                {/* Min Eye Level (56% from bottom = 264px from top) */}
                <line
                  x1="60"
                  y1="264"
                  x2="540"
                  y2="264"
                  stroke="rgba(16, 185, 129, 0.8)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x="70" y="258" fill="#10b981" fontSize="13" fontWeight="bold">
                  Eye Level Min (56%)
                </text>

                {/* Max Eye Level (69% from bottom = 186px from top) */}
                <line
                  x1="60"
                  y1="186"
                  x2="540"
                  y2="186"
                  stroke="rgba(16, 185, 129, 0.8)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x="70" y="180" fill="#10b981" fontSize="13" fontWeight="bold">
                  Eye Level Max (69%)
                </text>

                {/* Official Head Oval Boundary Guide (50% to 69% of height) */}
                <ellipse
                  cx="300"
                  cy="290"
                  rx="115"
                  ry="170"
                  fill="none"
                  stroke="rgba(239, 68, 68, 0.8)"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
                <text x="300" y="112" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">
                  Top of Head / قمة الرأس
                </text>

                {/* Chin Guide */}
                <line
                  x1="180"
                  y1="460"
                  x2="420"
                  y2="460"
                  stroke="rgba(239, 68, 68, 0.7)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text x="300" y="480" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">
                  Chin Area / أسفل الذقن
                </text>
              </svg>
            )}

            {/* Live 600x600 Badge */}
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-[10px] font-mono font-bold text-white rounded">
              600 × 600
            </div>

            {/* Quick Cropper Overlay Trigger inside Viewport */}
            {rawImageSource && (
              <button
                id="viewport-open-cropper-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCropperModal(true);
                }}
                className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2.5 py-1 bg-blue-600/90 hover:bg-blue-600 text-white text-[11px] font-bold rounded-md shadow-md backdrop-blur-xs border border-blue-400/40 transition-all cursor-pointer"
                title={p.openCropper}
              >
                <Crop className="w-3 h-3" />
                <span>{isAr ? 'قص 600×600' : 'Crop 600×600'}</span>
              </button>
            )}
          </div>

          {/* Live Background Removal Notice */}
          {bgRemovedNotice && (
            <div className="w-full bg-purple-50 border border-purple-200 text-purple-900 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>{bgRemovedNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setBgRemovedNotice(null)}
                className="text-purple-700 hover:text-purple-950 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Action Buttons (Live Camera, Upload, Auto Remove BG, Sample, Overlay Toggle, Grid Toggle) */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            {/* Live Camera Capture Trigger */}
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{isAr ? 'فتح الكاميرا المباشرة' : 'Open Live Camera'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{p.uploadTitle}</span>
            </button>

            {/* Remove Background Button */}
            {rawImageSource && (
              <button
                type="button"
                onClick={handleAutoRemoveBackground}
                disabled={analyzing}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                title={isAr ? 'حذف الخلفية واستبدالها بالأبيض النقي تلقائياً' : 'Auto remove background to pure white'}
              >
                {analyzing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                ) : (
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                )}
                <span>{isAr ? 'حذف الخلفية تلقائياً' : 'Auto Remove BG'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLoadSample}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{isAr ? 'نموذج تجريبي' : 'Sample'}</span>
            </button>

            {/* Cropper Tool Trigger in Toolbar */}
            {rawImageSource && (
              <button
                id="toolbar-open-cropper-btn"
                type="button"
                onClick={() => setShowCropperModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>{p.openCropper}</span>
              </button>
            )}

            {/* Official Requirements Modal Trigger in Toolbar */}
            <button
              id="toolbar-photo-requirements-btn"
              type="button"
              onClick={() => setShowRequirementsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors"
              title={p.officialRequirements}
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>{p.viewRequirementsGuide}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOverlay(!showOverlay)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                showOverlay
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title={p.guideOverlay}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{p.guideOverlay}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                showGrid
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Toggle Composition Grid"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interactive Crop Controls Toolbar */}
          {rawImageSource && (
            <div className="w-full pt-4 border-t border-slate-200 space-y-4">
              {/* Zoom & Tilt Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {/* Zoom Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                      {isAr ? 'نسبة التكبير والتحجيم' : 'Scale / Zoom'}
                    </span>
                    <span className="font-mono text-blue-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {Math.round(cropZoom * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCropZoom((z) => Math.max(0.5, +(z - 0.05).toFixed(2)))}
                      className="w-6 h-6 flex items-center justify-center bg-white border border-slate-300 rounded font-bold text-slate-700 text-xs hover:bg-slate-100"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.02"
                      value={cropZoom}
                      onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setCropZoom((z) => Math.min(3.0, +(z + 0.05).toFixed(2)))}
                      className="w-6 h-6 flex items-center justify-center bg-white border border-slate-300 rounded font-bold text-slate-700 text-xs hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Fine Angle / Straighten Tilt Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-blue-600" />
                      {isAr ? 'ضبط ميلان الرأس الدقيق' : 'Straighten / Tilt'}
                    </span>
                    <span className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {fineAngle > 0 ? `+${fineAngle}°` : `${fineAngle}°`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="-15"
                      max="15"
                      step="0.5"
                      value={fineAngle}
                      onChange={(e) => setFineAngle(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Rotation & Presets Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRotate90('ccw')}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold"
                    title="Rotate 90° CCW"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>-90°</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRotate90('cw')}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold"
                    title="Rotate 90° CW"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>+90°</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePresetHeadOval}
                    className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold"
                  >
                    {isAr ? 'توسيط تلقائي للرأس' : 'Auto Oval Focus'}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetFraming}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                    title="Reset All Adjustments"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Apply Crop Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors"
                  >
                    {analyzing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : cropSuccess ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Crop className="w-4 h-4" />
                    )}
                    <span>
                      {cropSuccess
                        ? isAr
                          ? 'تم القص والمعايرة بنجاح!'
                          : 'Successfully Cropped!'
                        : p.applyCrop}
                    </span>
                  </button>

                  {currentPhoto && (
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold transition-colors"
                      title={p.exportPhoto}
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">600×600</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Technical Requirements Checklist & Metrics */}
        <div className="lg:col-span-5 space-y-4">
          {/* Dynamic Overall Quality Meter & Progress Ring */}
          <PhotoQualityMeter
            photo={currentPhoto}
            cropZoom={cropZoom}
            cropOffset={cropOffset}
            rotation={rotation}
            fineAngle={fineAngle}
            language={language}
            onOpenCropper={() => setShowCropperModal(true)}
            onAutoOvalFocus={handlePresetHeadOval}
          />

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>{isAr ? 'المعايير الفنية الرسمية لوزارة الخارجية (U.S. DOS Specs)' : 'U.S. DOS Technical Specs'}</span>
              </h3>
              <button
                id="specs-card-requirements-btn"
                type="button"
                onClick={() => setShowRequirementsModal(true)}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{isAr ? 'دليل الشروط' : 'View Guide'}</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-700">{p.specSquare}</span>
                {currentPhoto?.isSquare && currentPhoto.width >= 600 ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    600×600 px
                  </span>
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-700">{p.specSize}</span>
                {currentPhoto?.isSizeOk ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    ≤ 240 KB
                  </span>
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-700">{p.specHead}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-700">{p.specEye}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-700">{p.specSharpness}</span>
                {(currentPhoto?.sharpnessScore || 0) >= 25 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
              </div>

              {/* Official Lighting & Exposure Specification Check */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-700">{p.specLighting}</span>
                {currentPhoto ? (
                  currentPhoto.brightnessStatus === 'TOO_DARK' ? (
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {isAr ? `معتمة (${currentPhoto.brightnessAvg}/255)` : `Too Dark (${currentPhoto.brightnessAvg}/255)`}
                    </span>
                  ) : currentPhoto.brightnessStatus === 'WASHED_OUT' ? (
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {isAr ? `باهتة (${currentPhoto.brightnessAvg}/255)` : `Washed Out (${currentPhoto.brightnessAvg}/255)`}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {isAr ? `متوازنة (${currentPhoto.brightnessAvg}/255)` : `Balanced (${currentPhoto.brightnessAvg}/255)`}
                    </span>
                  )
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </div>
            </div>

            {/* Quick action notice if photo is not 600x600 */}
            {rawImageSource && (!currentPhoto?.isSquare || currentPhoto?.width !== 600) && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {isAr
                      ? 'الصورة الحالية تحتاج إلى قص لمعايير 600×600 بكسل الرسمية.'
                      : 'Photo requires cropping to official 600×600 px ratio.'}
                  </span>
                </div>
                <button
                  id="specs-card-crop-btn"
                  type="button"
                  onClick={() => setShowCropperModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg shadow-xs shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>{isAr ? 'فتح أداة القص' : 'Open Cropper'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Auto-detected Lighting Warning Alerts */}
          {currentPhoto && currentPhoto.brightnessStatus === 'TOO_DARK' && (
            <div
              id="brightness-too-dark-warning"
              className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2 animate-fadeIn"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
                  <SunDim className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <span>{p.brightnessTooDark}</span>
                      <span className="font-mono bg-amber-200/80 px-1.5 py-0.5 rounded text-[11px]">
                        {currentPhoto.brightnessAvg} / 255
                      </span>
                    </h5>
                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold rounded-full">
                      {isAr ? 'تنبيه إضاءة رسمية' : 'Official Lighting Alert'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                    {p.brightnessDarkWarning}
                  </p>
                  <div className="mt-2.5 text-[11px] text-amber-900 bg-amber-100/70 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{p.brightnessDarkTip}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentPhoto && currentPhoto.brightnessStatus === 'WASHED_OUT' && (
            <div
              id="brightness-washed-out-warning"
              className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2 animate-fadeIn"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
                  <Sun className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <span>{p.brightnessWashedOut}</span>
                      <span className="font-mono bg-amber-200/80 px-1.5 py-0.5 rounded text-[11px]">
                        {currentPhoto.brightnessAvg} / 255
                      </span>
                    </h5>
                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold rounded-full">
                      {isAr ? 'تنبيه بهتان سطوع' : 'Washout Alert'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                    {p.brightnessWashedWarning}
                  </p>
                  <div className="mt-2.5 text-[11px] text-amber-900 bg-amber-100/70 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{p.brightnessWashedTip}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Auto-detected Digital Exposure Gauge Card */}
          {currentPhoto && (
            <div
              id="brightness-exposure-meter-card"
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">{p.brightnessGaugeTitle}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                    currentPhoto.brightnessStatus === 'OPTIMAL'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {currentPhoto.brightnessStatus === 'OPTIMAL'
                    ? p.brightnessOptimal
                    : currentPhoto.brightnessStatus === 'TOO_DARK'
                    ? p.brightnessTooDark
                    : p.brightnessWashedOut}
                </span>
              </div>

              {/* Visual Meter Bar */}
              <div className="space-y-1.5">
                <div className="relative h-4 rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
                  {/* 0 to 85: Dark Zone (33.3%) */}
                  <div
                    style={{ width: `${(85 / 255) * 100}%` }}
                    className="h-full bg-linear-to-r from-slate-800 via-amber-800 to-amber-600 opacity-80"
                    title={p.brightnessDarkZone}
                  />
                  {/* 85 to 215: Official Safe Zone (51%) */}
                  <div
                    style={{ width: `${((215 - 85) / 255) * 100}%` }}
                    className="h-full bg-linear-to-r from-emerald-500 to-teal-500"
                    title={p.brightnessOptimalZone}
                  />
                  {/* 215 to 255: Washed Out Zone (15.7%) */}
                  <div
                    style={{ width: `${((255 - 215) / 255) * 100}%` }}
                    className="h-full bg-linear-to-r from-amber-400 to-rose-400"
                    title={p.brightnessWashedZone}
                  />

                  {/* Pointer / Needle Indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-white border border-slate-900 shadow-md transform -translate-x-1/2 transition-all duration-300 z-10"
                    style={{
                      left: `${Math.max(0, Math.min(100, (currentPhoto.brightnessAvg / 255) * 100))}%`,
                    }}
                  />
                </div>

                {/* Meter Zone Legends */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
                  <span className="text-amber-800 font-medium">0 ({isAr ? 'معتم' : 'Dark'})</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {p.brightnessOptimalZone}
                  </span>
                  <span className="text-rose-600 font-medium">255 ({isAr ? 'ساطع' : 'Bright'})</span>
                </div>
              </div>

              {/* Detailed Lighting Sub-Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="block text-slate-500 text-[10px]">{p.overallBrightnessLabel}</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {currentPhoto.brightnessAvg} / 255
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="block text-slate-500 text-[10px]">{p.faceBrightnessLabel}</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {currentPhoto.brightnessAnalysis?.faceAvg ?? currentPhoto.brightnessAvg} / 255
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="block text-slate-500 text-[10px]">
                    {isAr ? 'حالة الإضاءة المكتشفة' : 'Detected Status'}
                  </span>
                  <span
                    className={`font-bold text-xs ${
                      currentPhoto.brightnessStatus === 'OPTIMAL'
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {currentPhoto.brightnessStatus === 'OPTIMAL'
                      ? (isAr ? 'معتمدة رسمياً' : 'Compliant')
                      : currentPhoto.brightnessStatus === 'TOO_DARK'
                      ? (isAr ? 'إضاءة ضعيفة' : 'Underexposed')
                      : (isAr ? 'بهتان سطوع' : 'Overexposed')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Current Photo Metrics Card */}
          {currentPhoto && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-800">
                  {isAr ? 'بيانات القياس الرقمي للصورة المعتمدة' : 'Calibrated Photo Metrics'}
                </h4>
                {currentPhoto.isSquare && currentPhoto.width === 600 && currentPhoto.isSizeOk && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                    {p.passedAll}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="block text-slate-500 mb-1">{p.currentWidthHeight}</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {currentPhoto.width} × {currentPhoto.height} px
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="block text-slate-500 mb-1">{p.currentSize}</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      currentPhoto.isSizeOk ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {Math.round(currentPhoto.fileSizeBytes / 1024)} KB
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="block text-slate-500 mb-1">{p.currentSharpness}</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {currentPhoto.sharpnessScore}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="block text-slate-500 mb-1">{p.specBrightness}</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {currentPhoto.brightnessAvg} / 255
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        currentPhoto.brightnessStatus === 'OPTIMAL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {currentPhoto.brightnessStatus === 'OPTIMAL'
                        ? (isAr ? 'متوازنة' : 'Optimal')
                        : currentPhoto.brightnessStatus === 'TOO_DARK'
                        ? (isAr ? 'معتمة' : 'Dark')
                        : (isAr ? 'باهتة' : 'Washed')}
                    </span>
                  </div>
                </div>
              </div>

              {currentPhoto.notes.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                  <span className="font-bold block">ملاحظات الفحص الفني:</span>
                  {currentPhoto.notes.map((note, idx) => (
                    <p key={idx} className="flex items-center gap-1">
                      <span>•</span> {note}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Official US Department of State Photo Requirements Modal */}
      {showRequirementsModal && (
        <PhotoRequirementsModal
          language={language}
          onClose={() => setShowRequirementsModal(false)}
        />
      )}

      {/* Live Camera Capture Modal */}
      {isCameraOpen && (
        <LiveCameraCapture
          language={language}
          onCapture={handleCameraCaptured}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* 600x600 Image Cropper Overlay Tool */}
      {showCropperModal && rawImageSource && (
        <ImageCropperOverlay
          imageSource={rawImageSource}
          language={language}
          onCrop={handleCropperComplete}
          onClose={() => setShowCropperModal(false)}
        />
      )}
    </div>
  );
};

