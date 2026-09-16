import React, { useMemo } from 'react';
import { Applicant, Language } from '../types';
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
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  CheckCircle2,
  FileCheck2,
  Image,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';

interface BureauStatsProps {
  applicants: Applicant[];
  language: Language;
}

// Calculate individual applicant completion percentage based on official DV criteria
export function calculateApplicantProgress(app: Applicant): {
  percentage: number;
  docsScore: number;
  hasPhoto: boolean;
  hasPassport: boolean;
  hasPersonal: boolean;
  hasAddress: boolean;
  hasEducation: boolean;
} {
  let points = 0;
  const totalPoints = 6;

  // 1. Core personal data (Name, Gender, DOB, Birth place)
  const hasPersonal = Boolean(
    app.lastName &&
    app.firstName &&
    app.gender &&
    app.birthDate &&
    (app.birthCity || app.birthCityUnknown) &&
    app.birthCountry
  );
  if (hasPersonal) points += 1;

  // 2. Address & Contact
  const hasAddress = Boolean(
    app.addressLine1 &&
    app.cityTown &&
    app.currentCountry &&
    app.email &&
    app.email === app.emailConfirmation
  );
  if (hasAddress) points += 1;

  // 3. Education / Qualification
  const hasEducation = Boolean(app.highestEducation);
  if (hasEducation) points += 1;

  // 4. Photo validation (600x600)
  const hasPhoto = Boolean(app.photo && app.photo.isSquare && app.photo.isSizeOk);
  if (hasPhoto) points += 1;

  // 5. Passport MRZ / ID Verification
  const hasPassport = Boolean(app.mrzData && app.mrzData.documentNumber);
  if (hasPassport) points += 1;

  // 6. Derivatives & Photo validation for dependents if applicable
  let hasDerivativesOk = true;
  if (app.maritalStatus.startsWith('MARRIED') && !app.familyMembers.some((m) => m.relationship === 'SPOUSE')) {
    hasDerivativesOk = false;
  }
  if (app.numberOfChildren > 0 && app.familyMembers.filter((m) => m.relationship === 'CHILD').length < app.numberOfChildren) {
    hasDerivativesOk = false;
  }
  if (hasDerivativesOk) points += 1;

  const percentage = Math.round((points / totalPoints) * 100);
  const docsScore = (hasPhoto ? 1 : 0) + (hasPassport ? 1 : 0);

  return {
    percentage,
    docsScore,
    hasPhoto,
    hasPassport,
    hasPersonal,
    hasAddress,
    hasEducation,
  };
}

export const BureauStats: React.FC<BureauStatsProps> = ({ applicants, language }) => {
  const isAr = language === 'ar';

  const stats = useMemo(() => {
    const total = applicants.length;
    if (total === 0) {
      return {
        total: 0,
        avgCompletion: 0,
        verifiedPhotos: 0,
        passportDocs: 0,
        readyToSubmit: 0,
        distributionData: [],
        statusPieData: [],
        docReadinessData: [],
      };
    }

    let totalPct = 0;
    let photoCount = 0;
    let passportCount = 0;
    let readyCount = 0;

    // Buckets for completion percentage distribution
    const buckets = {
      '0-25%': 0,
      '26-50%': 0,
      '51-75%': 0,
      '76-99%': 0,
      '100%': 0,
    };

    // Status counts
    const statusCounts: Record<string, number> = {
      DRAFT: 0,
      REVIEWING: 0,
      PHOTOS_VERIFIED: 0,
      READY_FOR_SUBMISSION: 0,
      SUBMITTED: 0,
    };

    applicants.forEach((app) => {
      const { percentage, hasPhoto, hasPassport } = calculateApplicantProgress(app);
      totalPct += percentage;
      if (hasPhoto) photoCount++;
      if (hasPassport) passportCount++;
      if (app.status === 'READY_FOR_SUBMISSION' || app.status === 'SUBMITTED') readyCount++;

      if (percentage <= 25) buckets['0-25%']++;
      else if (percentage <= 50) buckets['26-50%']++;
      else if (percentage <= 75) buckets['51-75%']++;
      else if (percentage < 100) buckets['76-99%']++;
      else buckets['100%']++;

      if (statusCounts[app.status] !== undefined) {
        statusCounts[app.status]++;
      } else {
        statusCounts['DRAFT']++;
      }
    });

    const avgCompletion = Math.round(totalPct / total);

    const distributionData = [
      {
        range: isAr ? '٠-٢٥٪ (بدء)' : '0-25% (Initial)',
        count: buckets['0-25%'],
        pct: Math.round((buckets['0-25%'] / total) * 100),
      },
      {
        range: isAr ? '٢٦-٥٠٪ (متوسط)' : '26-50% (Basic)',
        count: buckets['26-50%'],
        pct: Math.round((buckets['26-50%'] / total) * 100),
      },
      {
        range: isAr ? '٥١-٧٥٪ (متقدم)' : '51-75% (Advanced)',
        count: buckets['51-75%'],
        pct: Math.round((buckets['51-75%'] / total) * 100),
      },
      {
        range: isAr ? '٧٦-٩٩٪ (شبه مكتمل)' : '76-99% (Near Complete)',
        count: buckets['76-99%'],
        pct: Math.round((buckets['76-99%'] / total) * 100),
      },
      {
        range: isAr ? '١٠٠٪ (مكتمل وجاهز)' : '100% (Ready/Done)',
        count: buckets['100%'],
        pct: Math.round((buckets['100%'] / total) * 100),
      },
    ];

    const statusColors: Record<string, string> = {
      DRAFT: '#f59e0b', // amber-500
      REVIEWING: '#3b82f6', // blue-500
      PHOTOS_VERIFIED: '#a855f7', // purple-500
      READY_FOR_SUBMISSION: '#10b981', // emerald-500
      SUBMITTED: '#0d9488', // teal-600
    };

    const statusLabelsAr: Record<string, string> = {
      DRAFT: 'مسودة',
      REVIEWING: 'قيد المراجعة',
      PHOTOS_VERIFIED: 'فحص الصور',
      READY_FOR_SUBMISSION: 'جاهز للإرسال',
      SUBMITTED: 'تم التقديم',
    };

    const statusLabelsEn: Record<string, string> = {
      DRAFT: 'Draft',
      REVIEWING: 'Reviewing',
      PHOTOS_VERIFIED: 'Photos Ok',
      READY_FOR_SUBMISSION: 'Ready to Submit',
      SUBMITTED: 'Submitted',
    };

    const statusPieData = Object.keys(statusCounts)
      .filter((k) => statusCounts[k] > 0)
      .map((k) => ({
        name: isAr ? statusLabelsAr[k] : statusLabelsEn[k],
        value: statusCounts[k],
        color: statusColors[k] || '#64748b',
      }));

    const docReadinessData = [
      {
        category: isAr ? 'الصور الشخصية (600x600)' : 'Photos (600x600)',
        uploaded: photoCount,
        missing: total - photoCount,
        pct: Math.round((photoCount / total) * 100),
      },
      {
        category: isAr ? 'جواز السفر (MRZ)' : 'Passports (MRZ)',
        uploaded: passportCount,
        missing: total - passportCount,
        pct: Math.round((passportCount / total) * 100),
      },
      {
        category: isAr ? 'الملفات المكتملة بالكامل' : '100% Complete',
        uploaded: buckets['100%'],
        missing: total - buckets['100%'],
        pct: Math.round((buckets['100%'] / total) * 100),
      },
    ];

    return {
      total,
      avgCompletion,
      verifiedPhotos: photoCount,
      passportDocs: passportCount,
      readyToSubmit: readyCount,
      distributionData,
      statusPieData,
      docReadinessData,
    };
  }, [applicants, isAr]);

  if (stats.total === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span>
              {isAr ? 'إحصائيات تقدم ومعالجة الملفات (DV Progress Analytics)' : 'Applicant Progress & Document Analytics'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAr
              ? 'مخططات بيانية تفاعلية لقياس نسبة اكتمال البيانات وجاهزية الوثائق والصور لجميع المتقدمين'
              : 'Interactive visualization of form completion percentages, document readiness, and submission pipeline'}
          </p>
        </div>

        {/* Quick Badge KPI */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold">
            <span>{isAr ? 'متوسط الإنجاز العام:' : 'Overall Avg Completion:'}</span>
            <span className="text-sm font-extrabold text-blue-700">{stats.avgCompletion}%</span>
          </div>
        </div>
      </div>

      {/* KPI Micro Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold mb-1">
            <span>{isAr ? 'الصور المطابقة' : 'Valid Photos'}</span>
            <Image className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-purple-700">{stats.verifiedPhotos}</span>
            <span className="text-xs text-slate-400 font-medium">/ {stats.total}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-purple-600 h-1.5 rounded-full"
              style={{ width: `${Math.round((stats.verifiedPhotos / stats.total) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold mb-1">
            <span>{isAr ? 'بيانات الجوازات' : 'Passport MRZs'}</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-blue-700">{stats.passportDocs}</span>
            <span className="text-xs text-slate-400 font-medium">/ {stats.total}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${Math.round((stats.passportDocs / stats.total) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold mb-1">
            <span>{isAr ? 'ملفات مكتملة 100%' : '100% Ready'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-emerald-700">{stats.readyToSubmit}</span>
            <span className="text-xs text-slate-400 font-medium">/ {stats.total}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full"
              style={{ width: `${Math.round((stats.readyToSubmit / stats.total) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold mb-1">
            <span>{isAr ? 'معدل الجاهزية' : 'Readiness Index'}</span>
            <FileCheck2 className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-teal-700">
              {Math.round((stats.readyToSubmit / stats.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-teal-600 h-1.5 rounded-full"
              style={{ width: `${Math.round((stats.readyToSubmit / stats.total) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Completion Percentage Distribution (Bar Chart) */}
        <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>{isAr ? 'توزيع نسبة اكتمال البيانات بين المتقدمين' : 'Completion Percentage Distribution'}</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-medium">
              {isAr ? 'عدد المتقدمين بكل شريحة' : 'Applicants per tier'}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value: any) => [
                    `${Number(value) || 0} ${isAr ? 'متقدم' : 'applicants'}`,
                    isAr ? 'العدد' : 'Count',
                  ]}
                  labelFormatter={(label) => `${isAr ? 'شريحة' : 'Range'}: ${label}`}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {stats.distributionData.map((_, index) => {
                    // Gradual color scale from amber to emerald
                    const colors = ['#f59e0b', '#fbbf24', '#38bdf8', '#3b82f6', '#10b981'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Pipeline Status Breakdown (Donut Chart) */}
        <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-purple-600" />
              <span>{isAr ? 'توزيع حالات الملفات في المكتب' : 'Status Breakdown'}</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-medium">
              {stats.total} {isAr ? 'ملف' : 'total'}
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stats.statusPieData.map((entry, index) => (
                    <Cell key={`status-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                  formatter={(value: any) => [
                    `${Number(value) || 0} (${Math.round(((Number(value) || 0) / stats.total) * 100)}%)`,
                    isAr ? 'العدد' : 'Count',
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconSize={8}
                  formatter={(val) => <span className="text-[11px] text-slate-700 font-semibold">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-center text-slate-500 pt-1 border-t border-slate-200/60">
            {isAr
              ? `الملفات الجاهزة للإدخال الرسمي: ${stats.readyToSubmit} من ${stats.total}`
              : `Ready for official portal: ${stats.readyToSubmit} of ${stats.total}`}
          </div>
        </div>
      </div>
    </div>
  );
};
