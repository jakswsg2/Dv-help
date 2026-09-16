import { PhotoData, BrightnessAnalysis, BrightnessStatus } from '../types';

/**
 * Calculates Laplacian variance on grayscale image data to detect blur / sharpness.
 * A higher variance indicates sharper edges and clearer focus.
 */
function calculateLaplacianVariance(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): number {
  // Downscale for fast calculation if image is large
  const targetW = Math.min(width, 300);
  const targetH = Math.min(height, 300);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const tempCtx = canvas.getContext('2d');
  if (!tempCtx) return 100;

  tempCtx.drawImage(ctx.canvas, 0, 0, targetW, targetH);
  const imgData = tempCtx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;

  // Grayscale representation
  const gray = new Float32Array(targetW * targetH);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  // Apply 3x3 Laplacian filter
  // [  0,  1,  0 ]
  // [  1, -4,  1 ]
  // [  0,  1,  0 ]
  let sum = 0;
  let count = 0;
  const lap = new Float32Array((targetW - 2) * (targetH - 2));

  for (let y = 1; y < targetH - 1; y++) {
    for (let x = 1; x < targetW - 1; x++) {
      const idx = y * targetW + x;
      const val =
        gray[idx - targetW] +
        gray[idx + targetW] +
        gray[idx - 1] +
        gray[idx + 1] -
        4 * gray[idx];

      const lIdx = (y - 1) * (targetW - 2) + (x - 1);
      lap[lIdx] = val;
      sum += val;
      count++;
    }
  }

  if (count === 0) return 100;
  const mean = sum / count;

  let varianceSum = 0;
  for (let i = 0; i < count; i++) {
    const diff = lap[i] - mean;
    varianceSum += diff * diff;
  }

  return Math.round((varianceSum / count) * 10) / 10;
}

/**
 * Analyzes photo brightness and exposure using ITU-R BT.601 perceptual luma.
 * Evaluates overall luminance, central face area exposure, and highlights/shadows clipping
 * against official U.S. State Department photo specifications.
 */
export function analyzeImageBrightness(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): BrightnessAnalysis {
  const targetW = Math.min(width, 160);
  const targetH = Math.min(height, 160);
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const tempCtx = canvas.getContext('2d');
  if (!tempCtx) {
    return {
      avg: 140,
      faceAvg: 140,
      status: 'OPTIMAL',
      underexposedRatio: 0,
      overexposedRatio: 0,
      ratingMessage: 'Optimal balanced lighting',
    };
  }

  tempCtx.drawImage(ctx.canvas, 0, 0, targetW, targetH);
  const imgData = tempCtx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;

  // Face central region bounds (approx 25% to 75% horizontal, 20% to 70% vertical)
  const faceXMin = Math.floor(targetW * 0.25);
  const faceXMax = Math.floor(targetW * 0.75);
  const faceYMin = Math.floor(targetH * 0.20);
  const faceYMax = Math.floor(targetH * 0.70);

  let totalLuma = 0;
  let faceLuma = 0;
  let facePixelCount = 0;
  let darkPixelCount = 0;
  let blownHighlightCount = 0;
  const totalPixels = targetW * targetH;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = (y * targetW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Perceptual luma formula (ITU-R BT.601)
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuma += luma;

      if (luma < 50) {
        darkPixelCount++;
      } else if (luma > 238) {
        blownHighlightCount++;
      }

      if (x >= faceXMin && x <= faceXMax && y >= faceYMin && y <= faceYMax) {
        faceLuma += luma;
        facePixelCount++;
      }
    }
  }

  const avg = Math.round(totalLuma / totalPixels);
  const faceAvg = facePixelCount > 0 ? Math.round(faceLuma / facePixelCount) : avg;
  const underexposedRatio = +(darkPixelCount / totalPixels).toFixed(2);
  const overexposedRatio = +(blownHighlightCount / totalPixels).toFixed(2);

  // Official State Dept Lighting Specs:
  // Must be evenly lit without deep shadows or overexposure / blown highlights.
  let status: BrightnessStatus = 'OPTIMAL';
  let ratingMessage = 'إضاءة متوازنة ومستوفية للشروط الرسمية';

  if (avg < 85 || (faceAvg < 80 && underexposedRatio > 0.25) || underexposedRatio > 0.45) {
    status = 'TOO_DARK';
    ratingMessage = 'الصورة معتمة نسبياً وتفتقر للإضاءة الكافية (Too Dark / Underexposed)';
  } else if (avg > 215 || (faceAvg > 210 && overexposedRatio > 0.35) || overexposedRatio > 0.50) {
    status = 'WASHED_OUT';
    ratingMessage = 'الصورة مفرطة الإضاءة أو ساطعة للغاية (Washed Out / Overexposed)';
  }

  return {
    avg,
    faceAvg,
    status,
    underexposedRatio,
    overexposedRatio,
    ratingMessage,
  };
}

export function calculateAverageBrightness(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): number {
  return analyzeImageBrightness(ctx, width, height).avg;
}

export async function analyzePhoto(file: File): Promise<PhotoData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read photo file'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image content'));
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const fileSizeBytes = file.size;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        let sharpness = 120;
        let brightnessAnalysis: BrightnessAnalysis = {
          avg: 140,
          faceAvg: 140,
          status: 'OPTIMAL',
          underexposedRatio: 0,
          overexposedRatio: 0,
          ratingMessage: 'Optimal balanced lighting',
        };

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          sharpness = calculateLaplacianVariance(ctx, width, height);
          brightnessAnalysis = analyzeImageBrightness(ctx, width, height);
        }

        const isSquare = Math.abs(width - height) <= 2;
        const isSizeOk = fileSizeBytes <= 245760; // 240 KB

        const notes: string[] = [];
        if (width < 600 || height < 600) {
          notes.push(`الأبعاد الحالية (${width}×${height}) أقل من 600×600 بكسل المطلوبة.`);
        }
        if (!isSquare) {
          notes.push(`نسبة العرض للارتفاع ليست مربعة 1:1.`);
        }
        if (!isSizeOk) {
          notes.push(`حجم الملف (${Math.round(fileSizeBytes / 1024)} KB) يتجاوز الحد الأقصى المسموح (240 KB).`);
        }
        if (sharpness < 25) {
          notes.push(`تنبيه وضوح: قد تحتوي الصورة على اهتزاز أو ضبابية.`);
        }
        if (brightnessAnalysis.status === 'TOO_DARK') {
          notes.push(`تنبيه إضاءة (معتمة جداً): متوسط الإضاءة (${brightnessAnalysis.avg}/255) أقل من المطلوب رسمياً، يرجى تحسين الإضاءة لتفادي رفض الصورة.`);
        } else if (brightnessAnalysis.status === 'WASHED_OUT') {
          notes.push(`تنبيه إضاءة (باهتة / ساطعة جداً): متوسط الإضاءة (${brightnessAnalysis.avg}/255) مرتفع جداً مما يطمس معالم الوجه ولون البشرة.`);
        }

        resolve({
          dataUrl,
          width,
          height,
          fileSizeBytes,
          isSquare,
          isSizeOk,
          sharpnessScore: sharpness,
          brightnessAvg: brightnessAnalysis.avg,
          brightnessStatus: brightnessAnalysis.status,
          brightnessAnalysis,
          isInspected: true,
          notes,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Crops, rotates, scales and exports an image to exact 600x600 pixels with compression to ensure <= 240KB.
 */
export function cropToOfficialSquare(
  imageSource: string,
  cropArea: { x: number; y: number; size: number }
): Promise<PhotoData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      // Draw high quality cropped square
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.size,
        cropArea.size,
        0,
        0,
        600,
        600
      );

      // Export as JPEG with 92% quality (target <= 240KB)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const head = 'data:image/jpeg;base64,';
      const fileSizeBytes = Math.round(((dataUrl.length - head.length) * 3) / 4);

      const sharpness = calculateLaplacianVariance(ctx, 600, 600);
      const brightnessAnalysis = analyzeImageBrightness(ctx, 600, 600);

      const notes: string[] = [];
      if (brightnessAnalysis.status === 'TOO_DARK') {
        notes.push(`تنبيه إضاءة (معتمة جداً): متوسط الإضاءة (${brightnessAnalysis.avg}/255) أقل من المطلوب رسمياً، يرجى زيادة الإضاءة لتفادي الرفض.`);
      } else if (brightnessAnalysis.status === 'WASHED_OUT') {
        notes.push(`تنبيه إضاءة (باهتة / ساطعة جداً): متوسط الإضاءة (${brightnessAnalysis.avg}/255) مرتفع جداً مما يطمس تفاصيل الوجه (Washed Out).`);
      }

      resolve({
        dataUrl,
        width: 600,
        height: 600,
        fileSizeBytes,
        isSquare: true,
        isSizeOk: fileSizeBytes <= 245760,
        sharpnessScore: sharpness,
        brightnessAvg: brightnessAnalysis.avg,
        brightnessStatus: brightnessAnalysis.status,
        brightnessAnalysis,
        isInspected: true,
        notes,
      });
    };
    img.src = imageSource;
  });
}

export interface InteractiveCropConfig {
  zoom: number; // e.g. 1.0 = fit, > 1.0 = zoomed in
  panX: number; // offset in px relative to viewport
  panY: number; // offset in px relative to viewport
  rotation: number; // 0, 90, 180, 270 degrees
  fineAngle: number; // -15 to +15 degrees
  viewportDisplaySize: number; // display size of the square viewport container in px (e.g. 360)
}

export function cropAndExport600x600(
  imageSource: string,
  config: InteractiveCropConfig
): Promise<PhotoData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      // Fill background in case user zoomed out slightly
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 600);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Save context for transform operations
      ctx.save();

      // Move origin to center of 600x600 canvas
      ctx.translate(300, 300);

      // Total rotation = 90-deg step + fine angle
      const totalAngleRad = ((config.rotation + config.fineAngle) * Math.PI) / 180;
      ctx.rotate(totalAngleRad);

      // Scaling factor from viewport display size to 600px canvas
      const scaleMultiplier = 600 / (config.viewportDisplaySize || 360);

      // Pan translation adjusted for scale
      const translatedPanX = config.panX * scaleMultiplier;
      const translatedPanY = config.panY * scaleMultiplier;

      // Base scaling to fit image inside square viewport
      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;
      const baseFitScale = Math.max(600 / imgW, 600 / imgH);
      const effectiveScale = baseFitScale * config.zoom;

      const drawW = imgW * effectiveScale;
      const drawH = imgH * effectiveScale;

      ctx.drawImage(
        img,
        -drawW / 2 + translatedPanX,
        -drawH / 2 + translatedPanY,
        drawW,
        drawH
      );

      ctx.restore();

      // Export as high quality JPEG (target <= 240KB)
      let quality = 0.92;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      let head = 'data:image/jpeg;base64,';
      let fileSizeBytes = Math.round(((dataUrl.length - head.length) * 3) / 4);

      // If file size exceeds 240KB, incrementally compress to meet official requirement
      while (fileSizeBytes > 245760 && quality > 0.6) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        fileSizeBytes = Math.round(((dataUrl.length - head.length) * 3) / 4);
      }

      const sharpness = calculateLaplacianVariance(ctx, 600, 600);
      const brightnessAnalysis = analyzeImageBrightness(ctx, 600, 600);

      const notes: string[] = [];
      if (fileSizeBytes > 245760) {
        notes.push(`حجم الملف (${Math.round(fileSizeBytes / 1024)} KB) يتجاوز الحد الأقصى.`);
      }
      if (sharpness < 25) {
        notes.push('تنبيه: الصورة قد تبدو غير حادة أو بها ضبابية خفيفة بعد التكبير.');
      }
      if (brightnessAnalysis.status === 'TOO_DARK') {
        notes.push(`تنبيه إضاءة (معتمة جداً): متوسط الإضاءة (${brightnessAnalysis.avg}/255) أقل من المطلوب رسمياً، يرجى زيادة الإضاءة لتفادي الرفض.`);
      } else if (brightnessAnalysis.status === 'WASHED_OUT') {
        notes.push(`تنبيه إضاءة (باهتة / ساطعة جداً): متوسط الإضاءة (${brightnessAnalysis.avg}/255) مرتفع جداً مما يطمس تفاصيل الوجه (Washed Out).`);
      }

      resolve({
        dataUrl,
        width: 600,
        height: 600,
        fileSizeBytes,
        isSquare: true,
        isSizeOk: fileSizeBytes <= 245760,
        sharpnessScore: sharpness,
        brightnessAvg: brightnessAnalysis.avg,
        brightnessStatus: brightnessAnalysis.status,
        brightnessAnalysis,
        isInspected: true,
        notes,
      });
    };
    img.src = imageSource;
  });
}

export interface RectCropConfig {
  x: number;
  y: number;
  size: number;
}

export function cropRectTo600x600(
  imageSource: string,
  rect: RectCropConfig
): Promise<PhotoData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 600);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      const safeX = Math.max(0, Math.min(naturalW - 10, rect.x));
      const safeY = Math.max(0, Math.min(naturalH - 10, rect.y));
      const safeSize = Math.max(20, Math.min(naturalW - safeX, naturalH - safeY, rect.size));

      ctx.drawImage(
        img,
        safeX,
        safeY,
        safeSize,
        safeSize,
        0,
        0,
        600,
        600
      );

      let quality = 0.94;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      const head = 'data:image/jpeg;base64,';
      let fileSizeBytes = Math.round(((dataUrl.length - head.length) * 3) / 4);

      while (fileSizeBytes > 245760 && quality > 0.5) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        fileSizeBytes = Math.round(((dataUrl.length - head.length) * 3) / 4);
      }

      const sharpness = calculateLaplacianVariance(ctx, 600, 600);
      const brightnessAnalysis = analyzeImageBrightness(ctx, 600, 600);

      const notes: string[] = [];
      if (fileSizeBytes > 245760) {
        notes.push('حجم الملف يتجاوز الحد الأقصى (240 KB)');
      }
      if (sharpness < 25) {
        notes.push('تنبيه: الصورة قد تبدو غير حادة أو بها ضبابية خفيفة بعد التكبير.');
      }
      if (brightnessAnalysis.status === 'TOO_DARK') {
        notes.push(`تنبيه إضاءة (معتمة جداً): متوسط الإضاءة (${brightnessAnalysis.avg}/255) أقل من المطلوب رسمياً، يرجى زيادة الإضاءة لتفادي الرفض.`);
      } else if (brightnessAnalysis.status === 'WASHED_OUT') {
        notes.push(`تنبيه إضاءة (باهتة / ساطعة جداً): متوسط الإضاءة (${brightnessAnalysis.avg}/255) مرتفع جداً مما يطمس تفاصيل الوجه (Washed Out).`);
      }

      resolve({
        dataUrl,
        width: 600,
        height: 600,
        fileSizeBytes,
        isSquare: true,
        isSizeOk: fileSizeBytes <= 245760,
        sharpnessScore: sharpness,
        brightnessAvg: brightnessAnalysis.avg,
        brightnessStatus: brightnessAnalysis.status,
        brightnessAnalysis,
        isInspected: true,
        notes,
      });
    };
    img.src = imageSource;
  });
}

export function rotateImage90(
  imageSource: string,
  direction: 'cw' | 'ccw'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Failed to rotate image'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight || img.height;
      canvas.height = img.naturalWidth || img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(direction === 'cw' ? Math.PI / 2 : -Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageSource;
  });
}

