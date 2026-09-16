import React, { useState, useEffect, useId } from 'react';
import { Applicant, Language, PassportMRZData } from '../types';
import {
  getOcrCandidateFields,
} from '../utils/ocrAutoFill';
import {
  Sparkles,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CreditCard,
  ShieldCheck,
  CheckSquare,
  Square,
  Layers,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface OcrAutoFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fieldsToUpdate: Partial<Applicant>, appliedFieldIds: string[]) => void;
  applicant: Applicant;
  mrzData?: PassportMRZData | null;
  language: Language;
}

type FilterTab = 'ALL' | 'DIFF' | 'IDENTICAL';

export const OcrAutoFillModal: React.FC<OcrAutoFillModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  applicant,
  mrzData,
  language,
}) => {
  const isAr = language === 'ar';
  const modalTitleId = useId();
  const modalDescId = useId();

  const activeMrz = mrzData || applicant.mrzData;
  const candidateFields = getOcrCandidateFields(applicant, activeMrz);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');

  // Initialize selected fields on open
  useEffect(() => {
    if (isOpen) {
      const initial = candidateFields
        .filter((f) => f.status !== 'IDENTICAL' || candidateFields.every((c) => c.status === 'IDENTICAL'))
        .map((f) => f.id);
      // If no differences exist, select all by default so user can still force re-sync
      setSelectedIds(initial.length > 0 ? initial : candidateFields.map((f) => f.id));
      setFilterTab('ALL');
    }
  }, [isOpen, applicant, activeMrz]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activeMrz) return null;

  const toggleField = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const setFieldSelection = (id: string, select: boolean) => {
    setSelectedIds((prev) => {
      if (select && !prev.includes(id)) return [...prev, id];
      if (!select && prev.includes(id)) return prev.filter((item) => item !== id);
      return prev;
    });
  };

  const selectAll = () => {
    setSelectedIds(candidateFields.map((f) => f.id));
  };

  const selectOnlyDifferences = () => {
    const diffIds = candidateFields
      .filter((f) => f.status === 'NEW' || f.status === 'OVERWRITE')
      .map((f) => f.id);
    setSelectedIds(diffIds);
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const handleApply = () => {
    const selectedCandidates = candidateFields.filter((f) =>
      selectedIds.includes(f.id)
    );

    let mergedUpdate: Partial<Applicant> = {};
    for (const field of selectedCandidates) {
      mergedUpdate = {
        ...mergedUpdate,
        ...field.applyValues,
      };
    }

    onConfirm(mergedUpdate, selectedIds);
  };

  const overwriteCount = candidateFields.filter(
    (f) => selectedIds.includes(f.id) && f.status === 'OVERWRITE'
  ).length;

  const newCount = candidateFields.filter(
    (f) => selectedIds.includes(f.id) && f.status === 'NEW'
  ).length;

  const identicalCount = candidateFields.filter(
    (f) => f.status === 'IDENTICAL'
  ).length;

  const totalDifferences = candidateFields.filter(
    (f) => f.status === 'NEW' || f.status === 'OVERWRITE'
  ).length;

  // Filter candidates based on active tab
  const filteredCandidates = candidateFields.filter((field) => {
    if (filterTab === 'DIFF') {
      return field.status === 'NEW' || field.status === 'OVERWRITE';
    }
    if (filterTab === 'IDENTICAL') {
      return field.status === 'IDENTICAL';
    }
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      aria-describedby={modalDescId}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-blue-900 via-indigo-900 to-blue-950 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600/40 border border-blue-400/30 rounded-xl text-blue-200 mt-0.5 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id={modalTitleId} className="text-base sm:text-lg font-bold">
                  {isAr
                    ? 'المقارنة جنباً إلى جنب: بيانات الجواز مقابل الاستمارة الحالية'
                    : 'Side-by-Side Review: Passport OCR vs. Current Form Values'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-800 text-blue-200 font-semibold border border-blue-700">
                  DS-5501 Compare
                </span>
              </div>
              <p id={modalDescId} className="text-xs text-blue-200/90 mt-1 leading-relaxed max-w-2xl">
                {isAr
                  ? 'قارن الحقول المستخرجة من شريط قراءة الجواز (MRZ) مقابل البيانات المسجلة حالياً في الاستمارة، واختر ما تود دمجه أو الإبقاء عليه قبل الحفظ.'
                  : 'Compare the extracted passport MRZ data side-by-side with your current form entries. Choose which values to merge or keep before applying.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="ocr-modal-close-btn"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Passport Source Info Banner */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-slate-600 font-medium">
                {isAr ? 'وثيقة جواز السفر المصدر:' : 'Source Document:'}
              </span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                {activeMrz.documentNumber || '—'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">
                {isAr ? 'الجنسية / دولة الإصدار:' : 'Nationality / Issuing:'}
              </span>
              <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-300">
                {activeMrz.nationality || activeMrz.issuingCountry || '—'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {activeMrz.validChecksum ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isAr ? 'أرقام التحقق موثقة (Checksum Valid)' : 'Checksum Verified'}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {isAr ? 'بدون تدقيق أرقام التحقق' : 'Checksum Unverified'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs & Selection Controls Toolbar */}
        <div className="px-4 sm:px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isAr ? 'جميع الحقول' : 'All Fields'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                {candidateFields.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('DIFF')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterTab === 'DIFF'
                  ? 'bg-white text-amber-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{isAr ? 'الفروقات والتحديثات' : 'Differences / Updates'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                {totalDifferences}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('IDENTICAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterTab === 'IDENTICAL'
                  ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isAr ? 'المتطابقة' : 'Identical'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                {identicalCount}
              </span>
            </button>
          </div>

          {/* Quick Bulk Selection Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold transition-colors px-2 py-1 rounded-md hover:bg-blue-50 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحديد الكل' : 'Select All'}</span>
            </button>
            {totalDifferences > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={selectOnlyDifferences}
                  className="flex items-center gap-1 text-amber-700 hover:text-amber-900 font-semibold transition-colors px-2 py-1 rounded-md hover:bg-amber-50 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isAr ? 'الفروقات فقط' : 'Differences Only'}</span>
                </button>
              </>
            )}
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-semibold transition-colors px-2 py-1 rounded-md hover:bg-slate-100 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>{isAr ? 'إلغاء التحديد' : 'Deselect All'}</span>
            </button>
          </div>
        </div>

        {/* Side-by-Side Comparison List */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
          {/* Column Header Guide on Desktop */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-4">
              {isAr ? 'الحقل / المعيار' : 'Form Field'}
            </div>
            <div className="col-span-3 text-slate-600">
              {isAr ? 'القيمة الحالية بالاستمارة' : 'Current Form Value'}
            </div>
            <div className="col-span-1 text-center">
              {isAr ? 'الدمج' : 'Merge'}
            </div>
            <div className="col-span-4 text-blue-900">
              {isAr ? 'بيانات الجواز المستخرجة (OCR)' : 'Extracted Passport (OCR)'}
            </div>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                {isAr ? 'لا توجد حقول في هذا التصنيف' : 'No fields found in this filter'}
              </p>
            </div>
          ) : (
            filteredCandidates.map((field) => {
              const isSelected = selectedIds.includes(field.id);
              const isDiff = field.status === 'OVERWRITE' || field.status === 'NEW';

              return (
                <div
                  key={field.id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isSelected
                      ? 'bg-white border-blue-300 shadow-xs ring-1 ring-blue-100'
                      : 'bg-white border-slate-200 opacity-90'
                  }`}
                >
                  <div className="p-3.5">
                    {/* Field Title & Status Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`ocr-select-${field.id}`}
                          checked={isSelected}
                          onChange={() => toggleField(field.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label
                          htmlFor={`ocr-select-${field.id}`}
                          className="text-xs font-bold text-slate-900 cursor-pointer hover:text-blue-700"
                        >
                          {isAr ? field.labelAr : field.labelEn}
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        {field.status === 'NEW' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {isAr ? '+ تعبئة جديدة (New)' : '+ New Entry'}
                          </span>
                        )}
                        {field.status === 'OVERWRITE' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            {isAr ? '⇄ سيستبدل القيمة الحالية' : '⇄ Will Overwrite'}
                          </span>
                        )}
                        {field.status === 'IDENTICAL' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            {isAr ? 'متطابق تماماً' : 'Identical Match'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Side-by-Side Comparison Container */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
                      {/* Left: Current Form Value */}
                      <div className="md:col-span-5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                            {isAr ? 'القيمة الحالية بالاستمارة' : 'Current Form Value'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFieldSelection(field.id, false)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              !isSelected
                                ? 'bg-slate-700 text-white'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {isAr ? 'الإبقاء على الحالي' : 'Keep Current'}
                          </button>
                        </div>
                        <div className="font-mono text-xs font-semibold text-slate-800 min-h-[22px] flex items-center">
                          {field.currentDisplay === '—' || !field.currentDisplay ? (
                            <span className="text-slate-400 italic text-[11px]">
                              {isAr ? '(فارغ / غير مسجل)' : '(Empty / Not set)'}
                            </span>
                          ) : (
                            <span className={isDiff && isSelected ? 'line-through text-slate-500' : 'text-slate-900'}>
                              {field.currentDisplay}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle: Transition Indicator / Direction */}
                      <div className="md:col-span-2 flex flex-col items-center justify-center py-1">
                        <div
                          className={`p-1.5 rounded-full border transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                        >
                          {isAr ? (
                            <ArrowLeft className="w-4 h-4" />
                          ) : (
                            <ArrowRight className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 mt-1">
                          {isSelected
                            ? (isAr ? 'سيتم التطبيق' : 'Apply OCR')
                            : (isAr ? 'مستثنى' : 'Skipped')}
                        </span>
                      </div>

                      {/* Right: Extracted OCR Value */}
                      <div
                        className={`md:col-span-5 p-2.5 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 shadow-2xs'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            {isAr ? 'بيانات الجواز (OCR)' : 'Extracted OCR'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFieldSelection(field.id, true)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                          >
                            {isAr ? 'استخدام الجواز' : 'Use OCR'}
                          </button>
                        </div>
                        <div className="font-mono text-xs font-bold text-blue-950 min-h-[22px] flex items-center">
                          {field.ocrDisplay}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Overwrite Advisory */}
          {overwriteCount > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {isAr
                    ? `تنبيه: سيتم استبدال بيانات ${overwriteCount} حقل(حقول) مسجلة مسبقاً في الاستمارة.`
                    : `Notice: ${overwriteCount} field(s) currently contain form data and will be overwritten with passport OCR data.`}
                </span>
                <p className="text-[11px] text-amber-900 mt-0.5">
                  {isAr
                    ? 'يمكنك التراجع في أي وقت عبر زر "تراجع عن التعبئة" الذي سيظهر أعلى الصفحة فور التطبيق.'
                    : 'You can immediately revert changes anytime using the "Undo Auto-Fill" button at the top of the page.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions & Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">
              {isAr ? 'ملخص الدمج:' : 'Merge Summary:'}{' '}
            </span>
            <span>
              {isAr
                ? `سيتم تطبيق ${selectedIds.length} حقل(حقول) (${newCount} جديد، ${overwriteCount} استبدال).`
                : `Applying ${selectedIds.length} field(s) (${newCount} new, ${overwriteCount} overwrite).`}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="ocr-modal-cancel-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
            >
              {isAr ? 'إلغاء الأمر' : 'Cancel'}
            </button>

            <button
              type="button"
              id="ocr-modal-confirm-merge-btn"
              disabled={selectedIds.length === 0}
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {isAr
                  ? `تأكيد ودمج الحقول المختارة (${selectedIds.length})`
                  : `Confirm & Merge Selected (${selectedIds.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
