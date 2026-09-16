import React, { useState, useRef, useEffect } from 'react';
import { YEMEN_GOVERNORATES, YemenGovernorate } from '../data/yemenData';
import { MapPin, Building, ChevronDown, Check } from 'lucide-react';

interface YemenGovernorateSelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (govNameEn: string, gov?: YemenGovernorate) => void;
  onSelectAdvance?: () => void;
  language?: 'ar' | 'en';
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const YemenGovernorateSelect: React.FC<YemenGovernorateSelectProps> = ({
  id = 'address-district',
  name = 'address-district',
  value,
  onChange,
  onSelectAdvance,
  language = 'ar',
  label,
  required = false,
  disabled = false,
  className = '',
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isAr = language === 'ar';

  const selectedGov = YEMEN_GOVERNORATES.find(
    (g) =>
      g.nameEn.toLowerCase() === value.toLowerCase() ||
      g.nameAr === value ||
      g.id === value ||
      value.toLowerCase().includes(g.capitalEn.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredGovs = YEMEN_GOVERNORATES.filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      g.nameEn.toLowerCase().includes(q) ||
      g.nameAr.includes(q) ||
      g.capitalEn.toLowerCase().includes(q) ||
      g.capitalAr.includes(q) ||
      g.districts.some((d) => d.nameAr.includes(q) || d.nameEn.toLowerCase().includes(q))
    );
  });

  const handleSelect = (gov: YemenGovernorate) => {
    onChange(gov.nameEn, gov);
    setSearch('');
    setIsOpen(false);
    if (onSelectAdvance) {
      setTimeout(() => {
        onSelectAdvance();
      }, 50);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            {isAr ? 'محافظات اليمن (22)' : 'Yemen Governorates (22)'}
          </span>
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          disabled={disabled}
          value={isOpen ? search : (selectedGov ? (isAr ? `${selectedGov.nameEn} (${selectedGov.nameAr})` : selectedGov.nameEn) : value)}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setSearch(value);
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder || (isAr ? 'اختر أو اكتب المحافظة (مثال: Sanaa, Aden, Taiz...)' : 'Select or type governorate (e.g. Sanaa, Aden, Taiz...)')}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400 pr-9"
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!isOpen) setSearch('');
            setIsOpen(!isOpen);
          }}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-sm focus:outline-none animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>{isAr ? 'محافظات الجمهورية اليمنية معتمدة لـ DS-5501' : 'Official Yemeni Governorates for DS-5501'}</span>
            <span className="font-mono text-blue-600 font-bold">{filteredGovs.length}</span>
          </div>

          {filteredGovs.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 text-center">
              {isAr ? 'لم يتم العثور على محافظة مطابقة - يمكنك كتابة الاسم يدوياً' : 'No matching governorate found - you can type it manually'}
            </div>
          ) : (
            filteredGovs.map((gov) => {
              const isSelected =
                selectedGov?.id === gov.id ||
                value.toLowerCase() === gov.nameEn.toLowerCase() ||
                value === gov.nameAr;

              return (
                <div
                  key={gov.id}
                  onClick={() => handleSelect(gov)}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900">{gov.nameEn}</span>
                        <span className="text-xs text-slate-600 font-medium">({gov.nameAr})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {isAr ? `العاصمة: ${gov.capitalAr} | الرمز: ${gov.defaultPostalCode}` : `Capital: ${gov.capitalEn} | Zip: ${gov.defaultPostalCode}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                      {gov.defaultPostalCode}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
