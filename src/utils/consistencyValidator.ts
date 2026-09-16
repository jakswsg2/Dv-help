import { Applicant, ConsistencyIssue } from '../types';
import { validatePassportNumber } from './inputMasks';

const LATIN_NAME_REGEX = /^[A-Za-z\s\-'.]+$/;

export function validateApplicantConsistency(applicant: Applicant): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  // 1. Name Checks
  if (!applicant.lastName || applicant.lastName.trim().length === 0) {
    issues.push({
      id: 'missing-lastname',
      field: 'lastName',
      severity: 'CRITICAL',
      title: 'اسم العائلة مفقود / Last Name Missing',
      description: 'حقل اسم العائلة / اللقب إلزامي وفقاً لشروط وزارة الخارجية الأمريكية.',
      suggestion: 'قم بإدخال اسم العائلة بالأحرف الإنجليزية تماماً كما في جواز السفر.',
    });
  } else if (!LATIN_NAME_REGEX.test(applicant.lastName.trim())) {
    issues.push({
      id: 'invalid-chars-lastname',
      field: 'lastName',
      severity: 'CRITICAL',
      title: 'أحرف غير لاتينية في اسم العائلة',
      description: 'يقبل نظام التسجيل الرسمي في وزارة الخارجية الأمريكية فقط الأحرف اللاتينية الإنجليزية (A-Z).',
      suggestion: 'استبدل أي حروف عربية أو رموز خاصة بالحروف الإنجليزية المطابقة لجواز السفر.',
    });
  }

  if (!applicant.firstName || applicant.firstName.trim().length === 0) {
    issues.push({
      id: 'missing-firstname',
      field: 'firstName',
      severity: 'CRITICAL',
      title: 'الاسم الأول مفقود / First Name Missing',
      description: 'حقل الاسم الأول إلزامي.',
      suggestion: 'أدخل الاسم الأول بالأحرف اللاتينية.',
    });
  } else if (!LATIN_NAME_REGEX.test(applicant.firstName.trim())) {
    issues.push({
      id: 'invalid-chars-firstname',
      field: 'firstName',
      severity: 'CRITICAL',
      title: 'أحرف غير لاتينية في الاسم الأول',
      description: 'يجب أن يكون الاسم الأول مكتوباً بحروف إنجليزية فقط.',
      suggestion: 'استخدم الحروف اللاتينية الإنجليزية فقط.',
    });
  }

  // 2. Date of Birth & Age Check
  if (!applicant.birthDate) {
    issues.push({
      id: 'missing-dob',
      field: 'birthDate',
      severity: 'CRITICAL',
      title: 'تاريخ الميلاد مفقود / Birth Date Missing',
      description: 'تاريخ الميلاد إلزامي لحساب الأهلية وتحديد الهوية.',
      suggestion: 'حدد اليوم والشهر وسنة الميلاد.',
    });
  } else {
    const dob = new Date(applicant.birthDate);
    const today = new Date();
    const ageDiffMs = today.getTime() - dob.getTime();
    const ageYears = ageDiffMs / (1000 * 60 * 60 * 24 * 365.25);

    if (ageYears < 18) {
      issues.push({
        id: 'age-under-18',
        field: 'birthDate',
        severity: 'WARNING',
        title: 'عمر المتقدم أقل من 18 عاماً',
        description: 'رغم عدم وجود حد أدنى صريح للعمر في لوائح DV، إلا أن شرط إتمام الثانوية العامة يجعل المتقدمين دون سن 18 عاماً غير مؤهلين عادة بمفردهم.',
        suggestion: 'تأكد من استيفاء شرط شهادة الثانوية العامة أو إدراج المتقدم كتابع مع والديه.',
      });
    }
  }

  // 3. Marital Status & Spouse Consistency
  const isMarried =
    applicant.maritalStatus === 'MARRIED_NON_US' ||
    applicant.maritalStatus === 'MARRIED_US';

  const spouse = applicant.familyMembers.find((m) => m.relationship === 'SPOUSE');

  if (isMarried && !spouse) {
    issues.push({
      id: 'missing-spouse-record',
      field: 'maritalStatus',
      severity: 'CRITICAL',
      title: 'عدم إدراج بيانات الزوج / الزوجة',
      description: 'لقد حددت الحالة الاجتماعية كـ "متزوج"، لكن لم يتم إدخال بيانات الزوج/الزوجة في قسم أفراد الأسرة.',
      suggestion: 'أضف بيانات وصورة الزوج/الزوجة في خطوة أفراد الأسرة لتجنب الاستبعاد الفوري للطلب.',
    });
  } else if (!isMarried && spouse) {
    issues.push({
      id: 'unexpected-spouse-record',
      field: 'maritalStatus',
      severity: 'WARNING',
      title: 'وجود سجل زوج/زوجة مع حالة اجتماعية غير متزوج',
      description: 'الحالة الاجتماعية المسجلة هي أعزب/مطلق/أرمل بينما يوجد مرافق مسجل كزوج.',
      suggestion: 'قم بحذف سجل الزوج أو تعديل الحالة الاجتماعية لتكون متزوجاً.',
    });
  }

  // 4. Children Count Consistency
  const children = applicant.familyMembers.filter((m) => m.relationship === 'CHILD');
  if (applicant.numberOfChildren !== children.length) {
    issues.push({
      id: 'children-count-mismatch',
      field: 'numberOfChildren',
      severity: 'CRITICAL',
      title: 'عدم تطابق عدد الأبناء المسجل مع التفاصيل',
      description: `تم تحديد عدد الأبناء في الخطوة الأولى بـ (${applicant.numberOfChildren})، بينما يحتوي جدول أفراد الأسرة على (${children.length}) من الأبناء.`,
      suggestion: 'قم بمطابقة عدد الأبناء المدخل في الاستمارة مع السجلات المرفقة في قائمة الأسرة.',
    });
  }

  // Check children ages (must be < 21)
  children.forEach((child, index) => {
    if (child.birthDate) {
      const childDob = new Date(child.birthDate);
      const today = new Date();
      const childAge = (today.getTime() - childDob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (childAge >= 21) {
        issues.push({
          id: `child-over-21-${child.id || index}`,
          field: 'familyMembers',
          severity: 'CRITICAL',
          title: `الابن/الابنة (${child.firstName || '#' + (index + 1)}) تجاوز 21 عاماً`,
          description: 'يشترط برنامج DV إدراج الأبناء غير المتزوجين دون سن 21 عاماً فقط. الأبناء فوق 21 سنة يجب أن يقدموا بطلب منفصل خاص بهم.',
          suggestion: 'احذف الابن من قائمة التابعين ووجهه لتقديم طلب مستقل.',
        });
      }
    }
  });

  // 5. Entrant Photo Checks
  if (!applicant.photo) {
    issues.push({
      id: 'missing-photo',
      field: 'photo',
      severity: 'CRITICAL',
      title: 'صورة المتقدم الشخصية غير مدرجة',
      description: 'الصورة الرقمية بالمواصفات الفنية (600×600 بكسل) إلزامية تماماً لإتمام التسجيل الرسمي.',
      suggestion: 'انتقل لخطوة فاحص الصور وارفع صورة مستوفية للشروط.',
    });
  } else {
    if (!applicant.photo.isSquare || applicant.photo.width < 600) {
      issues.push({
        id: 'photo-not-square',
        field: 'photo',
        severity: 'CRITICAL',
        title: 'أبعاد الصورة غير مطابقة للمواصفات',
        description: 'يشترط موقع الهجرة الأمريكي أبعاداً مربعة 600×600 بكسل على الأقل.',
        suggestion: 'استخدم أداة القص والتحجيم التفاعلية لضبط الأبعاد بدقة.',
      });
    }
    if (!applicant.photo.isSizeOk) {
      issues.push({
        id: 'photo-size-large',
        field: 'photo',
        severity: 'CRITICAL',
        title: 'حجم ملف الصورة يتجاوز 240KB',
        description: 'النظام الحكومي سيرفض رفع أي صورة يتجاوز حجمها 240 كيلوبايت.',
        suggestion: 'استخدم أداة الحفظ التلقائي في المنصة لضغط وتصدير الصورة.',
      });
    }
    if (applicant.photo.brightnessStatus === 'TOO_DARK' || (applicant.photo.brightnessAvg && applicant.photo.brightnessAvg < 85)) {
      issues.push({
        id: 'photo-brightness-dark',
        field: 'photo',
        severity: 'WARNING',
        title: 'إضاءة الصورة معتمة نسبياً (Underexposed)',
        description: `مستوى الإضاءة المحسوب (${applicant.photo.brightnessAvg || 'منخفض'}/255) قد يتسبب في ظهور ظلال داكنة على ملامح الوجه. تشترط الخارجية الأمريكية إضاءة متوازنة وواضحة.`,
        suggestion: 'التقط صورة جديدة في إضاءة نهارية طبيعية أو أمام مصدر إضاءة ناعم دون ظلال.',
      });
    } else if (applicant.photo.brightnessStatus === 'WASHED_OUT' || (applicant.photo.brightnessAvg && applicant.photo.brightnessAvg > 215)) {
      issues.push({
        id: 'photo-brightness-washed',
        field: 'photo',
        severity: 'WARNING',
        title: 'إضاءة الصورة باهتة / ساطعة جداً (Washed Out)',
        description: `مستوى الإضاءة المحسوب (${applicant.photo.brightnessAvg || 'مرتفع'}/255) ساطع للغاية وقد يطمس معالم الوجه الطبيعية ولون البشرة.`,
        suggestion: 'تجنب الفلاش القريب أو الشمس المباشرة الساطعة لتجنب بهتان وتلاشي ملامح الوجه.',
      });
    }
  }

  // 6. Passport Checks (if MRZ exists)
  if (applicant.mrzData) {
    if (applicant.mrzData.documentNumber) {
      const docValidation = validatePassportNumber(applicant.mrzData.documentNumber);
      if (!docValidation.isValid) {
        issues.push({
          id: 'passport-number-invalid',
          field: 'mrzData',
          severity: 'WARNING',
          title: 'رقم جواز السفر غير متوافق مع معايير ICAO',
          description: `رقم الجواز المدخل (${applicant.mrzData.documentNumber}) يجب أن يتكون من 6 إلى 9 خانات أبجدية رقمية بدون مسافات.`,
          suggestion: 'تأكد من إدخال رقم جواز السفر بدقة وفق معايير وثائق السفر الدولية.',
        });
      }
    }

    if (applicant.mrzData.expiryDate) {
      const exp = new Date(applicant.mrzData.expiryDate);
      const today = new Date();
      if (exp < today) {
        issues.push({
          id: 'passport-expired',
          field: 'mrzData',
          severity: 'WARNING',
          title: 'جواز السفر منتهي الصلاحية',
          description: `تاريخ انتهاء الجواز المدخل هو (${applicant.mrzData.expiryDate})، وهو سابق لتاريخ اليوم.`,
          suggestion: 'يُفضل تجديد جواز السفر لضمان تطابق البيانات عند الفوز واستخراج التأشيرة.',
        });
      }
    }
  }

  // 7. Alternate Eligibility
  if (!applicant.isEligibleBasedOnBirthCountry && !applicant.alternateCountryOfEligibility) {
    issues.push({
      id: 'missing-alternate-country',
      field: 'alternateCountryOfEligibility',
      severity: 'CRITICAL',
      title: 'لم يتم تحديد الدولة البديلة للأهلية',
      description: 'لقد اخترت عدم الاستناد إلى بلد الميلاد، ولم تحدد دولة الزوج/الوالدين المؤهلة.',
      suggestion: 'حدد الدولة المؤهلة أو أعد تفعيل الأهلية بالاستناد لبلد الميلاد.',
    });
  }

  return issues;
}
