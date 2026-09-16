/**
 * Comprehensive dataset for Yemen's Governorates (المحافظات), major directorates/districts (المديريات),
 * postal codes, and DV official form transliterations according to official Yemeni passports and US consular standards.
 */

export interface YemenDistrict {
  nameAr: string;
  nameEn: string;
  postalCode?: string;
}

export interface YemenGovernorate {
  id: string;
  nameAr: string;
  nameEn: string;
  capitalAr: string;
  capitalEn: string;
  defaultPostalCode: string;
  districts: YemenDistrict[];
  commonCities: string[]; // Cities recognized on official documents / birth certificates
}

export const YEMEN_GOVERNORATES: YemenGovernorate[] = [
  {
    id: 'sanaa_capital',
    nameAr: 'أمانة العاصمة (صنعاء)',
    nameEn: 'Amanat Al Asimah (Sanaa)',
    capitalAr: 'صنعاء',
    capitalEn: 'Sanaa',
    defaultPostalCode: '11000',
    commonCities: ['Sanaa', 'Old City of Sanaa', 'Shu\'ub', 'Al Wahdah', 'As Sabin', 'At Tahrir', 'Ma\'in', 'Ath\'thaorah', 'Bani Al Harith', 'Az Zal', 'Sanhan'],
    districts: [
      { nameAr: 'التحرير', nameEn: 'At Tahrir', postalCode: '11001' },
      { nameAr: 'السبعين', nameEn: 'As Sabin', postalCode: '11002' },
      { nameAr: 'الوحدة', nameEn: 'Al Wahdah', postalCode: '11003' },
      { nameAr: 'معين', nameEn: 'Ma\'in', postalCode: '11004' },
      { nameAr: 'شعوب', nameEn: 'Shu\'ub', postalCode: '11005' },
      { nameAr: 'الثورة', nameEn: 'Ath\'thaorah', postalCode: '11006' },
      { nameAr: 'صنعاء القديمة', nameEn: 'Old City', postalCode: '11007' },
      { nameAr: 'بني الحارث', nameEn: 'Bani Al Harith', postalCode: '11008' },
      { nameAr: 'الصَّافية', nameEn: 'As Safiyah', postalCode: '11009' },
      { nameAr: 'آزال', nameEn: 'Az Zal', postalCode: '11010' },
    ],
  },
  {
    id: 'aden',
    nameAr: 'عدن',
    nameEn: 'Aden',
    capitalAr: 'عدن',
    capitalEn: 'Aden',
    defaultPostalCode: '12000',
    commonCities: ['Aden', 'Crater', 'Al Mualla', 'Tawahi', 'Khormaksar', 'Sheikh Othman', 'Al Mansoora', 'Dar Sad', 'Al Buraiqeh'],
    districts: [
      { nameAr: 'صيرة (كريتر)', nameEn: 'Crater (Seera)', postalCode: '12001' },
      { nameAr: 'المعلا', nameEn: 'Al Mualla', postalCode: '12002' },
      { nameAr: 'التواهي', nameEn: 'At Tawahi', postalCode: '12003' },
      { nameAr: 'خور مكسر', nameEn: 'Khormaksar', postalCode: '12004' },
      { nameAr: 'الشيخ عثمان', nameEn: 'Sheikh Othman', postalCode: '12005' },
      { nameAr: 'المنصورة', nameEn: 'Al Mansoora', postalCode: '12006' },
      { nameAr: 'دار سعد', nameEn: 'Dar Sad', postalCode: '12007' },
      { nameAr: 'البريقة', nameEn: 'Al Buraiqeh', postalCode: '12008' },
    ],
  },
  {
    id: 'taiz',
    nameAr: 'تعز',
    nameEn: 'Taiz',
    capitalAr: 'تعز',
    capitalEn: 'Taiz',
    defaultPostalCode: '13000',
    commonCities: ['Taiz', 'Al Qahirah', 'Al Mudhaffar', 'Salh', 'Al Turbah', 'At Ta\'iziyah', 'Dimnat Khadir', 'Al Mukha', 'Mawza', 'Shar\'ab Ar Rawnah', 'Jabal Habashy', 'Sabir Al Mawadim', 'Hujariyah'],
    districts: [
      { nameAr: 'القاهرة', nameEn: 'Al Qahirah', postalCode: '13001' },
      { nameAr: 'المظفر', nameEn: 'Al Mudhaffar', postalCode: '13002' },
      { nameAr: 'صالة', nameEn: 'Salh', postalCode: '13003' },
      { nameAr: 'التعزية', nameEn: 'At Ta\'iziyah', postalCode: '13004' },
      { nameAr: 'الشمايتين (التربة)', nameEn: 'Ash Shamayatayn (Al Turbah)', postalCode: '13005' },
      { nameAr: 'المخاء', nameEn: 'Al Mukha', postalCode: '13006' },
      { nameAr: 'موزع', nameEn: 'Mawza', postalCode: '13007' },
      { nameAr: 'صبر الموادم', nameEn: 'Sabir Al Mawadim', postalCode: '13008' },
      { nameAr: 'مشرعة وحدنان', nameEn: 'Mashra\'ah Wa Hadnan', postalCode: '13009' },
      { nameAr: 'جبل حبشي', nameEn: 'Jabal Habashy', postalCode: '13010' },
      { nameAr: 'دمنة خدير', nameEn: 'Dimnat Khadir', postalCode: '13011' },
      { nameAr: 'شرعب الرونة', nameEn: 'Shar\'ab Ar Rawnah', postalCode: '13012' },
      { nameAr: 'شرعب السلام', nameEn: 'Shar\'ab As Salam', postalCode: '13013' },
    ],
  },
  {
    id: 'ibb',
    nameAr: 'إب',
    nameEn: 'Ibb',
    capitalAr: 'إب',
    capitalEn: 'Ibb',
    defaultPostalCode: '14000',
    commonCities: ['Ibb', 'Jiblah', 'Yarim', 'Al Makhadir', 'Hubaysh', 'Ba\'dan', 'As Sabrah', 'As Sayyani', 'Dhi As Sufal', 'Al Qafr', 'Al Udayn', 'Far Al Udayn', 'Hazm Al Udayn'],
    districts: [
      { nameAr: 'الظهار', nameEn: 'Adh Dhihar', postalCode: '14001' },
      { nameAr: 'المشنة', nameEn: 'Al Mashannah', postalCode: '14002' },
      { nameAr: 'جبلة', nameEn: 'Jiblah', postalCode: '14003' },
      { nameAr: 'يريم', nameEn: 'Yarim', postalCode: '14004' },
      { nameAr: 'المخادر', nameEn: 'Al Makhadir', postalCode: '14005' },
      { nameAr: 'حبيش', nameEn: 'Hubaysh', postalCode: '14006' },
      { nameAr: 'بعدان', nameEn: 'Ba\'dan', postalCode: '14007' },
      { nameAr: 'السياني', nameEn: 'As Sayyani', postalCode: '14008' },
      { nameAr: 'ذي السفال', nameEn: 'Dhi As Sufal', postalCode: '14009' },
      { nameAr: 'العدين', nameEn: 'Al Udayn', postalCode: '14010' },
    ],
  },
  {
    id: 'hudaydah',
    nameAr: 'الحديدة',
    nameEn: 'Al Hudaydah',
    capitalAr: 'الحديدة',
    capitalEn: 'Al Hudaydah',
    defaultPostalCode: '15000',
    commonCities: ['Al Hudaydah', 'Zabid', 'Bayt Al Faqih', 'Bajil', 'Al Marawi\'ah', 'Al Mansuriyah', 'Hays', 'Al Khawkhah', 'Al Luhayyah', 'Kamaran Island'],
    districts: [
      { nameAr: 'الحوك', nameEn: 'Al Hawak', postalCode: '15001' },
      { nameAr: 'الميناء', nameEn: 'Al Mina', postalCode: '15002' },
      { nameAr: 'الحالي', nameEn: 'Al Hali', postalCode: '15003' },
      { nameAr: 'زبيد', nameEn: 'Zabid', postalCode: '15004' },
      { nameAr: 'بيت الفقيه', nameEn: 'Bayt Al Faqih', postalCode: '15005' },
      { nameAr: 'باجل', nameEn: 'Bajil', postalCode: '15006' },
      { nameAr: 'المراوعة', nameEn: 'Al Marawi\'ah', postalCode: '15007' },
      { nameAr: 'حيس', nameEn: 'Hays', postalCode: '15008' },
      { nameAr: 'الخوخة', nameEn: 'Al Khawkhah', postalCode: '15009' },
    ],
  },
  {
    id: 'hadhramaut',
    nameAr: 'حضرموت',
    nameEn: 'Hadhramaut',
    capitalAr: 'المكلا',
    capitalEn: 'Al Mukalla',
    defaultPostalCode: '16000',
    commonCities: ['Al Mukalla', 'Sayun', 'Tarim', 'Ash Shihr', 'Shibam', 'Al Qatn', 'Daw\'an', 'Ghayl Ba Wazir', 'Ar Rayyan', 'Huraidha'],
    districts: [
      { nameAr: 'المكلا', nameEn: 'Al Mukalla', postalCode: '16001' },
      { nameAr: 'سيئون', nameEn: 'Sayun', postalCode: '16002' },
      { nameAr: 'تريم', nameEn: 'Tarim', postalCode: '16003' },
      { nameAr: 'الشحر', nameEn: 'Ash Shihr', postalCode: '16004' },
      { nameAr: 'شبام', nameEn: 'Shibam', postalCode: '16005' },
      { nameAr: 'القطن', nameEn: 'Al Qatn', postalCode: '16006' },
      { nameAr: 'دوعن', nameEn: 'Daw\'an', postalCode: '16007' },
      { nameAr: 'غيل باوزير', nameEn: 'Ghayl Ba Wazir', postalCode: '16008' },
    ],
  },
  {
    id: 'dhamar',
    nameAr: 'ذمار',
    nameEn: 'Dhamar',
    capitalAr: 'ذمار',
    capitalEn: 'Dhamar',
    defaultPostalCode: '17000',
    commonCities: ['Dhamar', 'Ma\'bar', 'Jahran', 'Dawran Anis', 'Wusab Al Ali', 'Wusab As Safil', 'Utmah', 'Mayfa\'at Anis', 'Al Manar'],
    districts: [
      { nameAr: 'مدينة ذمار', nameEn: 'Dhamar City', postalCode: '17001' },
      { nameAr: 'جهران (معبر)', nameEn: 'Jahran (Ma\'bar)', postalCode: '17002' },
      { nameAr: 'عنس', nameEn: 'Anis', postalCode: '17003' },
      { nameAr: 'وصاب العالي', nameEn: 'Wusab Al Ali', postalCode: '17004' },
      { nameAr: 'وصاب السافل', nameEn: 'Wusab As Safil', postalCode: '17005' },
      { nameAr: 'عتمة', nameEn: 'Utmah', postalCode: '17006' },
    ],
  },
  {
    id: 'sanaa_prov',
    nameAr: 'محافظة صنعاء (الريف)',
    nameEn: 'Sanaa Governorate',
    capitalAr: 'صنعاء',
    capitalEn: 'Sanaa',
    defaultPostalCode: '11500',
    commonCities: ['Sanhan', 'Bani Bahlul', 'Bani Matar', 'Hamdan', 'Bani Hushaysh', 'Arhab', 'Khawlan', 'Manakhah', 'Al Haymah Ad Dakhiliyah', 'Al Haymah Al Kharijiyah', 'Sa\'fan', 'Al Husn'],
    districts: [
      { nameAr: 'سنحان وبني بهلول', nameEn: 'Sanhan & Bani Bahlul', postalCode: '11501' },
      { nameAr: 'بني مطر', nameEn: 'Bani Matar', postalCode: '11502' },
      { nameAr: 'همدان', nameEn: 'Hamdan', postalCode: '11503' },
      { nameAr: 'بني حشيش', nameEn: 'Bani Hushaysh', postalCode: '11504' },
      { nameAr: 'أرحب', nameEn: 'Arhab', postalCode: '11505' },
      { nameAr: 'خولان', nameEn: 'Khawlan', postalCode: '11506' },
      { nameAr: 'مناخة (حراز)', nameEn: 'Manakhah (Haraz)', postalCode: '11507' },
      { nameAr: 'الحيمة الداخلية', nameEn: 'Al Haymah Ad Dakhiliyah', postalCode: '11508' },
      { nameAr: 'الحيمة الخارجية', nameEn: 'Al Haymah Al Kharijiyah', postalCode: '11509' },
    ],
  },
  {
    id: 'lahij',
    nameAr: 'لحج',
    nameEn: 'Lahij',
    capitalAr: 'الحوطة',
    capitalEn: 'Al Hawtah',
    defaultPostalCode: '18000',
    commonCities: ['Al Hawtah', 'Tuban', 'Radfan', 'Yafa\'', 'Al Madaribah', 'Tur Al Bahah', 'Al Qabbaytah', 'Al Maqatirah', 'Habil Jabr', 'Yahr'],
    districts: [
      { nameAr: 'الحوطة', nameEn: 'Al Hawtah', postalCode: '18001' },
      { nameAr: 'تبن', nameEn: 'Tuban', postalCode: '18002' },
      { nameAr: 'ردفان', nameEn: 'Radfan', postalCode: '18003' },
      { nameAr: 'طور الباحة', nameEn: 'Tur Al Bahah', postalCode: '18004' },
      { nameAr: 'القبيطة', nameEn: 'Al Qabbaytah', postalCode: '18005' },
      { nameAr: 'المقاطرة', nameEn: 'Al Maqatirah', postalCode: '18006' },
      { nameAr: 'يافع (لبعوس)', nameEn: 'Yafa\' (Lab\'us)', postalCode: '18007' },
    ],
  },
  {
    id: 'abyan',
    nameAr: 'أبين',
    nameEn: 'Abyan',
    capitalAr: 'زنجبار',
    capitalEn: 'Zinjibar',
    defaultPostalCode: '19000',
    commonCities: ['Zinjibar', 'Khanfar', 'Ja\'ar', 'Lawdar', 'Mudiyah', 'Ahwar', 'Rasad', 'Sarar', 'Sibah'],
    districts: [
      { nameAr: 'زنجبار', nameEn: 'Zinjibar', postalCode: '19001' },
      { nameAr: 'خنفر (جعار)', nameEn: 'Khanfar (Ja\'ar)', postalCode: '19002' },
      { nameAr: 'لودر', nameEn: 'Lawdar', postalCode: '19003' },
      { nameAr: 'مودية', nameEn: 'Mudiyah', postalCode: '19004' },
      { nameAr: 'أحور', nameEn: 'Ahwar', postalCode: '19005' },
      { nameAr: 'رصد (يافع أبين)', nameEn: 'Rasad', postalCode: '19006' },
    ],
  },
  {
    id: 'marib',
    nameAr: 'مأرب',
    nameEn: 'Marib',
    capitalAr: 'مدينة مأرب',
    capitalEn: 'Marib City',
    defaultPostalCode: '20000',
    commonCities: ['Marib City', 'Marib District', 'Sirwah', 'Harib', 'Al Jubah', 'Raghwan', 'Madghal', 'Bidbadah'],
    districts: [
      { nameAr: 'مدينة مأرب', nameEn: 'Marib City', postalCode: '20001' },
      { nameAr: 'مأرب الوادي', nameEn: 'Marib Al Wadi', postalCode: '20002' },
      { nameAr: 'صرواح', nameEn: 'Sirwah', postalCode: '20003' },
      { nameAr: 'حريب', nameEn: 'Harib', postalCode: '20004' },
      { nameAr: 'الجوبة', nameEn: 'Al Jubah', postalCode: '20005' },
    ],
  },
  {
    id: 'shabwah',
    nameAr: 'شبوة',
    nameEn: 'Shabwah',
    capitalAr: 'عتق',
    capitalEn: 'Ataq',
    defaultPostalCode: '21000',
    commonCities: ['Ataq', 'Bayhan', 'Bayhan Al Qasab', 'Habban', 'Mayfa\'ah', 'Rawdah', 'Rudum', 'Nisab', 'As Said', 'Ain'],
    districts: [
      { nameAr: 'عتق', nameEn: 'Ataq', postalCode: '21001' },
      { nameAr: 'بيحان', nameEn: 'Bayhan', postalCode: '21002' },
      { nameAr: 'حبان', nameEn: 'Habban', postalCode: '21003' },
      { nameAr: 'ميفعة', nameEn: 'Mayfa\'ah', postalCode: '21004' },
      { nameAr: 'نصاب', nameEn: 'Nisab', postalCode: '21005' },
      { nameAr: 'الصعيد', nameEn: 'As Said', postalCode: '21006' },
    ],
  },
  {
    id: 'al_mahrah',
    nameAr: 'المهرة',
    nameEn: 'Al Mahrah',
    capitalAr: 'الغيضة',
    capitalEn: 'Al Ghaydah',
    defaultPostalCode: '22000',
    commonCities: ['Al Ghaydah', 'Sayhut', 'Qishn', 'Hawf', 'Haswayn', 'Shahan', 'Manar', 'Itab'],
    districts: [
      { nameAr: 'الغيضة', nameEn: 'Al Ghaydah', postalCode: '22001' },
      { nameAr: 'سيحوت', nameEn: 'Sayhut', postalCode: '22002' },
      { nameAr: 'قشن', nameEn: 'Qishn', postalCode: '22003' },
      { nameAr: 'حوف', nameEn: 'Hawf', postalCode: '22004' },
      { nameAr: 'شحن', nameEn: 'Shahan', postalCode: '22005' },
    ],
  },
  {
    id: 'socotra',
    nameAr: 'أرخبيل سقطرى',
    nameEn: 'Socotra Archipelago',
    capitalAr: 'حديبو',
    capitalEn: 'Hadibu',
    defaultPostalCode: '23000',
    commonCities: ['Hadibu', 'Qulansiyah', 'Noged', 'Dixam'],
    districts: [
      { nameAr: 'حديبو', nameEn: 'Hadibu', postalCode: '23001' },
      { nameAr: 'قلنسية وعبد الكوري', nameEn: 'Qulansiyah Wa Abd Al Kuri', postalCode: '23002' },
    ],
  },
  {
    id: 'saada',
    nameAr: 'صعدة',
    nameEn: 'Sa\'ada',
    capitalAr: 'صعدة',
    capitalEn: 'Sa\'ada',
    defaultPostalCode: '24000',
    commonCities: ['Sa\'ada', 'Sahar', 'Haydan', 'Razih', 'Kitaf', 'Baqim', 'Monabbih', 'Ghamr'],
    districts: [
      { nameAr: 'مدينة صعدة', nameEn: 'Sa\'ada City', postalCode: '24001' },
      { nameAr: 'سحار', nameEn: 'Sahar', postalCode: '24002' },
      { nameAr: 'حيدان', nameEn: 'Haydan', postalCode: '24003' },
      { nameAr: 'رازح', nameEn: 'Razih', postalCode: '24004' },
      { nameAr: 'كتاف والبقع', nameEn: 'Kitaf Wa Al Boqe\'e', postalCode: '24005' },
    ],
  },
  {
    id: 'amran',
    nameAr: 'عمران',
    nameEn: 'Amran',
    capitalAr: 'عمران',
    capitalEn: 'Amran',
    defaultPostalCode: '25000',
    commonCities: ['Amran', 'Raydah', 'Khamir', 'Shaharah', 'Dhi Bin', 'Thula', 'Habur Zulaymah', 'Harf Sufyan', 'Iyal Surayh'],
    districts: [
      { nameAr: 'مدينة عمران', nameEn: 'Amran City', postalCode: '25001' },
      { nameAr: 'ريدة', nameEn: 'Raydah', postalCode: '25002' },
      { nameAr: 'خمر', nameEn: 'Khamir', postalCode: '25003' },
      { nameAr: 'شهارة', nameEn: 'Shaharah', postalCode: '25004' },
      { nameAr: 'ثلاء', nameEn: 'Thula', postalCode: '25005' },
      { nameAr: 'حرف سفيان', nameEn: 'Harf Sufyan', postalCode: '25006' },
    ],
  },
  {
    id: 'hajjah',
    nameAr: 'حجة',
    nameEn: 'Hajjah',
    capitalAr: 'حجة',
    capitalEn: 'Hajjah',
    defaultPostalCode: '26000',
    commonCities: ['Hajjah', 'Abs', 'Haradh', 'Mabyan', 'Kuhlan Afar', 'Mustaba', 'Hayfan', 'Wadrah', 'Washhah', 'Kushar'],
    districts: [
      { nameAr: 'مدينة حجة', nameEn: 'Hajjah City', postalCode: '26001' },
      { nameAr: 'عبس', nameEn: 'Abs', postalCode: '26002' },
      { nameAr: 'حرض', nameEn: 'Haradh', postalCode: '26003' },
      { nameAr: 'مبين', nameEn: 'Mabyan', postalCode: '26004' },
      { nameAr: 'كحلان عفار', nameEn: 'Kuhlan Afar', postalCode: '26005' },
      { nameAr: 'كشر', nameEn: 'Kushar', postalCode: '26006' },
    ],
  },
  {
    id: 'al_bayda',
    nameAr: 'البيضاء',
    nameEn: 'Al Bayda',
    capitalAr: 'البيضاء',
    capitalEn: 'Al Bayda',
    defaultPostalCode: '27000',
    commonCities: ['Al Bayda', 'Rada\'a', 'Mukayras', 'As Sawadiyah', 'Dhi Na\'im', 'Al Malaghim', 'Wald Rabi\'', 'Numan'],
    districts: [
      { nameAr: 'مدينة البيضاء', nameEn: 'Al Bayda City', postalCode: '27001' },
      { nameAr: 'رداع', nameEn: 'Rada\'a', postalCode: '27002' },
      { nameAr: 'مكيراس', nameEn: 'Mukayras', postalCode: '27003' },
      { nameAr: 'السوادية', nameEn: 'As Sawadiyah', postalCode: '27004' },
      { nameAr: 'ذي ناعم', nameEn: 'Dhi Na\'im', postalCode: '27005' },
    ],
  },
  {
    id: 'ad_dali',
    nameAr: 'الضالع',
    nameEn: 'Ad Dali',
    capitalAr: 'الضالع',
    capitalEn: 'Ad Dali',
    defaultPostalCode: '28000',
    commonCities: ['Ad Dali', 'Qatabah', 'Damt', 'Juban', 'Al Azariq', 'Jahayf', 'Al Hussein'],
    districts: [
      { nameAr: 'الضالع', nameEn: 'Ad Dali', postalCode: '28001' },
      { nameAr: 'قعطبة', nameEn: 'Qatabah', postalCode: '28002' },
      { nameAr: 'دمت', nameEn: 'Damt', postalCode: '28003' },
      { nameAr: 'جبن', nameEn: 'Juban', postalCode: '28004' },
      { nameAr: 'الأزارق', nameEn: 'Al Azariq', postalCode: '28005' },
    ],
  },
  {
    id: 'al_jawf',
    nameAr: 'الجوف',
    nameEn: 'Al Jawf',
    capitalAr: 'الحزم',
    capitalEn: 'Al Hazm',
    defaultPostalCode: '29000',
    commonCities: ['Al Hazm', 'Al Ghayl', 'Al Maton', 'Al Maslub', 'Khab Wa Ash Sha\'af', 'Barat Al Anan', 'Rajuzah'],
    districts: [
      { nameAr: 'الحزم', nameEn: 'Al Hazm', postalCode: '29001' },
      { nameAr: 'الغيل', nameEn: 'Al Ghayl', postalCode: '29002' },
      { nameAr: 'المتون', nameEn: 'Al Maton', postalCode: '29003' },
      { nameAr: 'خب والشعف', nameEn: 'Khab Wa Ash Sha\'af', postalCode: '29004' },
      { nameAr: 'برط العنان', nameEn: 'Barat Al Anan', postalCode: '29005' },
    ],
  },
  {
    id: 'raymah',
    nameAr: 'ريمة',
    nameEn: 'Raymah',
    capitalAr: 'الجبين',
    capitalEn: 'Al Jabin',
    defaultPostalCode: '30000',
    commonCities: ['Al Jabin', 'Kusmah', 'Bilad At Ta\'am', 'Mazhar', 'As Salafiyah', 'Al Jafariyah'],
    districts: [
      { nameAr: 'الجبين', nameEn: 'Al Jabin', postalCode: '30001' },
      { nameAr: 'كسمة', nameEn: 'Kusmah', postalCode: '30002' },
      { nameAr: 'بلاد الطعام', nameEn: 'Bilad At Ta\'am', postalCode: '30003' },
      { nameAr: 'مزهر', nameEn: 'Mazhar', postalCode: '30004' },
      { nameAr: 'الجعفرية', nameEn: 'Al Jafariyah', postalCode: '30005' },
    ],
  },
];

/**
 * Flat list of all official Yemeni cities and towns in Latin characters for autocomplete and DS-5501 format
 */
export const ALL_YEMEN_CITIES: string[] = Array.from(
  new Set(
    YEMEN_GOVERNORATES.flatMap((gov) => [
      gov.capitalEn,
      ...gov.commonCities,
      ...gov.districts.map((d) => d.nameEn),
    ])
  )
).sort((a, b) => a.localeCompare(b));

/**
 * Returns the matching governorate by Arabic/English name or district
 */
export function findYemenGovernorate(query: string): YemenGovernorate | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase();
  return YEMEN_GOVERNORATES.find((g) => {
    return (
      g.nameEn.toLowerCase().includes(q) ||
      g.nameAr.includes(query.trim()) ||
      g.capitalEn.toLowerCase().includes(q) ||
      g.capitalAr.includes(query.trim()) ||
      g.commonCities.some((c) => c.toLowerCase().includes(q)) ||
      g.districts.some((d) => d.nameEn.toLowerCase().includes(q) || d.nameAr.includes(query.trim()))
    );
  });
}
