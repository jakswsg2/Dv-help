import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Language } from '../types';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sun,
  Maximize2,
  Camera,
  AlertTriangle,
  Lightbulb,
  FileCheck,
  Eye,
  UserCheck,
  HelpCircle,
  Check,
} from 'lucide-react';

interface PhotoRequirementsModalProps {
  language: Language;
  onClose: () => void;
}

export const PhotoRequirementsModal: React.FC<PhotoRequirementsModalProps> = ({
  language,
  onClose,
}) => {
  const isAr = language === 'ar';

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const requirements = [
    {
      id: 'background',
      icon: <Sun className="w-5 h-5 text-amber-500" />,
      title: isAr ? '1. لون الخلفية والإضاءة' : '1. Background Color & Lighting',
      rules: [
        {
          label: isAr ? 'لون الخلفية:' : 'Background Color:',
          desc: isAr
            ? 'يجب أن تكون الخلفية بيضاء نقية أو بيضاء مائلة للعاجي (Off-White) خالية تماماً من أي نقوش، أنماط، أثاث أو أشخاص آخرين.'
            : 'Must be plain white or off-white. Free from patterns, textures, furniture, household objects, or other people.',
          valid: true,
        },
        {
          label: isAr ? 'انعدام الظلال:' : 'No Shadows:',
          desc: isAr
            ? 'ممنوع وجود أي ظلال ملحوظة على خلفية الجدار أو خلف الرأس أو على الرقبة والوجه.'
            : 'No noticeable shadows behind the head, on the background, under the chin, or across the face.',
          valid: true,
        },
        {
          label: isAr ? 'توازن الإضاءة:' : 'Even Lighting:',
          desc: isAr
            ? 'إضاءة متوازنة وموزعة بانتظام على جانبي الوجه، بدون لمعان زائد (Glares)، تعريض ضوئي مفرط، أو عتمة تؤثر على وضوح الملامح.'
            : 'Uniform, balanced lighting across both sides of the face without flash glares, washed-out highlights, or underexposure.',
          valid: true,
        },
      ],
    },
    {
      id: 'head-size',
      icon: <Maximize2 className="w-5 h-5 text-blue-500" />,
      title: isAr ? '2. حجم وتمركز الرأس والأبعاد' : '2. Head Size & Positioning',
      rules: [
        {
          label: isAr ? 'نسبة ارتفاع الرأس (50% - 69%):' : 'Head Size Ratio (50% – 69%):',
          desc: isAr
            ? 'يجب أن يشغل الرأس من أسفل الذقن حتى قمة شعر الرأس ما بين 50% إلى 69% من إجمالي ارتفاع الصورة (بين 300 إلى 414 بكسل في صورة 600×600).'
            : 'Head height from the bottom of the chin to the top of the hair must be between 50% and 69% of total height (300 to 414 pixels).',
          valid: true,
        },
        {
          label: isAr ? 'مستوى ارتفاع العينين (56% - 69%):' : 'Eye Height Level (56% – 69%):',
          desc: isAr
            ? 'يجب أن يكون مستوى العينين بين 56% إلى 69% من أسفل الصورة (بين 336 إلى 414 بكسل من القاع).'
            : 'Eyes must be positioned between 56% and 69% (336 to 414 pixels) measured from the bottom border of the photograph.',
          valid: true,
        },
        {
          label: isAr ? 'استقامة الرأس والوجه:' : 'Direct Facing & Centered:',
          desc: isAr
            ? 'الوجه في المنتصف تماماً ومواجه للكاميرا مباشرة. يمنع إمالة الرأس يميناً أو يساراً أو للأعلى أو للأسفل (لا لزوايا السيلفي).'
            : 'Head centered directly facing the camera lens squarely. No upward, downward, or sideways tilting (no selfie angles).',
          valid: true,
        },
      ],
    },
    {
      id: 'expression',
      icon: <Eye className="w-5 h-5 text-emerald-500" />,
      title: isAr ? '3. تعابير الوجه والعينين' : '3. Facial Expression & Eyes',
      rules: [
        {
          label: isAr ? 'تعبير طبيعي ومحايد:' : 'Neutral Expression:',
          desc: isAr
            ? 'تعبير وجه محايد ومسترخٍ مع إغلاق الفم وعدم إظهار الأسنان، أو ابتسامة خفيفة طبيعية غير متكلفة.'
            : 'Neutral, relaxed facial expression with mouth closed and teeth not displayed, or a gentle natural unforced smile.',
          valid: true,
        },
        {
          label: isAr ? 'العينان مفتوحتان ومصوبتان:' : 'Eyes Open & Looking Ahead:',
          desc: isAr
            ? 'كلا العينين مفتوحتان بوضوح ومصوبتان مباشرة نحو عدسة الكاميرا بدون وميض أو تضييق جفون.'
            : 'Both eyes wide open and gazing directly at the camera lens with clear iris and pupil visibility.',
          valid: true,
        },
      ],
    },
    {
      id: 'attire-glasses',
      icon: <UserCheck className="w-5 h-5 text-rose-500" />,
      title: isAr ? '4. النظارات، غطاء الرأس والملابس' : '4. Eyeglasses, Head Coverings & Attire',
      rules: [
        {
          label: isAr ? 'حظر النظارات نهائياً (ممنوع):' : 'No Eyeglasses (Strictly Prohibited):',
          desc: isAr
            ? 'ممنوع منعاً باتاً ارتداء أي نظارات (طبية، شمسية، أو للقراءة) منذ عام 2016. ارتداء النظارات يؤدي لاستبعاد الطلب فوراً.'
            : 'Eyeglasses are strictly forbidden since Nov 2016 (including prescription glasses and tinted sunglasses). Instant rejection.',
          valid: false,
        },
        {
          label: isAr ? 'غطاء الرأس والحجاب الديني:' : 'Religious Head Coverings:',
          desc: isAr
            ? 'مسموح به للأغراض الدينية المثبتة فقط، بشرط ظهور كامل الوجه من منبت الشعر أعلى الجبين حتى أسفل الذقن وجانبي الوجنتين بوضوح تام دون ظلال.'
            : 'Permitted only for religious/medical reasons. Full facial oval from hairline/forehead to chin and both cheek edges must be visible.',
          valid: true,
        },
        {
          label: isAr ? 'الملابس اليومية العادية:' : 'Everyday Street Attire:',
          desc: isAr
            ? 'يجب ارتداء ملابس مدنية عادية. يحظر ارتداء الزي العسكري أو ملابس العمل الرسمية أو التمويهية، ويحظر وضع سماعات الأذن أو البلوتوث.'
            : 'Wear normal everyday attire. Uniforms, camouflage, military attire, headphones, or wireless earbuds are strictly prohibited.',
          valid: true,
        },
      ],
    },
    {
      id: 'digital-specs',
      icon: <FileCheck className="w-5 h-5 text-indigo-500" />,
      title: isAr ? '5. المواصفات الرقمية وحداثة الصورة' : '5. Digital Specs & Recency',
      rules: [
        {
          label: isAr ? 'المقاس والأبعاد:' : 'Dimensions & Aspect Ratio:',
          desc: isAr
            ? 'أبعاد مربعة 1:1، بمقاس 600×600 بكسل على الأقل وحتى 1200×1200 بكسل بدقة مناسبة.'
            : 'Square 1:1 aspect ratio, minimum 600×600 pixels up to 1200×1200 pixels.',
          valid: true,
        },
        {
          label: isAr ? 'صيغة وحجم الملف:' : 'File Format & Size Limit:',
          desc: isAr
            ? 'صيغة JPEG (.jpg) فقط، بحجم أقصى 240 كيلوبايت (240 KB) وبنظام ألوان 24-bit sRGB.'
            : 'JPEG (.jpg) format only, file size must not exceed 240 Kilobytes (KB), 24-bit sRGB color.',
          valid: true,
        },
        {
          label: isAr ? 'حداثة الصورة (أقل من 6 أشهر):' : 'Recent Photo (< 6 Months):',
          desc: isAr
            ? 'يجب أن تكون الصورة حديثة التقطت خلال آخر 6 أشهر لتعكس مظهرك الحالي. يمنع إعادة استخدام صور الأعوام السابقة.'
            : 'Must be taken within the last 6 months to reflect current appearance. Never reuse photos from previous DV years.',
          valid: true,
        },
        {
          label: isAr ? 'ممنوع التعديل بالذكاء الاصطناعي أو الفلاتر:' : 'No AI Filters or Retouching:',
          desc: isAr
            ? 'ممنوع تعديل ملامح الوجه أو تنعيم البشرة أو إزالة الشامات والندبات أو استخدام فلاتر تجميلية أو صور مولدة بالذكاء الاصطناعي.'
            : 'No digital manipulation, beauty filters, skin smoothing, feature reshaping, or AI-generated modifications allowed.',
          valid: false,
        },
      ],
    },
  ];

  const dosAndDonts = [
    {
      type: 'do',
      title: isAr ? 'ما يجب الالتزام به (مقبول)' : 'Acceptable Practices (Do)',
      items: isAr
        ? [
            'خلفية بيضاء أو بيضاء عاجية سادة ومضاءة بدون ظلال',
            'الرأس في المنتصف بارتفاع 50% إلى 69% من إجمالي الصورة',
            'مستوى العينين بين 56% إلى 69% من القاع',
            'النظر مباشرة لعدسة الكاميرا بعينين مفتوحتين',
            'تعبير وجه محايد وطبيعي مع فم مغلق',
            'إضاءة متوازنة تكشف لون البشرة الطبيعي',
          ]
        : [
            'Plain solid white or off-white background with zero shadows',
            'Head centered, covering 50% to 69% of the vertical frame',
            'Eye level height placed between 56% and 69% from the bottom',
            'Direct eye contact with open eyes and relaxed gaze',
            'Neutral, calm facial expression with closed mouth',
            'Even, balanced lighting showing natural skin tone',
          ],
    },
    {
      type: 'dont',
      title: isAr ? 'أسباب الرفض الشائعة (ممنوع)' : 'Common Rejections (Don’t)',
      items: isAr
        ? [
            'ارتداء أي نظارات (طبية أو شمسية) مهما كانت الأسباب',
            'وجود ظلال على الجدار أو خلف الرأس أو أسفل الذقن',
            'إمالة الرأس يميناً/يساراً أو التقاط صور بزوايا سيلفي شخصية',
            'خلفية ملونة، مزخرفة، أو جدران غرفة نوم غير بيضاء',
            'إعادة استخدام نفس صورة العام الماضي في تقديم جديد',
            'استخدام فلاتر تجميل أو تنعيم البشرة أو تعديل الملامح رقمياً',
          ]
        : [
            'Wearing any glasses (prescription, reader, or sunglasses)',
            'Shadows visible behind the ears, on the wall, or under chin',
            'Tilted head, turned profile, or high/low angled selfies',
            'Colored, textured, patterned, or cluttered background',
            'Reusing a photo from a previous year’s lottery entry',
            'Applying beauty filters, skin-smoothing, or digital morphing',
          ],
    },
  ];

  const photoTakingTips = isAr
    ? [
        {
          title: 'مسافة التصوير المثالية',
          desc: 'قف على بعد 1.25 إلى 1.5 متر (4 إلى 5 أقدام) من الكاميرا، وضع الكاميرا على مستوى العينين تماماً.',
        },
        {
          title: 'تجنب ظلال الجدار',
          desc: 'قف على مسافة 0.5 إلى 1 متر أمام الجدار الأبيض لكي تسقط الظلال على الأرضية خلفك وليس على الجدار.',
        },
        {
          title: 'الاستعانة بشخص آخر أو حامل ثلاثي',
          desc: 'تجنب مد يدك لأخذ سيلفي لأن ذلك يسبب تشوهاً في أبعاد الأنف والوجه. اطلب من صديق التقاطها أو استخدم مؤقت الكاميرا.',
        },
        {
          title: 'ضوء النهار الطبيعي الموزع',
          desc: 'قف أمام نافذة يدخل منها ضوء نهار ناعم غير مباشر، أو استخدم مصدرَي إضاءة متساويين يميناً ويساراً.',
        },
      ]
    : [
        {
          title: 'Optimal Shooting Distance',
          desc: 'Position the camera 1.25 to 1.5 meters (4 to 5 feet) away, exactly at your natural eye level.',
        },
        {
          title: 'Prevent Wall Shadows',
          desc: 'Stand 0.5 to 1 meter in front of the white wall so any subtle shadow falls behind and below your head.',
        },
        {
          title: 'Have Someone Else Take It',
          desc: 'Avoid handheld arm selfies which distort face proportions and ear distance. Use a tripod or a friend.',
        },
        {
          title: 'Soft Diffuse Natural Light',
          desc: 'Face a large window with soft indirect daylight or balance two identical lamps on either side.',
        },
      ];

  return (
    <div
      id="photo-requirements-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-requirements-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="photo-requirements-title"
                  className="text-base sm:text-lg font-bold text-white tracking-tight"
                >
                  {isAr
                    ? 'المعايير الرسمية لصورة قرعة الهجرة الأمريكية (DV)'
                    : 'Official U.S. State Dept. DV Photo Requirements'}
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[11px] font-semibold font-mono bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  U.S. DOS Specs
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'تعليمات وزارة الخارجية الأمريكية الرسمية لالتقاط وقبول الصورة الشخصية'
                  : 'Official Department of State technical guidelines for diversity visa entrant photos'}
              </p>
            </div>
          </div>

          <button
            id="close-photo-requirements-top-btn"
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق النافذة' : 'Close requirements modal'}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-slate-800 dark:text-slate-200">
          {/* Top Quick Highlights Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl">
              <span className="block text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                {isAr ? 'الأبعاد القياسية' : 'Dimensions'}
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-blue-900 dark:text-blue-100 mt-0.5 block">
                600 × 600 px
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">1:1 Square</span>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
              <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                {isAr ? 'ارتفاع الرأس' : 'Head Height'}
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-emerald-900 dark:text-emerald-100 mt-0.5 block">
                50% – 69%
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                {isAr ? 'من الذقن للرأس' : 'Chin to hair top'}
              </span>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl">
              <span className="block text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                {isAr ? 'لون الخلفية' : 'Background'}
              </span>
              <span className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-100 mt-0.5 block">
                {isAr ? 'أبيض ناصع' : 'Plain White'}
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400">
                {isAr ? 'خالٍ من الظلال' : 'Zero shadows'}
              </span>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl">
              <span className="block text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                {isAr ? 'النظارات' : 'Eyeglasses'}
              </span>
              <span className="text-sm sm:text-base font-bold text-rose-900 dark:text-rose-100 mt-0.5 block">
                {isAr ? 'ممنوعة تماماً' : 'Strictly Banned'}
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400">
                {isAr ? 'استبعاد فوري' : 'Zero tolerance'}
              </span>
            </div>
          </div>

          {/* Strict Warning Box */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <strong className="font-bold">
                {isAr ? 'تنبيه استبعاد رسمي حاسم: ' : 'Crucial Official Notice: '}
              </strong>
              {isAr
                ? 'تعتبر الصور غير المستوفية للشروط السبب الأول لاستبعاد متقدمي القرعة العشوائية دون إشعار مسبق. تأكد من مطابقة جميع البنود أدناه بدقة قبل رفع صورتك.'
                : 'Non-compliant photographs are the #1 cause of automatic entrant disqualification without prior warning. Verify all requirements below carefully before submitting.'}
            </div>
          </div>

          {/* Detailed Photo Specifications Cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>
                {isAr
                  ? 'بنود المعايير الفنية والتصويرية المفصلة'
                  : 'Detailed Technical & Composition Standards'}
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requirements.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-xs">
                      {req.icon}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {req.title}
                    </h4>
                  </div>

                  <div className="space-y-2 text-xs">
                    {req.rules.map((rule, idx) => (
                      <div key={idx} className="space-y-0.5 leading-relaxed">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          {rule.valid ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                          )}
                          <span>{rule.label}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 ps-5">
                          {rule.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Do's and Don'ts Section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {isAr ? 'المقارنة السريعة: المسموح والممنوع' : 'Quick Comparison: Do’s & Don’ts'}
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dosAndDonts.map((section, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl p-4 border ${
                    section.type === 'do'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm mb-3">
                    {section.type === 'do' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span
                      className={
                        section.type === 'do'
                          ? 'text-emerald-900 dark:text-emerald-200'
                          : 'text-rose-900 dark:text-rose-200'
                      }
                    >
                      {section.title}
                    </span>
                  </div>

                  <ul className="space-y-2 text-xs">
                    {section.items.map((item, itemIdx) => (
                      <li
                        key={itemIdx}
                        className={`flex items-start gap-2 leading-relaxed ${
                          section.type === 'do'
                            ? 'text-emerald-800 dark:text-emerald-300'
                            : 'text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        <span className="font-bold shrink-0 mt-0.5">
                          {section.type === 'do' ? '✓' : '✗'}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Practical DIY Smartphone Shooting Guide */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>
                {isAr
                  ? 'نصائح عملية لالتقاط أفضل صورة شخصية بالهاتف الذكي في المنزل'
                  : 'Practical Tips for Taking High-Quality Photos at Home'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {photoTakingTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-1"
                >
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    {idx + 1}. {tip.title}
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {tip.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Validator Helper Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200">
            <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isAr
                ? 'ملاحظة: يوفر لك هذا البرنامج أدوات فورية لمعايرة الرأس ومستويات العينين رقمياً، بالإضافة إلى زر إزالة وتبييض الخلفية التلقائي، وأداة القص المباشر إلى 600×600 بكسل للتأكد من استيفاء جميع المتطلبات بدقة.'
                : 'Note: This tool provides interactive alignment guides, eye-level lines, an auto white-background generator, and a 600×600 px crop tool to help you calibrate your portrait accurately.'}
            </p>
          </div>
        </div>

        {/* Modal Footer with Close Button */}
        <div className="shrink-0 flex items-center justify-between px-5 sm:px-7 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
            {isAr
              ? 'مصدر اللوائح: مكتب الشؤون القنصلية - وزارة الخارجية الأمريكية'
              : 'Official Source: Bureau of Consular Affairs - U.S. Department of State'}
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="close-photo-requirements-footer-btn"
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Check className="w-4 h-4" />
              <span>
                {isAr
                  ? 'فهمت الشروط - العودة إلى فاحص الصورة'
                  : 'Close & Return to Validator'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
