import React, { useState, useRef, useEffect } from 'react';
import { COMMON_CITIES } from '../data/countries';
import { ALL_YEMEN_CITIES, findYemenGovernorate } from '../data/yemenData';
import { MapPin, Building2, Check } from 'lucide-react';

interface CityAutocompleteProps {
  id?: string;
  name?: string;
  autoComplete?: string;
  value: string;
  onChange: (cityName: string) => void;
  onSelectAdvance?: () => void;
  country?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showGovernorateBadge?: boolean;
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  id,
  name = 'address-level2',
  autoComplete = 'address-level2',
  value,
  onChange,
  onSelectAdvance,
  country,
  disabled = false,
  placeholder = 'e.g. Sanaa, Aden, Taiz...',
  className = '',
  showGovernorateBadge = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isYemen =
    country?.toLowerCase() === 'yemen' ||
    country === 'اليمن' ||
    country?.toLowerCase() === 'yem' ||
    (!country && (value.toLowerCase().includes('sanaa') || value.toLowerCase().includes('aden') || value.toLowerCase().includes('taiz')));

  // Retrieve suggested cities for the selected country
  const availableSuggestions = React.useMemo(() => {
    if (isYemen) {
      return ALL_YEMEN_CITIES;
    }
    if (country && COMMON_CITIES[country]) {
      return COMMON_CITIES[country];
    }
    // Default fallback list prioritizing major Yemen cities, then regional hubs
    return [
      'Sanaa',
      'Aden',
      'Taiz',
      'Al Hudaydah',
      'Ibb',
      'Al Mukalla',
      'Dhamar',
      'Cairo',
      'Riyadh',
      'Dubai',
      'Amman',
    ];
  }, [country, isYemen]);

  const filtered = React.useMemo(() => {
    if (!value.trim()) return availableSuggestions;
    const q = value.toLowerCase().trim();
    return availableSuggestions.filter((c) => c.toLowerCase().includes(q));
  }, [availableSuggestions, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCity = (cityName: string) => {
    onChange(cityName);
    setIsOpen(false);
    if (onSelectAdvance) {
      setTimeout(() => {
        onSelectAdvance();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isOpen && filtered.length > 0) {
        e.preventDefault();
        handleSelectCity(filtered[0]);
      } else if (value.trim() && onSelectAdvance) {
        e.preventDefault();
        onSelectAdvance();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const matchedGov = isYemen && value ? findYemenGovernorate(value) : undefined;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          id={id}
          name={name}
          autoComplete={autoComplete}
          type="text"
          list={`${id || name}-city-suggestions`}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen && e.target.value) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400"
        />

        {showGovernorateBadge && matchedGov && (
          <div className="absolute right-2 top-2 pointer-events-none hidden sm:flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
            <Building2 className="w-3 h-3 text-emerald-600" />
            <span>{matchedGov.nameAr}</span>
          </div>
        )}
      </div>

      <datalist id={`${id || name}-city-suggestions`}>
        {availableSuggestions.slice(0, 50).map((cityName) => (
          <option key={cityName} value={cityName} />
        ))}
      </datalist>

      {/* Suggested cities interactive pill list when active */}
      {isOpen && !disabled && filtered.length > 0 && (
        <div className="absolute z-40 mt-1 w-full max-h-56 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 text-xs focus:outline-none animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[10px] font-bold text-slate-500 px-2 py-1 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
            <span className="flex items-center gap-1 text-blue-700 font-bold">
              <MapPin className="w-3 h-3 text-blue-600" />
              {isYemen ? 'المدن والمحافظات المقترحة (اليمن - Yemen)' : `Suggested Cities ${country ? `(${country})` : ''}`}
            </span>
            <span className="text-[10px] font-mono text-slate-400">{filtered.length} suggestions</span>
          </div>

          <div className="flex flex-wrap gap-1 p-1">
            {filtered.slice(0, 16).map((cityName) => {
              const isSelected = value.toLowerCase() === cityName.toLowerCase();
              const gov = isYemen ? findYemenGovernorate(cityName) : undefined;

              return (
                <button
                  key={cityName}
                  type="button"
                  onClick={() => handleSelectCity(cityName)}
                  className={`px-2.5 py-1.5 rounded-lg text-left transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  <span className="font-medium">{cityName}</span>
                  {gov && (
                    <span
                      className={`text-[10px] px-1 py-0.2 rounded ${
                        isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {gov.nameAr}
                    </span>
                  )}
                  {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>

          {isYemen && (
            <div className="mt-2 pt-1.5 border-t border-slate-100 px-2 text-[10px] text-slate-500 flex items-center justify-between">
              <span>جميع عواصم ومديريات محافظات الجمهورية اليمنية الـ 22 متوفرة بدقة ICAO/DS-5501</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
