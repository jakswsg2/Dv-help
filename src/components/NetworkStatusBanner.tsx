import React from 'react';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface NetworkStatusBannerProps {
  isOnline: boolean;
  wasOffline: boolean;
  language: Language;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({
  isOnline,
  wasOffline,
  language,
}) => {
  const t = translations[language];

  // If online and wasn't recently offline, don't render anything
  if (isOnline && !wasOffline) {
    return null;
  }

  // When connection was restored recently
  if (isOnline && wasOffline) {
    return (
      <aside
        aria-live="polite"
        className="bg-emerald-600 text-white px-4 py-2 text-xs sm:text-sm font-medium transition-all shadow-xs flex items-center justify-between border-b border-emerald-700"
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-emerald-500/50 rounded-full">
              <Wifi className="w-3.5 h-3.5" />
            </span>
            <span>{t.onlineRestored}</span>
          </div>
          <span className="text-[11px] opacity-80 font-mono">
            {language === 'ar' ? 'تم استئناف الحفظ التلقائي' : 'Auto-save resumed'}
          </span>
        </div>
      </aside>
    );
  }

  // Offline non-intrusive warning banner
  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="bg-amber-600 dark:bg-amber-700 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-md transition-all border-b border-amber-800 animate-in slide-in-from-top duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="p-1 bg-amber-500/60 dark:bg-amber-600/60 rounded-lg flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4 text-white" />
          </span>
          <div>
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{t.offlineTitle}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-100 font-normal leading-relaxed">
              {t.offlineNotice}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded-md bg-amber-800/80 text-amber-100 text-[10px] sm:text-xs font-mono font-semibold">
            {language === 'ar' ? 'الحفظ التلقائي معطّل مؤقتاً' : 'Auto-save Paused'}
          </span>
        </div>
      </div>
    </aside>
  );
};
