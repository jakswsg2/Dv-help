import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface DisclaimerBannerProps {
  language: Language;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ language }) => {
  const [expanded, setExpanded] = useState(false);
  const t = translations[language];

  return (
    <div className="bg-amber-50/90 border-b border-amber-200 text-amber-900 text-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-start sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <span className="font-bold text-amber-950 shrink-0">{t.complianceTitle}:</span>
            <p className="line-clamp-2 sm:line-clamp-1 lg:line-clamp-none text-amber-800 min-w-0">
              {t.complianceNotice}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href="https://dvprogram.state.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 underline"
            >
              <span>travel.state.gov</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 p-1.5 text-amber-700 hover:text-amber-950 rounded-lg hover:bg-amber-100 shrink-0"
              aria-label={language === 'ar' ? 'تفاصيل الالتزام' : 'Compliance details'}
              title="تفاصيل الالتزام القانوني والأخلاقي"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-amber-200/80 text-amber-900/90 leading-relaxed grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-2 bg-amber-100/50 p-2 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-950">1. عدم ضمان القبول أو الفوز:</strong>
                الجهة الوحيدة المخولة بالاختيار والقبول هي وزارة الخارجية الأمريكية. المنصة لا تقدم أي وعود غير قانونية.
              </div>
            </div>
            <div className="flex items-start gap-2 bg-amber-100/50 p-2 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-950">2. أداة تجهيز لا روبوت آلي:</strong>
                لا تتجاوز المنصة اختبارات CAPTCHA الحكومية بل توفر وضع نسخ الحقول المباشر للتعبئة اليدوية الآمنة.
              </div>
            </div>
            <div className="flex items-start gap-2 bg-amber-100/50 p-2 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-950">3. حظر تجميل الوجه بالذكاء الاصطناعي:</strong>
                يقتصر فحص الصور على الأبعاد الفنية (600×600 بكسل، الحجم &lt; 240KB، والحدة) مع صيانة الملامح الطبيعية بدون أي فلاتر.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
