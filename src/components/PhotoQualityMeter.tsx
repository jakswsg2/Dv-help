import React, { useMemo } from 'react';
import { PhotoData, Language } from '../types';
import { translations } from '../translations';
import {
  Sun,
  Crop,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export interface QualityScoreBreakdown {
  overallScore: number;
  brightnessScore: number;
  alignmentScore: number;
  resolutionScore: number;
  statusGrade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'NO_PHOTO';
  statusText: string;
  colorScheme: {
    stroke: string;
    text: string;
    bg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  };
  recommendations: string[];
}

interface PhotoQualityMeterProps {
  photo?: PhotoData | null;
  cropZoom?: number;
  cropOffset?: { x: number; y: number };
  rotation?: number;
  fineAngle?: number;
  language: Language;
  onOpenCropper?: () => void;
  onAutoOvalFocus?: () => void;
}

export function computePhotoQualityScore(
  photo: PhotoData | null | undefined,
  cropZoom: number = 1,
  cropOffset: { x: number; y: number } = { x: 0, y: 0 },
  rotation: number = 0,
  fineAngle: number = 0,
  language: Language = 'ar'
): QualityScoreBreakdown {
  const isAr = language === 'ar';
  const t = translations[language].photo;

  if (!photo) {
    return {
      overallScore: 0,
      brightnessScore: 0,
      alignmentScore: 0,
      resolutionScore: 0,
      statusGrade: 'NO_PHOTO',
      statusText: t.qualityNoPhoto,
      colorScheme: {
        stroke: '#94a3b8',
        text: 'text-slate-400',
        bg: 'bg-slate-50 dark:bg-slate-800/60',
        border: 'border-slate-200 dark:border-slate-700',
        badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
        badgeText: 'text-slate-500',
      },
      recommendations: [
        isAr
          ? 'ارفع صورة شخصية حديثة أو استخدم الكاميرا لبدء الفحص التلقائي.'
          : 'Upload a recent portrait photo or use live camera to initiate automated scoring.',
      ],
    };
  }

  const recommendations: string[] = [];

  // 1. Brightness & Exposure Score (0 - 100)
  let brightnessScore = 100;
  const brightnessAvg = photo.brightnessAvg ?? 140;
  const faceAvg = photo.brightnessAnalysis?.faceAvg ?? brightnessAvg;
  const brightnessStatus = photo.brightnessStatus ?? 'OPTIMAL';

  if (brightnessStatus === 'OPTIMAL') {
    if (brightnessAvg >= 120 && brightnessAvg <= 180) {
      brightnessScore = 100;
    } else if (brightnessAvg >= 95 && brightnessAvg <= 205) {
      brightnessScore = 92;
    } else {
      brightnessScore = 84;
    }
  } else if (brightnessStatus === 'TOO_DARK') {
    brightnessScore = Math.max(15, Math.round((brightnessAvg / 85) * 65));
    recommendations.push(
      isAr
        ? 'الإضاءة معتمة: قف أمام مصدر ضوء نهاري أو استخدم إضاءة أمامية لزيادة سطوع ملامح الوجه.'
        : 'Underexposed lighting: Face toward natural daylight to brighten facial contours.'
    );
  } else if (brightnessStatus === 'WASHED_OUT') {
    brightnessScore = Math.max(15, Math.round(100 - ((brightnessAvg - 215) / 40) * 55));
    recommendations.push(
      isAr
        ? 'إضاءة مفرطة السطوع (Washed out): ابتعد عن الفلاش المباشر لتفادي طمس معالم البشرة.'
        : 'Overexposed/washed out: Reduce direct flash or direct sunlight to prevent facial detail washout.'
    );
  }

  // Face unevenness check
  const faceDiff = Math.abs(faceAvg - brightnessAvg);
  if (faceDiff > 40) {
    brightnessScore = Math.max(20, brightnessScore - 12);
    if (!recommendations.some((r) => r.includes('إضاءة') || r.includes('light'))) {
      recommendations.push(
        isAr
          ? 'توزيع الإضاءة على الوجه غير متجانس: تجنب وجود ظلال جانبية كثيفة.'
          : 'Uneven face illumination: Ensure soft bilateral lighting to minimize side shadows.'
      );
    }
  }

  // 2. Resolution & Sharpness Score (0 - 100)
  let dimensionScore = 50;
  if (photo.width === 600 && photo.height === 600) {
    dimensionScore = 50;
  } else if (photo.width >= 600 && photo.height >= 600) {
    dimensionScore = 42;
    recommendations.push(
      isAr
        ? 'الصورة تحتاج إلى اقتصاص دقيق لنسبة 600×600 بكسل القياسية.'
        : 'Photo requires exact 600×600 px cropping for official state department pass.'
    );
  } else {
    dimensionScore = Math.max(10, Math.round((Math.min(photo.width, photo.height) / 600) * 35));
    recommendations.push(
      isAr
        ? `أبعاد الصورة (${photo.width}×${photo.height}) أقل من الحد الأدنى الرسمي 600×600 بكسل.`
        : `Photo dimensions (${photo.width}×${photo.height}) are below official minimum of 600×600 px.`
    );
  }

  let sharpnessScore = 30;
  const variance = photo.sharpnessScore ?? 60;
  if (variance >= 50) {
    sharpnessScore = 30;
  } else if (variance >= 25) {
    sharpnessScore = 24;
  } else {
    sharpnessScore = Math.max(5, Math.round((variance / 25) * 18));
    recommendations.push(
      isAr
        ? 'مقياس الوضوح منخفض: قد تحتوي الصورة على اهتزاز أو ضبابية غير مقبولة.'
        : 'Low sharpness score: Photo appears blurry or has motion shake.'
    );
  }

  let fileSizeScore = 20;
  const sizeBytes = photo.fileSizeBytes ?? 150000;
  if (sizeBytes <= 245760) {
    fileSizeScore = 20;
  } else {
    fileSizeScore = Math.max(5, Math.round(20 - ((sizeBytes - 245760) / 102400) * 12));
    recommendations.push(
      isAr
        ? `حجم الملف (${Math.round(sizeBytes / 1024)} KB) يتجاوز الحد الأقصى 240 KB.`
        : `File size (${Math.round(sizeBytes / 1024)} KB) exceeds the 240 KB upper limit.`
    );
  }

  const resolutionScore = Math.min(100, Math.max(0, dimensionScore + sharpnessScore + fileSizeScore));

  // 3. Alignment & Framing Score (0 - 100)
  let aspectScore = 40;
  if (photo.isSquare || Math.abs(photo.width - photo.height) <= 2) {
    aspectScore = 40;
  } else {
    const ratio = Math.min(photo.width, photo.height) / Math.max(photo.width, photo.height);
    aspectScore = Math.max(10, Math.round(ratio * 35));
  }

  let angleScore = 35;
  const netRotation = (rotation % 360 + 360) % 360;
  const totalNetTilt = Math.abs(fineAngle);

  if (netRotation === 0) {
    if (totalNetTilt <= 1) {
      angleScore = 35;
    } else {
      angleScore = Math.max(10, Math.round(35 - totalNetTilt * 2.2));
      recommendations.push(
        isAr
          ? `زاوية ميلان الرأس (${fineAngle > 0 ? '+' : ''}${fineAngle}°): اضبط شريط الاستقامة ليكون الرأس مستوياً تماماً.`
          : `Head tilt detected (${fineAngle}°): Adjust the alignment slider to level the head.`
      );
    }
  } else {
    angleScore = 5;
    recommendations.push(
      isAr
        ? 'الصورة مقلوبة أو مستديرة جانبياً: قم بتدويرها للوضع الرأسي الصحيح.'
        : 'Photo is sideways or inverted: Rotate to upright vertical position.'
    );
  }

  let framingScore = 25;
  if (cropZoom >= 1.05 && cropZoom <= 1.65 && Math.abs(cropOffset.x) <= 35) {
    framingScore = 25;
  } else if (cropZoom === 1 && cropOffset.x === 0 && cropOffset.y === 0) {
    framingScore = 22;
  } else {
    const panPenalty = Math.min(10, Math.abs(cropOffset.x) * 0.15);
    const zoomPenalty = cropZoom > 2.2 ? 10 : cropZoom < 0.9 ? 8 : 0;
    framingScore = Math.max(8, Math.round(25 - panPenalty - zoomPenalty));
  }

  const alignmentScore = Math.min(100, Math.max(0, aspectScore + angleScore + framingScore));

  // Overall Weighted Score: 35% Brightness, 35% Resolution, 30% Alignment
  const overallScore = Math.min(
    100,
    Math.max(0, Math.round(brightnessScore * 0.35 + resolutionScore * 0.35 + alignmentScore * 0.30))
  );

  let statusGrade: QualityScoreBreakdown['statusGrade'] = 'EXCELLENT';
  let statusText = t.qualityExcellent;
  let colorScheme = {
    stroke: '#10b981', // emerald-500
    text: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
  };

  if (overallScore >= 90) {
    statusGrade = 'EXCELLENT';
    statusText = t.qualityExcellent;
    colorScheme = {
      stroke: '#10b981',
      text: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300',
      badgeText: 'text-emerald-700 dark:text-emerald-400',
    };
  } else if (overallScore >= 75) {
    statusGrade = 'GOOD';
    statusText = t.qualityGood;
    colorScheme = {
      stroke: '#3b82f6',
      text: 'text-blue-700 dark:text-blue-400',
      bg: 'bg-blue-50/80 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      badgeBg: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
      badgeText: 'text-blue-700 dark:text-blue-400',
    };
  } else if (overallScore >= 55) {
    statusGrade = 'FAIR';
    statusText = t.qualityFair;
    colorScheme = {
      stroke: '#f59e0b',
      text: 'text-amber-800 dark:text-amber-400',
      bg: 'bg-amber-50/80 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300',
      badgeText: 'text-amber-800 dark:text-amber-400',
    };
  } else {
    statusGrade = 'POOR';
    statusText = t.qualityPoor;
    colorScheme = {
      stroke: '#f43f5e',
      text: 'text-rose-800 dark:text-rose-400',
      bg: 'bg-rose-50/80 dark:bg-rose-950/30',
      border: 'border-rose-200 dark:border-rose-800',
      badgeBg: 'bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-300',
      badgeText: 'text-rose-800 dark:text-rose-400',
    };
  }

  return {
    overallScore,
    brightnessScore,
    alignmentScore,
    resolutionScore,
    statusGrade,
    statusText,
    colorScheme,
    recommendations,
  };
}

export const PhotoQualityMeter: React.FC<PhotoQualityMeterProps> = ({
  photo,
  cropZoom = 1,
  cropOffset = { x: 0, y: 0 },
  rotation = 0,
  fineAngle = 0,
  language,
  onOpenCropper,
  onAutoOvalFocus,
}) => {
  const isAr = language === 'ar';
  const t = translations[language].photo;

  const scoreData = useMemo(() => {
    return computePhotoQualityScore(photo, cropZoom, cropOffset, rotation, fineAngle, language);
  }, [photo, cropZoom, cropOffset, rotation, fineAngle, language]);

  const { overallScore, brightnessScore, alignmentScore, resolutionScore, statusText, colorScheme, recommendations } =
    scoreData;

  // SVG Circular Progress Constants
  const size = 120;
  const strokeWidth = 9;
  const center = size / 2;
  const radius = center - strokeWidth - 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  const getSubScoreBarColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 55) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div
      id="photo-quality-meter-container"
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 shadow-xs ${colorScheme.bg} ${colorScheme.border}`}
    >
      <div className="flex flex-col md:flex-row items-center gap-5">
        {/* Progress Ring */}
        <div className="relative shrink-0 flex flex-col items-center">
          <div className="relative w-[120px] h-[120px] flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
              {/* Background Track Circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                className="text-slate-200/80 dark:text-slate-700/60"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
              />

              {/* Dynamic Animated Progress Stroke */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={colorScheme.stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease',
                }}
              />
            </svg>

            {/* Inner Ring Metric Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
              <span className={`font-mono font-extrabold text-2xl sm:text-3xl leading-none ${colorScheme.text}`}>
                {photo ? `${overallScore}%` : '—'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                {isAr ? 'الجودة الكلية' : 'Quality'}
              </span>
            </div>
          </div>

          {/* Status Badge below Ring */}
          <div className="mt-2 text-center">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs ${colorScheme.badgeBg}`}
            >
              {overallScore >= 90 ? (
                <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : overallScore >= 75 ? (
                <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span>{statusText}</span>
            </span>
          </div>
        </div>

        {/* Dynamic Metric Breakdown Bars */}
        <div className="flex-1 w-full space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{t.qualityScoreTitle}</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {t.qualityScoreSubtitle}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {/* 1. Brightness & Exposure Sub-Meter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{t.brightnessScoreLabel}</span>
                </span>
                <div className="flex items-center gap-2">
                  {photo && (
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {photo.brightnessAvg}/255
                    </span>
                  )}
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 min-w-[32px] text-left rtl:text-right">
                    {photo ? `${brightnessScore}%` : '—'}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getSubScoreBarColor(brightnessScore)}`}
                  style={{ width: `${photo ? brightnessScore : 0}%` }}
                />
              </div>
            </div>

            {/* 2. Alignment & Framing Sub-Meter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <Crop className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{t.alignmentScoreLabel}</span>
                </span>
                <div className="flex items-center gap-2">
                  {photo && (
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {fineAngle === 0 && rotation === 0
                        ? isAr
                          ? 'مستقيمة 0°'
                          : 'Straight 0°'
                        : `${rotation + fineAngle}°`}
                    </span>
                  )}
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 min-w-[32px] text-left rtl:text-right">
                    {photo ? `${alignmentScore}%` : '—'}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getSubScoreBarColor(alignmentScore)}`}
                  style={{ width: `${photo ? alignmentScore : 0}%` }}
                />
              </div>
            </div>

            {/* 3. Resolution & Sharpness Sub-Meter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{t.resolutionScoreLabel}</span>
                </span>
                <div className="flex items-center gap-2">
                  {photo && (
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {photo.width}×{photo.height}
                    </span>
                  )}
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 min-w-[32px] text-left rtl:text-right">
                    {photo ? `${resolutionScore}%` : '—'}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getSubScoreBarColor(resolutionScore)}`}
                  style={{ width: `${photo ? resolutionScore : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Actionable Recommendations or Quick Optimization Controls */}
          {recommendations.length > 0 && photo && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{recommendations[0]}</span>
              </div>

              {/* Quick adjustment buttons if relevant */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {resolutionScore < 90 && onOpenCropper && (
                  <button
                    type="button"
                    onClick={onOpenCropper}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Crop className="w-3 h-3" />
                    <span>{isAr ? 'قص 600×600 لرفع النتيجة' : 'Crop 600×600'}</span>
                  </button>
                )}
                {alignmentScore < 85 && onAutoOvalFocus && (
                  <button
                    type="button"
                    onClick={onAutoOvalFocus}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>{isAr ? 'توسيط تلقائي للرأس' : 'Auto Oval Focus'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
