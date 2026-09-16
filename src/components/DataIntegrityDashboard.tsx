import React, { useState, useMemo } from 'react';
import { Applicant, AppStep, Language } from '../types';
import { translations } from '../translations';
import { calculateApplicantProgress } from '../utils/applicantProgress';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  ShieldAlert,
  ShieldCheck,
  Camera,
  FileSpreadsheet,
  AlertTriangle,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Search,
  X,
  ExternalLink,
  Sparkles,
  Layers,
  FileCheck2,
} from 'lucide-react';

interface DataIntegrityDashboardProps {
  applicants: Applicant[];
  language: Language;
  onSelectApplicant: (id: string, step?: AppStep) => void;
}

export type IntegrityFilterType =
  | 'ALL'
  | 'CRITICAL_GAPS'
  | 'MISSING_PHOTO'
  | 'MISSING_PASSPORT'
  | 'MISSING_PERSONAL'
  | 'MISSING_ADDRESS'
  | 'MISSING_EDUCATION'
  | 'MISSING_FAMILY'
  | 'READY_100';

interface ApplicantIntegrityProfile {
  applicant: Applicant;
  percentage: number;
  estimatedSecondsRemaining: number;
  formattedTimeRemainingEn: string;
  formattedTimeRemainingAr: string;
  hasPhoto: boolean;
  hasPassport: boolean;
  hasPersonal: boolean;
  hasAddress: boolean;
  hasEducation: boolean;
  hasFamily: boolean;
  hasEligibility: boolean;
  missingItems: {
    id: string;
    stepKey: AppStep;
    labelEn: string;
    labelAr: string;
    isCritical: boolean;
  }[];
  criticalGapsCount: number;
  isReady100: boolean;
  firstIncompleteStep: AppStep;
}

export const DataIntegrityDashboard: React.FC<DataIntegrityDashboardProps> = ({
  applicants,
  language,
  onSelectApplicant,
}) => {
  const isAr = language === 'ar';
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<IntegrityFilterType>('ALL');

  // Compute integrity profiles for all applicants
  const profiles: ApplicantIntegrityProfile[] = useMemo(() => {
    return applicants.map((app) => {
      const prog = calculateApplicantProgress(app);

      // Analyze specific critical checkpoints
      const hasPhoto = Boolean(app.photo && app.photo.isSquare && app.photo.isSizeOk);
      const hasPassport = Boolean(app.mrzData?.documentNumber);
      const hasPersonal = Boolean(
        app.lastName &&
          app.firstName &&
          app.gender &&
          app.birthDate &&
          (app.birthCity || app.birthCityUnknown) &&
          app.birthCountry
      );
      const hasAddress = Boolean(
        app.addressLine1 &&
          app.cityTown &&
          app.currentCountry &&
          app.email &&
          app.emailConfirmation &&
          app.email.trim().toLowerCase() === app.emailConfirmation.trim().toLowerCase()
      );
      const hasEducation = Boolean(app.highestEducation);

      let hasFamily = true;
      if (
        app.maritalStatus.startsWith('MARRIED') &&
        !app.familyMembers.some((m) => m.relationship === 'SPOUSE')
      ) {
        hasFamily = false;
      }
      if (
        app.numberOfChildren > 0 &&
        app.familyMembers.filter((m) => m.relationship === 'CHILD').length < app.numberOfChildren
      ) {
        hasFamily = false;
      }

      const hasEligibility = Boolean(
        app.birthCountry || app.alternateCountryOfEligibility || app.isEligibleBasedOnBirthCountry
      );

      const missingItems: {
        id: string;
        stepKey: AppStep;
        labelEn: string;
        labelAr: string;
        isCritical: boolean;
      }[] = [];

      if (!hasPhoto) {
        missingItems.push({
          id: 'photo',
          stepKey: 'PHOTO',
          labelEn: 'Missing 600×600 Photo',
          labelAr: 'صورة شخصية 600×600 غير مرفوعة',
          isCritical: true,
        });
      }

      if (!hasPassport) {
        missingItems.push({
          id: 'passport',
          stepKey: 'DOCUMENTS',
          labelEn: 'Passport / MRZ Unverified',
          labelAr: 'شريط جواز السفر (MRZ) غير مقروء',
          isCritical: true,
        });
      }

      if (!hasPersonal) {
        missingItems.push({
          id: 'personal',
          stepKey: 'PERSONAL',
          labelEn: 'Incomplete Birth / Names',
          labelAr: 'بيانات الاسم أو الميلاد ناقصة',
          isCritical: true,
        });
      }

      if (!hasAddress) {
        missingItems.push({
          id: 'address',
          stepKey: 'PERSONAL',
          labelEn: 'Incomplete Address or Email',
          labelAr: 'العنوان أو البريد الإلكتروني ناقص',
          isCritical: true,
        });
      }

      if (!hasEducation) {
        missingItems.push({
          id: 'education',
          stepKey: 'ELIGIBILITY',
          labelEn: 'Education Level Unselected',
          labelAr: 'المؤهل العلمي غير محدد',
          isCritical: true,
        });
      }

      if (!hasFamily) {
        missingItems.push({
          id: 'family',
          stepKey: 'FAMILY',
          labelEn: 'Unlisted Spouse or Children',
          labelAr: 'بيانات الزوج أو الأبناء غير مكتملة',
          isCritical: true,
        });
      }

      // Determine first step needing attention
      let firstIncompleteStep: AppStep = 'PERSONAL';
      const incompleteStepSummary = prog.stepSummariesList.find((s) => !s.isCompleted);
      if (incompleteStepSummary) {
        firstIncompleteStep = incompleteStepSummary.stepKey;
      }

      return {
        applicant: app,
        percentage: prog.percentage,
        estimatedSecondsRemaining: prog.estimatedSecondsRemaining,
        formattedTimeRemainingEn: prog.formattedTimeRemainingEn,
        formattedTimeRemainingAr: prog.formattedTimeRemainingAr,
        hasPhoto,
        hasPassport,
        hasPersonal,
        hasAddress,
        hasEducation,
        hasFamily,
        hasEligibility,
        missingItems,
        criticalGapsCount: missingItems.length,
        isReady100: prog.percentage === 100,
        firstIncompleteStep,
      };
    });
  }, [applicants]);

  // Aggregate Data Integrity Statistics
  const stats = useMemo(() => {
    const total = profiles.length;
    if (total === 0) {
      return {
        total: 0,
        overallScore: 0,
        readyCount: 0,
        criticalDeficitCount: 0,
        photoCount: 0,
        passportCount: 0,
        familyCount: 0,
        personalCount: 0,
        addressCount: 0,
        educationCount: 0,
        missingInfoData: [],
        completionTiersData: [],
        stepHealthData: [],
        statusDonutData: [],
        avgTimeSeconds: 0,
      };
    }

    let totalScoreSum = 0;
    let readyCount = 0;
    let criticalDeficitCount = 0;
    let photoCount = 0;
    let passportCount = 0;
    let familyCount = 0;
    let personalCount = 0;
    let addressCount = 0;
    let educationCount = 0;
    let totalEstimatedSeconds = 0;

    const tiers = {
      tier1: 0, // 0-25%
      tier2: 0, // 26-50%
      tier3: 0, // 51-75%
      tier4: 0, // 76-99%
      tier5: 0, // 100%
    };

    const statusCounts: Record<string, number> = {
      DRAFT: 0,
      REVIEWING: 0,
      PHOTOS_VERIFIED: 0,
      READY_FOR_SUBMISSION: 0,
      SUBMITTED: 0,
    };

    // Step-by-step aggregated completion counts
    const stepCompletionCounts: Record<AppStep, { completed: number; total: number }> = {
      PERSONAL: { completed: 0, total },
      FAMILY: { completed: 0, total },
      DOCUMENTS: { completed: 0, total },
      PHOTO: { completed: 0, total },
      ELIGIBILITY: { completed: 0, total },
      CONSISTENCY: { completed: 0, total },
      OFFICIAL_PREP: { completed: 0, total },
    };

    profiles.forEach((p) => {
      totalScoreSum += p.percentage;
      totalEstimatedSeconds += p.estimatedSecondsRemaining;

      if (p.isReady100) readyCount++;
      if (p.criticalGapsCount > 0) criticalDeficitCount++;
      if (p.hasPhoto) photoCount++;
      if (p.hasPassport) passportCount++;
      if (p.hasFamily) familyCount++;
      if (p.hasPersonal) personalCount++;
      if (p.hasAddress) addressCount++;
      if (p.hasEducation) educationCount++;

      // Tiers
      if (p.percentage <= 25) tiers.tier1++;
      else if (p.percentage <= 50) tiers.tier2++;
      else if (p.percentage <= 75) tiers.tier3++;
      else if (p.percentage < 100) tiers.tier4++;
      else tiers.tier5++;

      // Status
      statusCounts[p.applicant.status] = (statusCounts[p.applicant.status] || 0) + 1;

      // Step health
      const prog = calculateApplicantProgress(p.applicant);
      prog.stepSummariesList.forEach((s) => {
        if (s.isCompleted) {
          stepCompletionCounts[s.stepKey].completed++;
        }
      });
    });

    const overallScore = Math.round(totalScoreSum / total);
    const avgTimeSeconds = Math.round(totalEstimatedSeconds / total);

    // Chart 1: Critical Missing Info Breakdown (Horizontal Bar Chart)
    const missingInfoData = [
      {
        category: isAr ? 'الصور الشخصية (600×600)' : 'Biometric Photos (600×600)',
        filterKey: 'MISSING_PHOTO' as IntegrityFilterType,
        missingCount: total - photoCount,
        compliantCount: photoCount,
        percentage: Math.round(((total - photoCount) / total) * 100),
        color: '#f43f5e', // rose-500
      },
      {
        category: isAr ? 'جواز السفر (MRZ)' : 'Passport MRZ Scans',
        filterKey: 'MISSING_PASSPORT' as IntegrityFilterType,
        missingCount: total - passportCount,
        compliantCount: passportCount,
        percentage: Math.round(((total - passportCount) / total) * 100),
        color: '#3b82f6', // blue-500
      },
      {
        category: isAr ? 'بيانات أفراد الأسرة' : 'Derivatives & Spouse',
        filterKey: 'MISSING_FAMILY' as IntegrityFilterType,
        missingCount: total - familyCount,
        compliantCount: familyCount,
        percentage: Math.round(((total - familyCount) / total) * 100),
        color: '#eab308', // yellow-500
      },
      {
        category: isAr ? 'الاسم والبيانات الشخصية' : 'Personal & Birth Info',
        filterKey: 'MISSING_PERSONAL' as IntegrityFilterType,
        missingCount: total - personalCount,
        compliantCount: personalCount,
        percentage: Math.round(((total - personalCount) / total) * 100),
        color: '#a855f7', // purple-500
      },
      {
        category: isAr ? 'العنوان والبريد الإلكتروني' : 'Address & Email',
        filterKey: 'MISSING_ADDRESS' as IntegrityFilterType,
        missingCount: total - addressCount,
        compliantCount: addressCount,
        percentage: Math.round(((total - addressCount) / total) * 100),
        color: '#06b6d4', // cyan-500
      },
      {
        category: isAr ? 'المؤهل العلمي' : 'Education Qualification',
        filterKey: 'MISSING_EDUCATION' as IntegrityFilterType,
        missingCount: total - educationCount,
        compliantCount: educationCount,
        percentage: Math.round(((total - educationCount) / total) * 100),
        color: '#f97316', // orange-500
      },
    ];

    // Chart 2: Completion Tiers
    const completionTiersData = [
      {
        name: isAr ? '0-25% (حرج)' : '0-25% (Critical)',
        count: tiers.tier1,
        color: '#ef4444',
      },
      {
        name: isAr ? '26-50% (أولي)' : '26-50% (Basic)',
        count: tiers.tier2,
        color: '#f97316',
      },
      {
        name: isAr ? '51-75% (متوسط)' : '51-75% (In Progress)',
        count: tiers.tier3,
        color: '#3b82f6',
      },
      {
        name: isAr ? '76-99% (متقدم)' : '76-99% (Near Ready)',
        count: tiers.tier4,
        color: '#06b6d4',
      },
      {
        name: isAr ? '100% (جاهز)' : '100% (Portal Ready)',
        count: tiers.tier5,
        color: '#10b981',
      },
    ];

    // Chart 3: Step-by-Step Form Health Matrix
    const stepNames: Record<AppStep, { ar: string; en: string }> = {
      PERSONAL: { ar: '1. البيانات', en: '1. Personal' },
      FAMILY: { ar: '2. الأسرة', en: '2. Family' },
      DOCUMENTS: { ar: '3. الجواز', en: '3. Passport' },
      PHOTO: { ar: '4. الصورة', en: '4. Photo' },
      ELIGIBILITY: { ar: '5. الأهلية', en: '5. Eligibility' },
      CONSISTENCY: { ar: '6. التدقيق', en: '6. Audit' },
      OFFICIAL_PREP: { ar: '7. التقديم', en: '7. Submission' },
    };

    const stepHealthData = (Object.keys(stepCompletionCounts) as AppStep[]).map((stepKey) => {
      const comp = stepCompletionCounts[stepKey].completed;
      const rate = Math.round((comp / total) * 100);
      return {
        step: isAr ? stepNames[stepKey].ar : stepNames[stepKey].en,
        completed: comp,
        incomplete: total - comp,
        rate,
      };
    });

    // Chart 4: Status Donut Chart
    const statusColors: Record<string, string> = {
      DRAFT: '#f59e0b',
      REVIEWING: '#3b82f6',
      PHOTOS_VERIFIED: '#a855f7',
      READY_FOR_SUBMISSION: '#10b981',
      SUBMITTED: '#0d9488',
    };

    const statusLabels: Record<string, { ar: string; en: string }> = {
      DRAFT: { ar: 'مسودة', en: 'Draft' },
      REVIEWING: { ar: 'مراجعة', en: 'Reviewing' },
      PHOTOS_VERIFIED: { ar: 'صور معتمدة', en: 'Photos Verified' },
      READY_FOR_SUBMISSION: { ar: 'جاهز للإدخال', en: 'Ready to Submit' },
      SUBMITTED: { ar: 'تم التقديم', en: 'Submitted' },
    };

    const statusDonutData = Object.keys(statusCounts)
      .filter((k) => statusCounts[k] > 0)
      .map((k) => ({
        name: isAr ? statusLabels[k]?.ar || k : statusLabels[k]?.en || k,
        value: statusCounts[k],
        color: statusColors[k] || '#64748b',
      }));

    return {
      total,
      overallScore,
      readyCount,
      criticalDeficitCount,
      photoCount,
      passportCount,
      familyCount,
      personalCount,
      addressCount,
      educationCount,
      missingInfoData,
      completionTiersData,
      stepHealthData,
      statusDonutData,
      avgTimeSeconds,
    };
  }, [profiles, isAr]);

  // Filtered applicants for triage list
  const filteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return profiles.filter((p) => {
      if (!query) {
        // No search query, check category filter only
      } else {
        const app = p.applicant;
        const mainPassport = (app.passportNumber || app.mrzData?.documentNumber || '').toLowerCase();
        const familyPassports = (app.familyMembers || []).map((m) => m.passportNumber || '').join(' ').toLowerCase();
        const familyNames = (app.familyMembers || []).map((m) => `${m.firstName || ''} ${m.middleName || ''} ${m.lastName || ''}`).join(' ').toLowerCase();
        const entrantNames = `${app.firstName || ''} ${app.middleName || ''} ${app.lastName || ''} ${app.lastName || ''} ${app.firstName || ''}`.toLowerCase();
        const otherData = `${app.confirmationNumber || ''} ${app.birthCountry || ''} ${app.email || ''}`.toLowerCase();

        const matchesSearch =
          entrantNames.includes(query) ||
          mainPassport.includes(query) ||
          familyPassports.includes(query) ||
          familyNames.includes(query) ||
          otherData.includes(query);

        if (!matchesSearch) return false;
      }

      switch (activeFilter) {
        case 'CRITICAL_GAPS':
          return p.criticalGapsCount > 0;
        case 'MISSING_PHOTO':
          return !p.hasPhoto;
        case 'MISSING_PASSPORT':
          return !p.hasPassport;
        case 'MISSING_PERSONAL':
          return !p.hasPersonal;
        case 'MISSING_ADDRESS':
          return !p.hasAddress;
        case 'MISSING_EDUCATION':
          return !p.hasEducation;
        case 'MISSING_FAMILY':
          return !p.hasFamily;
        case 'READY_100':
          return p.isReady100;
        case 'ALL':
        default:
          return true;
      }
    });
  }, [profiles, searchQuery, activeFilter]);

  if (stats.total === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
        <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          {isAr ? 'لا يوجد متقدمون نشطون حالياً' : 'No Active Applicants Found'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {isAr
            ? 'قم بإنشاء أو استيراد ملفات متقدمين لعرض لوحة سلامة البيانات والمخططات التحليلية'
            : 'Create or import applicant profiles to view the data integrity dashboard and charts'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="bureau-data-integrity-dashboard">
      {/* 1. Header Banner & Integrity KPI Score Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  {t.dataIntegrity.title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {stats.total} {t.dataIntegrity.activeEntrantsCount}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                {t.dataIntegrity.subtitle}
              </p>
            </div>
          </div>

          {/* Overall Health Gauge */}
          <div className="flex items-center gap-4 bg-slate-800/80 border border-slate-700/80 px-4 py-3 rounded-xl shrink-0">
            <div className="text-right rtl:text-right ltr:text-left">
              <div className="text-[11px] text-slate-400 font-medium">
                {t.dataIntegrity.overallIntegrityScore}
              </div>
              <div className="text-xs text-slate-300 font-semibold">
                {stats.readyCount} / {stats.total} {isAr ? 'جاهز 100%' : '100% Ready'}
              </div>
            </div>
            <div
              className={`text-2xl sm:text-3xl font-black px-3 py-1.5 rounded-xl border ${
                stats.overallScore >= 90
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : stats.overallScore >= 70
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : stats.overallScore >= 50
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}
            >
              {stats.overallScore}%
            </div>
          </div>
        </div>

        {/* Micro KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1">
              <span>{t.dataIntegrity.readyForPortal}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-400">{stats.readyCount}</span>
              <span className="text-xs text-slate-400 font-mono">/ {stats.total}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-1 rounded-full transition-all"
                style={{ width: `${Math.round((stats.readyCount / stats.total) * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1">
              <span>{t.dataIntegrity.criticalDeficit}</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-rose-400">{stats.criticalDeficitCount}</span>
              <span className="text-xs text-slate-400 font-mono">
                ({Math.round((stats.criticalDeficitCount / stats.total) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1 mt-2 overflow-hidden">
              <div
                className="bg-rose-500 h-1 rounded-full transition-all"
                style={{ width: `${Math.round((stats.criticalDeficitCount / stats.total) * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1">
              <span>{t.dataIntegrity.photoCompliance}</span>
              <Camera className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-purple-300">{stats.photoCount}</span>
              <span className="text-xs text-slate-400 font-mono">
                ({Math.round((stats.photoCount / stats.total) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1 mt-2 overflow-hidden">
              <div
                className="bg-purple-500 h-1 rounded-full transition-all"
                style={{ width: `${Math.round((stats.photoCount / stats.total) * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1">
              <span>{t.dataIntegrity.passportCompliance}</span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-blue-300">{stats.passportCount}</span>
              <span className="text-xs text-slate-400 font-mono">
                ({Math.round((stats.passportCount / stats.total) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1 mt-2 overflow-hidden">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all"
                style={{ width: `${Math.round((stats.passportCount / stats.total) * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1">
              <span>{t.dataIntegrity.familyCompliance}</span>
              <Users className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-amber-300">{stats.familyCount}</span>
              <span className="text-xs text-slate-400 font-mono">
                ({Math.round((stats.familyCount / stats.total) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1 mt-2 overflow-hidden">
              <div
                className="bg-amber-500 h-1 rounded-full transition-all"
                style={{ width: `${Math.round((stats.familyCount / stats.total) * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1">
              <span>{t.dataIntegrity.averageTimeRemaining}</span>
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-cyan-300">
                {Math.ceil(stats.avgTimeSeconds / 60)}{' '}
                <span className="text-xs font-normal">{isAr ? 'د' : 'min'}</span>
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {isAr ? 'متوسط إكمال الملف' : 'per applicant avg'}
            </div>
          </div>
        </div>

        {/* Quality Notice Bar if gaps exist */}
        {stats.criticalDeficitCount > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/70 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-200">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong className="font-bold">{t.dataIntegrity.criticalAlert}</strong>{' '}
                {t.dataIntegrity.criticalAlertDesc.replace(
                  '{count}',
                  stats.criticalDeficitCount.toString()
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveFilter('CRITICAL_GAPS')}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs whitespace-nowrap transition-colors cursor-pointer"
            >
              {t.dataIntegrity.filterCritical} ({stats.criticalDeficitCount})
            </button>
          </div>
        )}
      </div>

      {/* 2. Visual Charts Row 1: Critical Missing Info vs. Readiness Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart A: Critical Information Gaps (Horizontal Bar Chart) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>{t.dataIntegrity.missingCriticalInfoChart}</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.dataIntegrity.missingCriticalInfoSubtitle}
              </p>
            </div>
            <span className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg self-start sm:self-auto">
              {t.dataIntegrity.clickBarToFilter}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stats.missingInfoData}
                margin={{ top: 10, right: 25, left: isAr ? 20 : 10, bottom: 5 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const data = e.activePayload[0].payload;
                    if (data && data.filterKey) {
                      setActiveFilter(data.filterKey);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 11, fill: '#334155' }}
                  width={isAr ? 140 : 155}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.2)',
                  }}
                  formatter={(value: any, _name: any, item: any) => [
                    `${value} ${isAr ? 'متقدم ناقص' : 'missing'} (${item.payload.percentage}%)`,
                    isAr ? 'النواقص' : 'Missing Info',
                  ]}
                  labelFormatter={(label) => `${isAr ? 'الحقل' : 'Requirement'}: ${label}`}
                />
                <Bar
                  dataKey="missingCount"
                  name={isAr ? 'عدد النواقص' : 'Missing Count'}
                  radius={[0, 6, 6, 0]}
                  cursor="pointer"
                >
                  {stats.missingInfoData.map((entry, index) => (
                    <Cell
                      key={`missing-cell-${index}`}
                      fill={activeFilter === entry.filterKey ? '#ef4444' : entry.color}
                      className="hover:opacity-85 transition-opacity"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Completion Readiness Tiers (Bar Chart) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>{t.dataIntegrity.completionTiersChart}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.dataIntegrity.completionTiersSubtitle}
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.completionTiersData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                  formatter={(val: any) => [
                    `${val} ${isAr ? 'متقدم' : 'applicants'}`,
                    isAr ? 'العدد' : 'Count',
                  ]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {stats.completionTiersData.map((entry, index) => (
                    <Cell key={`tier-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl text-emerald-800 dark:text-emerald-300 font-semibold flex items-center justify-between">
              <span>{isAr ? 'جاهز 100%' : '100% Ready'}:</span>
              <span className="font-extrabold">{stats.readyCount}</span>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl text-rose-800 dark:text-rose-300 font-semibold flex items-center justify-between">
              <span>{isAr ? 'نواقص حرجة' : 'Critical Gaps'}:</span>
              <span className="font-extrabold">{stats.criticalDeficitCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Visual Charts Row 2: Step-by-Step Health Matrix & Pipeline Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart C: Step-by-Step Health Matrix (Grouped Bar Chart) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-500" />
              <span>{t.dataIntegrity.stepHealthMatrixChart}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.dataIntegrity.stepHealthMatrixSubtitle}
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.stepHealthData}
                margin={{ top: 10, right: 15, left: -15, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="step"
                  tick={{ fontSize: 11, fill: '#334155' }}
                  angle={-10}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                  formatter={(val: any, name: any, item: any) => [
                    `${val} ${isAr ? 'متقدم' : 'applicants'} (${item.payload.rate}%)`,
                    name === 'completed'
                      ? isAr
                        ? 'مكتمل'
                        : 'Completed'
                      : isAr
                      ? 'غير مكتمل'
                      : 'Incomplete',
                  ]}
                />
                <Bar
                  dataKey="completed"
                  name={isAr ? 'مكتمل' : 'Completed'}
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  stackId="stepStack"
                />
                <Bar
                  dataKey="incomplete"
                  name={isAr ? 'ناقص' : 'Incomplete'}
                  fill="#fca5a5"
                  radius={[4, 4, 0, 0]}
                  stackId="stepStack"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart D: Pipeline Status Donut */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>{t.dataIntegrity.statusDonutChart}</span>
            </h4>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stats.statusDonutData.map((entry, index) => (
                    <Cell key={`status-pie-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                  formatter={(val: any) => [
                    `${val} (${Math.round(((Number(val) || 0) / stats.total) * 100)}%)`,
                    isAr ? 'العدد' : 'Count',
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  iconSize={8}
                  formatter={(val) => (
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                      {val}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-center text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            {isAr
              ? `إجمالي الملفات المعالجة: ${stats.total}`
              : `Total applications tracked: ${stats.total}`}
          </div>
        </div>
      </div>

      {/* 4. Actionable Interactive Triage Table & Applicant Resolution List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
              <span>{t.dataIntegrity.triageSectionTitle}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.dataIntegrity.triageSectionSubtitle}
            </p>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[260px] flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-3 ltr:left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchApplicants}
              className="w-full pr-9 rtl:pr-9 ltr:pr-8 rtl:pl-8 ltr:pl-9 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 rtl:left-2.5 ltr:right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                title={t.clearSearch}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {t.dataIntegrity.filterAll} ({profiles.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('CRITICAL_GAPS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'CRITICAL_GAPS'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t.dataIntegrity.filterCritical}</span>
            <span className="font-mono text-[11px]">({stats.criticalDeficitCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('MISSING_PHOTO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'MISSING_PHOTO'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-purple-50 hover:text-purple-600'
            }`}
          >
            📸 {t.dataIntegrity.filterMissingPhoto} ({stats.total - stats.photoCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('MISSING_PASSPORT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'MISSING_PASSPORT'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-600'
            }`}
          >
            🛂 {t.dataIntegrity.filterMissingPassport} ({stats.total - stats.passportCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('MISSING_FAMILY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'MISSING_FAMILY'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50 hover:text-amber-600'
            }`}
          >
            👨‍👩‍👧 {t.dataIntegrity.filterMissingFamily} ({stats.total - stats.familyCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('READY_100')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'READY_100'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
          >
            ✓ {t.dataIntegrity.filterReady} ({stats.readyCount})
          </button>

          {activeFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 underline px-2 cursor-pointer"
            >
              {t.dataIntegrity.clearFilter}
            </button>
          )}
        </div>

        {/* Applicant Triage Cards / Rows */}
        <div className="space-y-3">
          {filteredProfiles.map((p) => {
            const fullName =
              `${p.applicant.lastName || ''} ${p.applicant.firstName || ''} ${
                p.applicant.middleName || ''
              }`.trim() || (isAr ? 'متقدم بدون اسم' : 'Unnamed Entrant');

            return (
              <div
                key={p.applicant.id}
                className={`p-4 rounded-2xl border transition-all ${
                  p.isReady100
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : p.criticalGapsCount > 2
                    ? 'bg-rose-50/20 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Left Column: Name & Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {fullName}
                      </span>
                      {p.applicant.confirmationNumber && (
                        <span className="text-[10px] font-mono font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                          {p.applicant.confirmationNumber}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          p.isReady100
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                        }`}
                      >
                        {t.status[p.applicant.status]}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>
                        {isAr ? 'البلد:' : 'Country:'} {p.applicant.birthCountry || '—'}
                      </span>
                      <span>•</span>
                      <span>
                        {isAr ? 'الجواز:' : 'Passport:'}{' '}
                        {p.applicant.mrzData?.documentNumber || (isAr ? 'غير مدرج' : 'Unlisted')}
                      </span>
                      <span>•</span>
                      <span>
                        {isAr ? 'المرافقون:' : 'Family:'} {p.applicant.familyMembers.length}
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Progress Bar & Estimated Time Remaining */}
                  <div className="flex items-center gap-4 lg:w-72 shrink-0">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span
                          className={
                            p.isReady100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                          }
                        >
                          {p.percentage}% {isAr ? 'مكتمل' : 'Complete'}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                          {isAr ? p.formattedTimeRemainingAr : p.formattedTimeRemainingEn}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            p.percentage === 100
                              ? 'bg-emerald-500'
                              : p.percentage >= 70
                              ? 'bg-blue-500'
                              : p.percentage >= 40
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${p.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Instant Fix Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectApplicant(p.applicant.id, p.firstIncompleteStep)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <span>{t.dataIntegrity.resolveInWizard}</span>
                      {isAr ? (
                        <ArrowLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Missing Critical Items Badges */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center gap-2 flex-wrap">
                  {p.missingItems.length > 0 ? (
                    <>
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{t.dataIntegrity.criticalBlockers}:</span>
                      </span>
                      {p.missingItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectApplicant(p.applicant.id, item.stepKey)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors cursor-pointer"
                          title={isAr ? 'اضغط للانتقال للخطوة وحل النقص' : 'Click to jump to step and resolve'}
                        >
                          <span>{isAr ? item.labelAr : item.labelEn}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      ))}
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.dataIntegrity.allRequirementsSatisfied}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredProfiles.length === 0 && (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              {t.dataIntegrity.noCriticalIssues}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
