import React, { useState, useRef, useEffect } from 'react';
import { ISO_COUNTRIES, CountryItem } from '../data/countries';
import { Globe, ChevronDown, Check, AlertCircle } from 'lucide-react';

interface CountryAutocompleteProps {
  id?: string;
  name?: string;
  autoComplete?: string;
  value: string;
  onChange: (countryName: string, countryObj?: CountryItem) => void;
  onSelectAdvance?: () => void;
  language?: 'ar' | 'en';
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  filterIneligibleDV?: boolean; // highlight or note if country is historically excluded from DV
  className?: string;
}

export const CountryAutocomplete: React.FC<CountryAutocompleteProps> = ({
  id,
  name = 'country-name',
  autoComplete = 'country-name',
  value,
  onChange,
  onSelectAdvance,
  language = 'ar',
  label,
  required = false,
  disabled = false,
  placeholder,
  filterIneligibleDV = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAr = language === 'ar';

  // Find currently selected country
  const selectedCountry = ISO_COUNTRIES.find(
    (c) => c.nameEn.toLowerCase() === value.toLowerCase() || c.nameAr === value || c.code === value
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

  const filteredCountries = ISO_COUNTRIES.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      c.nameEn.toLowerCase().includes(q) ||
      c.nameAr.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    // When no specific search, prioritize Yemen (primary application focus)
    if (!search.trim()) {
      if (a.code === 'YEM') return -1;
      if (b.code === 'YEM') return 1;
      if (a.code === 'EGY') return -1;
      if (b.code === 'EGY') return 1;
    }
    return a.nameEn.localeCompare(b.nameEn);
  });

  const handleSelect = (country: CountryItem) => {
    onChange(country.nameEn, country);
    setSearch('');
    setIsOpen(false);
    if (onSelectAdvance) {
      setTimeout(() => {
        onSelectAdvance();
      }, 50);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value;
    setSearch(typed);
    onChange(typed);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isOpen && filteredCountries.length > 0) {
        e.preventDefault();
        handleSelect(filteredCountries[0]);
      } else if (value && onSelectAdvance) {
        e.preventDefault();
        onSelectAdvance();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Globe className="w-4 h-4" />
        </div>

        <input
          id={id}
          name={name}
          autoComplete={autoComplete}
          type="text"
          disabled={disabled}
          ref={inputRef}
          value={isOpen ? search : (selectedCountry ? (isAr ? `${selectedCountry.nameEn} (${selectedCountry.nameAr})` : selectedCountry.nameEn) : value)}
          onChange={handleInputChange}
          onFocus={() => {
            setSearch(value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || (isAr ? 'ابحث أو اختر الدولة...' : 'Search or select country...')}
          className={`w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400`}
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!isOpen) {
              setSearch('');
              inputRef.current?.focus();
            }
            setIsOpen(!isOpen);
          }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 disabled:opacity-50"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Datalist fallback for native browser form autofill support */}
      <datalist id={`${id || name}-list`}>
        {ISO_COUNTRIES.map((c) => (
          <option key={c.code} value={c.nameEn}>
            {c.nameAr} ({c.code})
          </option>
        ))}
      </datalist>

      {/* Enhanced Custom Dropdown Menu with ISO info & DV eligibility warning */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-sm focus:outline-none animate-in fade-in zoom-in-95 duration-100">
          {filteredCountries.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 text-center">
              {isAr ? 'لم يتم العثور على دولة مطابقة' : 'No matching country found'}
            </div>
          ) : (
            filteredCountries.map((c) => {
              const isSelected =
                selectedCountry?.code === c.code ||
                value.toLowerCase() === c.nameEn.toLowerCase();

              return (
                <div
                  key={c.code}
                  onClick={() => handleSelect(c)}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {c.code}
                    </span>
                    <span className="text-xs">{c.nameEn}</span>
                    <span className="text-xs text-slate-500 font-normal">({c.nameAr})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {filterIneligibleDV && c.ineligibleDV && (
                      <span
                        title={isAr ? 'دولة غير مؤهلة لقرعة الهجرة التعددية لكثرة المهاجرين' : 'Historically ineligible due to high admission rates'}
                        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"
                      >
                        <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                        <span>DV Notice</span>
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
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
