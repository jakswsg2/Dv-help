import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Language, PhotoData } from '../types';
import { translations } from '../translations';
import { cropRectTo600x600, rotateImage90 } from '../utils/photoAnalyzer';
import {
  Crop,
  X,
  Check,
  RotateCcw,
  RotateCw,
  Eye,
  Grid,
  Maximize2,
  Minimize2,
  ShieldCheck,
  RefreshCw,
  Move,
} from 'lucide-react';

interface ImageCropperOverlayProps {
  imageSource: string;
  language: Language;
  onCrop: (croppedPhoto: PhotoData) => void;
  onClose: () => void;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

export const ImageCropperOverlay: React.FC<ImageCropperOverlayProps> = ({
  imageSource,
  language,
  onCrop,
  onClose,
}) => {
  const t = translations[language];
  const p = t.photo;
  const isAr = language === 'ar';

  const [currentSrc, setCurrentSrc] = useState(imageSource);
  const [naturalDim, setNaturalDim] = useState({ width: 600, height: 600 });
  const [displayDim, setDisplayDim] = useState({ width: 400, height: 400 });
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Crop box state in display pixels (constrained to 1:1 ratio)
  const [crop, setCrop] = useState({ x: 20, y: 20, size: 280 });

  // Guide toggles
  const [showGuides, setShowGuides] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Dragging state
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, cropX: 0, cropY: 0, cropSize: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Lock body scroll while modal is active
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keyboard ESC listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Measure and fit image nicely within container on load or resize
  const setupDisplayDimensions = useCallback((natW: number, natH: number) => {
    const maxW = Math.min(window.innerWidth - 48, 560);
    const maxH = Math.min(window.innerHeight - 300, 480);

    const ratio = Math.min(maxW / natW, maxH / natH, 1);
    const dispW = Math.round(natW * ratio);
    const dispH = Math.round(natH * ratio);

    setDisplayDim({ width: dispW, height: dispH });

    // Initialize 1:1 crop box to 80% of smaller dimension, centered
    const initialSize = Math.round(Math.min(dispW, dispH) * 0.85);
    const initialX = Math.round((dispW - initialSize) / 2);
    const initialY = Math.round((dispH - initialSize) / 2);

    setCrop({
      x: Math.max(0, initialX),
      y: Math.max(0, initialY),
      size: initialSize,
    });
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const natW = img.naturalWidth || 600;
    const natH = img.naturalHeight || 600;
    setNaturalDim({ width: natW, height: natH });
    setupDisplayDimensions(natW, natH);
    setIsImgLoaded(true);
  };

  // Re-calculate on window resize
  useEffect(() => {
    const handleResize = () => {
      if (naturalDim.width && naturalDim.height) {
        setupDisplayDimensions(naturalDim.width, naturalDim.height);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [naturalDim, setupDisplayDimensions]);

  // Rotate image 90 degrees
  const handleRotate = async (dir: 'cw' | 'ccw') => {
    try {
      setProcessing(true);
      const rotated = await rotateImage90(currentSrc, dir);
      setCurrentSrc(rotated);
      setIsImgLoaded(false);
    } catch (err) {
      console.error('Rotation failed', err);
    } finally {
      setProcessing(false);
    }
  };

  // Preset: Maximize 1:1 box
  const handleMaximize = () => {
    const maxSquare = Math.min(displayDim.width, displayDim.height);
    const newX = Math.round((displayDim.width - maxSquare) / 2);
    const newY = Math.round((displayDim.height - maxSquare) / 2);
    setCrop({ x: newX, y: newY, size: maxSquare });
  };

  // Preset: Center oval focus
  const handleCenter = () => {
    const size = Math.round(Math.min(displayDim.width, displayDim.height) * 0.8);
    const newX = Math.round((displayDim.width - size) / 2);
    const newY = Math.round((displayDim.height - size) / 2);
    setCrop({ x: newX, y: newY, size });
  };

  // Dragging and resizing logic
  const handleStartDrag = (
    mode: DragMode,
    clientX: number,
    clientY: number
  ) => {
    setDragMode(mode);
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropSize: crop.size,
    };
  };

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragMode) return;

      const deltaX = clientX - dragStartRef.current.mouseX;
      const deltaY = clientY - dragStartRef.current.mouseY;
      const { cropX, cropY, cropSize } = dragStartRef.current;
      const maxW = displayDim.width;
      const maxH = displayDim.height;
      const minSize = 60;

      if (dragMode === 'move') {
        const nextX = Math.max(0, Math.min(maxW - cropSize, cropX + deltaX));
        const nextY = Math.max(0, Math.min(maxH - cropSize, cropY + deltaY));
        setCrop((prev) => ({ ...prev, x: nextX, y: nextY }));
      } else if (dragMode === 'se') {
        // Dragging bottom-right: increase size
        const maxAllowed = Math.min(maxW - cropX, maxH - cropY);
        const nextSize = Math.max(minSize, Math.min(maxAllowed, cropSize + Math.max(deltaX, deltaY)));
        setCrop((prev) => ({ ...prev, size: nextSize }));
      } else if (dragMode === 'nw') {
        // Dragging top-left: decrease x & y, adjust size
        const delta = Math.min(deltaX, deltaY);
        const candidateSize = cropSize - delta;
        if (candidateSize >= minSize) {
          const shift = cropSize - candidateSize;
          const nextX = Math.max(0, cropX + shift);
          const nextY = Math.max(0, cropY + shift);
          const actualShiftX = nextX - cropX;
          const actualShiftY = nextY - cropY;
          const actualShift = Math.max(actualShiftX, actualShiftY);
          setCrop({
            x: cropX + actualShift,
            y: cropY + actualShift,
            size: cropSize - actualShift,
          });
        }
      } else if (dragMode === 'ne') {
        // Dragging top-right: increase width, decrease y
        const delta = Math.max(deltaX, -deltaY);
        const nextSize = Math.max(minSize, Math.min(maxW - cropX, cropY + cropSize, cropSize + delta));
        const shiftY = nextSize - cropSize;
        setCrop({
          x: cropX,
          y: Math.max(0, cropY - shiftY),
          size: nextSize,
        });
      } else if (dragMode === 'sw') {
        // Dragging bottom-left: decrease x, increase height
        const delta = Math.max(-deltaX, deltaY);
        const nextSize = Math.max(minSize, Math.min(cropX + cropSize, maxH - cropY, cropSize + delta));
        const shiftX = nextSize - cropSize;
        setCrop({
          x: Math.max(0, cropX - shiftX),
          y: cropY,
          size: nextSize,
        });
      }
    },
    [dragMode, displayDim]
  );

  const handleEndDrag = useCallback(() => {
    setDragMode(null);
  }, []);

  // Global mouse/touch move listeners while active drag
  useEffect(() => {
    if (!dragMode) return;

    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handleEndDrag();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      handleEndDrag();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragMode, handlePointerMove, handleEndDrag]);

  // Execute crop to exact 600x600 px
  const handleApplyCrop = async () => {
    if (!displayDim.width || !displayDim.height) return;

    try {
      setProcessing(true);
      const scale = naturalDim.width / displayDim.width;

      const srcX = Math.round(crop.x * scale);
      const srcY = Math.round(crop.y * scale);
      const srcSize = Math.round(crop.size * scale);

      const croppedResult = await cropRectTo600x600(currentSrc, {
        x: srcX,
        y: srcY,
        size: srcSize,
      });

      onCrop(croppedResult);
      onClose();
    } catch (err) {
      console.error('Error applying 600x600 crop:', err);
    } finally {
      setProcessing(false);
    }
  };

  // Calculate actual source pixels being cropped
  const scale = displayDim.width ? naturalDim.width / displayDim.width : 1;
  const sourcePx = Math.round(crop.size * scale);

  return (
    <div
      id="image-cropper-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !processing) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cropper-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/30 border border-blue-400/40 text-blue-400">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="cropper-title" className="text-sm sm:text-base font-bold text-white">
                  {p.cropModalTitle}
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {p.cropperOverlayBadge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                {p.cropModalSubtitle}
              </p>
            </div>
          </div>

          <button
            id="close-cropper-top-btn"
            type="button"
            onClick={onClose}
            aria-label={p.cancelCrop}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Cropper Stage */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-950 select-none overflow-hidden">
          <div
            ref={containerRef}
            className="relative select-none rounded-lg overflow-hidden shadow-2xl bg-black flex items-center justify-center"
            style={{
              width: displayDim.width || 360,
              height: displayDim.height || 360,
            }}
          >
            {/* Background Source Image */}
            <img
              ref={imageRef}
              src={currentSrc}
              alt="Source Entrant"
              onLoad={handleImageLoad}
              draggable={false}
              className="w-full h-full object-contain pointer-events-none select-none block"
            />

            {/* Dark Mask Covering Areas Outside the 1:1 Crop Box */}
            {isImgLoaded && (
              <>
                {/* Top Mask */}
                <div
                  className="absolute left-0 top-0 w-full bg-black/65 pointer-events-none"
                  style={{ height: crop.y }}
                />
                {/* Bottom Mask */}
                <div
                  className="absolute left-0 w-full bg-black/65 pointer-events-none"
                  style={{
                    top: crop.y + crop.size,
                    height: Math.max(0, displayDim.height - (crop.y + crop.size)),
                  }}
                />
                {/* Left Mask */}
                <div
                  className="absolute left-0 bg-black/65 pointer-events-none"
                  style={{
                    top: crop.y,
                    width: crop.x,
                    height: crop.size,
                  }}
                />
                {/* Right Mask */}
                <div
                  className="absolute bg-black/65 pointer-events-none"
                  style={{
                    top: crop.y,
                    left: crop.x + crop.size,
                    width: Math.max(0, displayDim.width - (crop.x + crop.size)),
                    height: crop.size,
                  }}
                />

                {/* The 1:1 Active Crop Box */}
                <div
                  id="crop-box"
                  className="absolute border-2 border-blue-500 shadow-[0_0_0_1px_rgba(255,255,255,0.4)] cursor-move transition-shadow"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.size,
                    height: crop.size,
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleStartDrag('move', e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    if (e.touches[0]) {
                      handleStartDrag('move', e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                >
                  {/* Subtle 3x3 Composition Grid inside crop box */}
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                      <div className="border-r border-b border-white/20" />
                      <div className="border-r border-b border-white/20" />
                      <div className="border-b border-white/20" />
                      <div className="border-r border-b border-white/20" />
                      <div className="border-r border-b border-white/20" />
                      <div className="border-b border-white/20" />
                      <div className="border-r border-white/20" />
                      <div className="border-r border-white/20" />
                      <div />
                    </div>
                  )}

                  {/* Official US Department of State Head & Eye Level Guides */}
                  {showGuides && (
                    <svg
                      viewBox="0 0 600 600"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      {/* Center Axis */}
                      <line
                        x1="300"
                        y1="0"
                        x2="300"
                        y2="600"
                        stroke="rgba(59, 130, 246, 0.7)"
                        strokeDasharray="4 4"
                        strokeWidth="1.5"
                      />

                      {/* Min Eye Level (56% from bottom = 264px from top) */}
                      <line
                        x1="40"
                        y1="264"
                        x2="560"
                        y2="264"
                        stroke="rgba(16, 185, 129, 0.85)"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />

                      {/* Max Eye Level (69% from bottom = 186px from top) */}
                      <line
                        x1="40"
                        y1="186"
                        x2="560"
                        y2="186"
                        stroke="rgba(16, 185, 129, 0.85)"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />

                      {/* Head Oval (50% to 69% of height) */}
                      <ellipse
                        cx="300"
                        cy="290"
                        rx="120"
                        ry="170"
                        fill="none"
                        stroke="rgba(239, 68, 68, 0.85)"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />

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
                    </svg>
                  )}

                  {/* Center Drag Icon Cue */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 hover:opacity-40">
                    <Move className="w-8 h-8 text-white drop-shadow-md" />
                  </div>

                  {/* 4 Corner Resize Handles */}
                  {/* Top-Left */}
                  <div
                    className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-nwse-resize active:scale-125 transition-transform"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleStartDrag('nw', e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      if (e.touches[0]) {
                        handleStartDrag('nw', e.touches[0].clientX, e.touches[0].clientY);
                      }
                    }}
                  />

                  {/* Top-Right */}
                  <div
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-nesw-resize active:scale-125 transition-transform"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleStartDrag('ne', e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      if (e.touches[0]) {
                        handleStartDrag('ne', e.touches[0].clientX, e.touches[0].clientY);
                      }
                    }}
                  />

                  {/* Bottom-Left */}
                  <div
                    className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-nesw-resize active:scale-125 transition-transform"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleStartDrag('sw', e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      if (e.touches[0]) {
                        handleStartDrag('sw', e.touches[0].clientX, e.touches[0].clientY);
                      }
                    }}
                  />

                  {/* Bottom-Right */}
                  <div
                    className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-nwse-resize active:scale-125 transition-transform"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleStartDrag('se', e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      if (e.touches[0]) {
                        handleStartDrag('se', e.touches[0].clientX, e.touches[0].clientY);
                      }
                    }}
                  />

                  {/* Corner Badge: 1:1 Aspect Ratio Lock */}
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-xs text-[10px] font-mono font-bold text-white rounded pointer-events-none">
                    1:1
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Real-time Dimensions & Ratio Badge */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs">
            <span className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[11px] rounded-lg">
              {isAr ? 'حجم القص المختار: ' : 'Selection: '}
              <strong className="text-white font-bold">{sourcePx} × {sourcePx} px</strong>
            </span>
            <span className="px-2.5 py-1 bg-blue-950/80 border border-blue-800 text-blue-300 font-mono text-[11px] rounded-lg flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              {isAr ? 'المقاس النهائي المعتمد: ' : 'Output: '}
              <strong className="text-white font-bold">600 × 600 px (1:1)</strong>
            </span>
          </div>
        </div>

        {/* Cropper Controls Toolbar */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Presets and Alignment tools */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleCenter}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold transition-colors flex items-center gap-1"
            >
              <Minimize2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{isAr ? 'توسيط الرأس' : 'Center 1:1'}</span>
            </button>

            <button
              type="button"
              onClick={handleMaximize}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold transition-colors flex items-center gap-1"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{isAr ? 'ملء الإطار' : 'Maximize'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRotate('ccw')}
              disabled={processing}
              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold transition-colors disabled:opacity-50"
              title={isAr ? 'تدوير 90° عكس عقارب الساعة' : 'Rotate -90°'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleRotate('cw')}
              disabled={processing}
              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold transition-colors disabled:opacity-50"
              title={isAr ? 'تدوير 90° مع عقارب الساعة' : 'Rotate +90°'}
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setShowGuides(!showGuides)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-semibold transition-colors ${
                showGuides
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
              title={isAr ? 'إظهار/إخفاء خطوط دليل التمركز' : 'Toggle DV Alignment Guides'}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isAr ? 'دليل الرأس' : 'DV Guides'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1.5 rounded-lg border font-semibold transition-colors ${
                showGrid
                  ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-700'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
              title="Toggle 3x3 Grid"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="cancel-cropper-btn"
              type="button"
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors"
            >
              {p.cancelCrop}
            </button>

            <button
              id="apply-cropper-600-btn"
              type="button"
              onClick={handleApplyCrop}
              disabled={processing || !isImgLoaded}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {processing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{p.applyCrop600}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
