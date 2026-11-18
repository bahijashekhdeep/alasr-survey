/* إعدادات الموقع — هذا هو الملف الوحيد الذي تحتاجين تعديله عادةً */
window.ALASR_CONFIG = {
  // رابط Google Apps Script بعد النشر (Web app URL). اتركيه فارغاً لتشغيل الوضع التجريبي.
  API_URL: 'https://script.google.com/macros/s/AKfycbzzffbIMxRh17LZdATW9wXCBZUcPb_T5blhCP_TWIUbkU0xJRX54hpm_nY_tsiV6qV8/exec',

  // رابط الموقع بعد رفعه على Netlify (يُستخدم في رمز QR وبطاقة الدعوة والتقرير)
  SITE_URL: 'https://bahijashekhdeep.github.io/alasr-survey',

  INSTITUTE: 'معهد العصر للاقتصاد الإسلامي والتدريب',
  INSTITUTE_SHORT: 'معهد العصر',

  // يظهر في غلاف التقرير فقط. اتركيه فارغاً لإخفائه.
  PREPARED_BY: 'م. بهيجة شيخ ديب',

  LOGO: 'assets/logo.png',           // رمز «العصر» فقط
  LOGO_FULL: 'assets/logo-full.png', // الشعار مع الاسم (لغلاف التقرير)

  // الدورة المستخدمة في الوضع التجريبي فقط
  DEMO_COURSES: [
    {
      id: 'c1',
      diploma: 'دبلوم الاقتصاد الإسلامي والرقابة الشرعية',
      number: 1,
      title: 'عقود التمويل وقواعد المعايير الشرعية',
      trainer: 'د. فضل مراد',
      trainerTitle: '',
      from: '2026-11-06',
      to: '2026-11-08',
      photo: '',
      active: true
    },
    {
      id: 'c2',
      diploma: 'دبلوم الاقتصاد الإسلامي والرقابة الشرعية',
      number: 2,
      title: 'الدورة الثانية (مثال)',
      trainer: 'المدرب الثاني',
      trainerTitle: '',
      from: '2026-11-13',
      to: '2026-11-15',
      photo: '',
      active: false
    }
  ]
};
