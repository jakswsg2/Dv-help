import { Applicant, AppStep, Language } from '../types';

export interface ProgressDetail {
  id: string;
  nameEn: string;
  nameAr: string;
  isCompleted: boolean;
  stepKey: AppStep;
  estimatedSeconds: number;
}

export interface StepProgressSummary {
  stepKey: AppStep;
  stepIndex: number;
  stepNumber: number;
  stepNameEn: string;
  stepNameAr: string;
  isCompleted: boolean;
  percentage: number;
  totalFields: number;
  completedFields: number;
  missingFields: number;
  estimatedSecondsRemaining: number;
  formattedTimeRemainingEn: string;
  formattedTimeRemainingAr: string;
}

export interface ApplicantProgress {
  totalFields: number;
  completedFields: number;
  percentage: number;
  statusKey: 'incomplete' | 'progressing' | 'almost' | 'complete';
  details: ProgressDetail[];
  missingCount: number;
  estimatedSecondsRemaining: number;
  estimatedMinutesRemaining: number;
  formattedTimeRemainingEn: string;
  formattedTimeRemainingAr: string;
  stepSummaries: Record<AppStep, StepProgressSummary>;
  stepSummariesList: StepProgressSummary[];
}

export function formatTimeRemaining(seconds: number, language: Language): string {
  if (seconds <= 0) {
    return language === 'ar' ? 'جاهز للإرسال (0 دقيقة)' : 'Ready (0 min)';
  }
  if (seconds < 60) {
    return language === 'ar' ? 'أقل من دقيقة' : '< 1 min left';
  }
  const mins = Math.ceil(seconds / 60);
  if (mins === 1) {
    return language === 'ar' ? 'متبقي ~1 دقيقة' : '~1 min left';
  }
  if (mins === 2) {
    return language === 'ar' ? 'متبقي ~2 دقيقة' : '~2 mins left';
  }
  if (mins >= 3 && mins <= 10) {
    return language === 'ar' ? `متبقي ~${mins} دقائق` : `~${mins} mins left`;
  }
  return language === 'ar' ? `متبقي ~${mins} دقيقة` : `~${mins} mins left`;
}

export function calculateApplicantProgress(applicant: Applicant): ApplicantProgress {
  if (!applicant) {
    const emptyStepSummary = (stepKey: AppStep, idx: number, nameEn: string, nameAr: string): StepProgressSummary => ({
      stepKey,
      stepIndex: idx,
      stepNumber: idx + 1,
      stepNameEn: nameEn,
      stepNameAr: nameAr,
      isCompleted: false,
      percentage: 0,
      totalFields: 3,
      completedFields: 0,
      missingFields: 3,
      estimatedSecondsRemaining: 60,
      formattedTimeRemainingEn: '~1 min left',
      formattedTimeRemainingAr: 'متبقي ~1 دقيقة',
    });

    const stepSummariesList: StepProgressSummary[] = [
      emptyStepSummary('PERSONAL', 0, 'Personal Details', 'البيانات الشخصية'),
      emptyStepSummary('FAMILY', 1, 'Family Members', 'أفراد الأسرة'),
      emptyStepSummary('DOCUMENTS', 2, 'Passport MRZ Reader', 'قراءة الجواز (MRZ)'),
      emptyStepSummary('PHOTO', 3, 'DV Photo Validator', 'فحص صورة اللوتري'),
      emptyStepSummary('ELIGIBILITY', 4, 'Eligibility Criteria', 'شروط الأهلية'),
      emptyStepSummary('CONSISTENCY', 5, 'Consistency Engine', 'فحص التناقضات'),
      emptyStepSummary('OFFICIAL_PREP', 6, 'Official Submission Prep & Vault', 'وضع الإدخال الرسمي والخزنة'),
    ];

    const stepSummaries = stepSummariesList.reduce((acc, curr) => {
      acc[curr.stepKey] = curr;
      return acc;
    }, {} as Record<AppStep, StepProgressSummary>);

    return {
      totalFields: 20,
      completedFields: 0,
      percentage: 0,
      statusKey: 'incomplete',
      details: [],
      missingCount: 20,
      estimatedSecondsRemaining: 360,
      estimatedMinutesRemaining: 6,
      formattedTimeRemainingEn: '~6 mins left',
      formattedTimeRemainingAr: 'متبقي ~6 دقائق',
      stepSummaries,
      stepSummariesList,
    };
  }

  // 1. Personal Details (16 core required items, 15s each)
  const personalDetails: ProgressDetail[] = [
    {
      id: 'lastName',
      nameEn: 'Last / Family Name',
      nameAr: 'اسم العائلة / اللقب',
      isCompleted: Boolean(applicant.lastName && applicant.lastName.trim().length > 0),
      stepKey: 'PERSONAL',
      estimatedSeconds: 15,
    },
    {
      id: 'firstName',
      nameEn: 'First Name',
      nameAr: 'الاسم الأول',
      isCompleted: Boolean(applicant.firstName && applicant.firstName.trim().length > 0),
      stepKey: 'PERSONAL',
      estimatedSeconds: 15,
    },
    {
      id: 'middleName',
      nameEn: 'Middle Name (or explicitly None)',
      nameAr: 'الاسم الأوسط (أو تأكيد عدم وجوده)',
      isCompleted: Boolean(
        applicant.hasNoMiddleName || (applicant.middleName && applicant.middleName.trim().length > 0)
      ),
      stepKey: 'PERSONAL',
      estimatedSeconds: 10,
    },
    {
      id: 'gender',
      nameEn: 'Gender Selection',
      nameAr: 'الجنس (ذكر / أنثى)',
      isCompleted: Boolean(applicant.gender === 'MALE' || applicant.gender === 'FEMALE'),
      stepKey: 'PERSONAL',
      estimatedSeconds: 10,
    },
    {
      id: 'birthDate',
      nameEn: 'Birth Date (Day, Month, Year)',
      nameAr: 'تاريخ الميلاد كاملاً',
      isCompleted: Boolean(applicant.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(applicant.birthDate)),
      stepKey: 'PERSONAL',
      estimatedSeconds: 15,
    },
    {
      id: 'birthCity',
      nameEn: 'City of Birth (or Unknown)',
      nameAr: 'مدينة الولادة (أو غير معروفة)',
      isCompleted: Boolean(
        applicant.birthCityUnknown || (applicant.birthCity && applicant.birthCity.trim().length > 0)
      ),
      stepKey: 'PERSONAL',
      estimatedSeconds: 15,
    },
    {
      id: 'birthCountry',
      nameEn: 'Country of Birth',
      nameAr: 'دولة الولادة',
      isCompleted: Boolean(applicant.birthCountry && applicant.birthCountry.trim().length > 0),
      stepKey: 'PERSONAL',
      estimatedSeconds: 15,
    },
    {
      id: 'addressLine1',
      nameEn: 'Mailing Address (Line 1)',
      nameAr: 'عنوان المراسلة (السطر 1)',
      isCompleted: Boolean(applicant.addressLine1 && applicant.addressLine1.trim().length > 0),
      stepKey: 'PERSONAL',
      estimatedSeconds: 20,
    },
    {
      id: 'cityTown',
      nameEn: 'City / Town for Mailing',
      nameAr: 'المدينة / البلدة للعنوان',
      isCompleted: Boolean(applicant.cityTown && applicant.cityTown.trim().length > 0),
      stepKey: 'PERSONAL',
      estimatedSeconds: 15,
    },
    {
      id: 'postalCode',
      nameEn: 'Postal / ZIP Code (or None)',
      nameAr: 'الرمز البريدي (أو لا يوجد)',
      isCompleted: Boolean(
        applicant.noPostalCode || (applicant.postalCode && applicant.postalCode.trim().length > 0)
      ),
      stepKey: 'PERSONAL',
      estimatedSeconds: 10,
    },
    {
      id: 'country',
      nameEn: 'Mailing Address Country',
      nameAr: 'دولة العنوان البريدي',
      isCompleted: Boolean(applicant.country && applicant.country.trim().length > 0),
      stepKey: 'PERSONAL',
      estimatedSeconds: 15,
    },
    {
      id: 'currentCountry',
      nameEn: 'Country Where You Live Today',
      nameAr: 'دولة الإقامة الحالية',
      isCompleted: Boolean(applicant.currentCountry && applicant.currentCountry.trim().length > 0),
      stepKey: 'PERSONAL',
      estimatedSeconds: 15,
    },
    {
      id: 'phoneNumber',
      nameEn: 'Phone Number',
      nameAr: 'رقم الهاتف للتواصل',
      isCompleted: Boolean(applicant.phoneNumber && applicant.phoneNumber.trim().length > 0),
      stepKey: 'PERSONAL',
      estimatedSeconds: 15,
    },
    {
      id: 'email',
      nameEn: 'Primary Email Address',
      nameAr: 'البريد الإلكتروني الأساسي',
      isCompleted: Boolean(applicant.email && applicant.email.includes('@') && applicant.email.includes('.')),
      stepKey: 'PERSONAL',
      estimatedSeconds: 20,
    },
    {
      id: 'emailConfirmation',
      nameEn: 'Email Confirmation',
      nameAr: 'تأكيد البريد الإلكتروني',
      isCompleted: Boolean(
        applicant.emailConfirmation &&
          applicant.email &&
          applicant.email.toLowerCase() === applicant.emailConfirmation.toLowerCase()
      ),
      stepKey: 'PERSONAL',
      estimatedSeconds: 15,
    },
    {
      id: 'highestEducation',
      nameEn: 'Highest Level of Education',
      nameAr: 'أعلى مستوى تعليمي محقق',
      isCompleted: Boolean(applicant.highestEducation && applicant.highestEducation.length > 0),
      stepKey: 'PERSONAL',
      estimatedSeconds: 15,
    },
    {
      id: 'maritalStatus',
      nameEn: 'Current Marital Status',
      nameAr: 'الحالة الاجتماعية',
      isCompleted: Boolean(applicant.maritalStatus && applicant.maritalStatus.length > 0),
      stepKey: 'PERSONAL',
      estimatedSeconds: 10,
    },
    {
      id: 'numberOfChildren',
      nameEn: 'Number of Children',
      nameAr: 'عدد الأطفال',
      isCompleted: typeof applicant.numberOfChildren === 'number' && applicant.numberOfChildren >= 0,
      stepKey: 'PERSONAL',
      estimatedSeconds: 10,
    },
  ];

  // 2. Family Members Verification
  const isMarried = applicant.maritalStatus === 'MARRIED_NON_US' || applicant.maritalStatus === 'MARRIED_US';
  const childrenExpected = applicant.numberOfChildren || 0;
  const spouseRecorded = applicant.familyMembers?.find((m) => m.relationship === 'SPOUSE');
  const childrenRecorded = applicant.familyMembers?.filter((m) => m.relationship === 'CHILD') || [];

  const familyDetails: ProgressDetail[] = [];
  if (isMarried) {
    const isSpouseComplete = Boolean(
      spouseRecorded &&
        spouseRecorded.firstName &&
        spouseRecorded.lastName &&
        spouseRecorded.birthDate &&
        spouseRecorded.birthCountry &&
        spouseRecorded.photo?.dataUrl
    );
    familyDetails.push({
      id: 'spouseVerification',
      nameEn: 'Spouse Full Information & Photo',
      nameAr: 'بيانات وصورة الزوج / الزوجة',
      isCompleted: isSpouseComplete,
      stepKey: 'FAMILY',
      estimatedSeconds: 45,
    });
  }

  if (childrenExpected > 0) {
    const areChildrenComplete =
      childrenRecorded.length >= childrenExpected &&
      childrenRecorded.every(
        (c) => c.firstName && c.lastName && c.birthDate && c.birthCountry && c.photo?.dataUrl
      );
    familyDetails.push({
      id: 'childrenVerification',
      nameEn: `All (${childrenExpected}) Children Details & Photos`,
      nameAr: `بيانات وصور الأبناء بالكامل (${childrenExpected})`,
      isCompleted: areChildrenComplete,
      stepKey: 'FAMILY',
      estimatedSeconds: 30 * childrenExpected,
    });
  }

  // If unmarried and no children, automatically provide a clean completed entry
  if (!isMarried && childrenExpected === 0) {
    familyDetails.push({
      id: 'familyNotApplicable',
      nameEn: 'Family Derivatives Confirmed (Single / No Children)',
      nameAr: 'تأكيد عدم وجود مرافقين (أعزب / بدون أطفال)',
      isCompleted: true,
      stepKey: 'FAMILY',
      estimatedSeconds: 0,
    });
  }

  // 3. Document OCR / Passport Verification
  const hasPassportOrMrz = Boolean(
    (applicant.mrzData && applicant.mrzData.documentNumber) ||
      (applicant.passportNumber && applicant.passportNumber.trim().length >= 6)
  );
  const documentDetails: ProgressDetail[] = [
    {
      id: 'passportVerification',
      nameEn: 'Passport OCR / Travel Document Scan',
      nameAr: 'قراءة وثيقة السفر / جواز السفر (MRZ)',
      isCompleted: hasPassportOrMrz,
      stepKey: 'DOCUMENTS',
      estimatedSeconds: 30,
    },
  ];

  // 4. DV Photo Validator
  const hasValidPhoto = Boolean(
    applicant.photo &&
      applicant.photo.dataUrl &&
      applicant.photo.dataUrl.length > 50 &&
      applicant.photo.isSquare &&
      applicant.photo.isSizeOk
  );
  const photoDetails: ProgressDetail[] = [
    {
      id: 'entrantPhoto',
      nameEn: 'Entrant Biometric 600x600 Photo',
      nameAr: 'صورة المتقدم البيومترية 600×600',
      isCompleted: hasValidPhoto,
      stepKey: 'PHOTO',
      estimatedSeconds: 45,
    },
  ];

  // 5. Eligibility Criteria
  const hasEligibility = Boolean(
    (applicant.isEligibleBasedOnBirthCountry ||
      (applicant.alternateCountryOfEligibility && applicant.alternateCountryOfEligibility.trim().length > 0)) &&
      (applicant.highestEducation || (applicant.qualifyingWorkExperience && applicant.occupationTitle))
  );
  const eligibilityDetails: ProgressDetail[] = [
    {
      id: 'eligibilityClaim',
      nameEn: 'Chargeability Country & Education / Work Criteria',
      nameAr: 'استيفاء شروط دولة الأهلية والتعليم/المهنة',
      isCompleted: hasEligibility,
      stepKey: 'ELIGIBILITY',
      estimatedSeconds: 20,
    },
  ];

  // 6. Consistency Engine (Evaluates data sanity)
  const isPersonalBasicsDone = Boolean(
    applicant.lastName && applicant.firstName && applicant.birthDate && applicant.birthCountry
  );
  const consistencyDetails: ProgressDetail[] = [
    {
      id: 'dataConsistency',
      nameEn: 'Cross-Field Integrity & Logic Verification',
      nameAr: 'التدقيق الشامل لتوافق البيانات والتواريخ',
      isCompleted: isPersonalBasicsDone && hasValidPhoto,
      stepKey: 'CONSISTENCY',
      estimatedSeconds: 15,
    },
  ];

  // 7. Official Submission Prep & Vault
  const officialDetails: ProgressDetail[] = [
    {
      id: 'legalAcknowledgement',
      nameEn: 'Legal & Ethics Compliance Acknowledgement',
      nameAr: 'إقرار الالتزام القانوني والأخلاقي',
      isCompleted: Boolean(applicant.legalAcknowledged && applicant.ethicsAcknowledged),
      stepKey: 'OFFICIAL_PREP',
      estimatedSeconds: 20,
    },
  ];

  // Combine all items
  const details: ProgressDetail[] = [
    ...personalDetails,
    ...familyDetails,
    ...documentDetails,
    ...photoDetails,
    ...eligibilityDetails,
    ...consistencyDetails,
    ...officialDetails,
  ];

  const totalFields = details.length;
  const completedFields = details.filter((d) => d.isCompleted).length;
  const percentage = Math.round((completedFields / totalFields) * 100);

  // Time remaining calculation (sum of estimated seconds for incomplete items)
  const estimatedSecondsRemaining = details
    .filter((d) => !d.isCompleted)
    .reduce((acc, curr) => acc + curr.estimatedSeconds, 0);

  const estimatedMinutesRemaining = Math.ceil(estimatedSecondsRemaining / 60);
  const formattedTimeRemainingEn = formatTimeRemaining(estimatedSecondsRemaining, 'en');
  const formattedTimeRemainingAr = formatTimeRemaining(estimatedSecondsRemaining, 'ar');

  let statusKey: 'incomplete' | 'progressing' | 'almost' | 'complete' = 'incomplete';
  if (percentage === 100) {
    statusKey = 'complete';
  } else if (percentage >= 75) {
    statusKey = 'almost';
  } else if (percentage >= 35) {
    statusKey = 'progressing';
  } else {
    statusKey = 'incomplete';
  }

  // Build step-by-step summary
  const stepConfigs: { key: AppStep; nameEn: string; nameAr: string; items: ProgressDetail[] }[] = [
    { key: 'PERSONAL', nameEn: 'Personal Details', nameAr: 'البيانات الشخصية', items: personalDetails },
    { key: 'FAMILY', nameEn: 'Family Members', nameAr: 'أفراد الأسرة', items: familyDetails },
    { key: 'DOCUMENTS', nameEn: 'Passport MRZ Reader', nameAr: 'قراءة الجواز (MRZ)', items: documentDetails },
    { key: 'PHOTO', nameEn: 'DV Photo Validator', nameAr: 'فحص صورة اللوتري', items: photoDetails },
    { key: 'ELIGIBILITY', nameEn: 'Eligibility Criteria', nameAr: 'شروط الأهلية', items: eligibilityDetails },
    { key: 'CONSISTENCY', nameEn: 'Consistency Engine', nameAr: 'فحص التناقضات', items: consistencyDetails },
    { key: 'OFFICIAL_PREP', nameEn: 'Official Submission Prep & Vault', nameAr: 'وضع الإدخال الرسمي والخزنة', items: officialDetails },
  ];

  const stepSummariesList: StepProgressSummary[] = stepConfigs.map((cfg, idx) => {
    const sTotal = cfg.items.length;
    const sCompleted = cfg.items.filter((i) => i.isCompleted).length;
    const sMissing = sTotal - sCompleted;
    const sPct = sTotal > 0 ? Math.round((sCompleted / sTotal) * 100) : 100;
    const sSeconds = cfg.items.filter((i) => !i.isCompleted).reduce((acc, curr) => acc + curr.estimatedSeconds, 0);

    return {
      stepKey: cfg.key,
      stepIndex: idx,
      stepNumber: idx + 1,
      stepNameEn: cfg.nameEn,
      stepNameAr: cfg.nameAr,
      isCompleted: sMissing === 0,
      percentage: sPct,
      totalFields: sTotal,
      completedFields: sCompleted,
      missingFields: sMissing,
      estimatedSecondsRemaining: sSeconds,
      formattedTimeRemainingEn: formatTimeRemaining(sSeconds, 'en'),
      formattedTimeRemainingAr: formatTimeRemaining(sSeconds, 'ar'),
    };
  });

  const stepSummaries = stepSummariesList.reduce((acc, curr) => {
    acc[curr.stepKey] = curr;
    return acc;
  }, {} as Record<AppStep, StepProgressSummary>);

  return {
    totalFields,
    completedFields,
    percentage,
    statusKey,
    details,
    missingCount: totalFields - completedFields,
    estimatedSecondsRemaining,
    estimatedMinutesRemaining,
    formattedTimeRemainingEn,
    formattedTimeRemainingAr,
    stepSummaries,
    stepSummariesList,
  };
}

