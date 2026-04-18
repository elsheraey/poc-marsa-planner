// Arabic (MSA, geared to Egyptian financial-advisor readability) dictionary.
// Where a term is a legally loaded translation (e.g. FRA = الهيئة العامة
// للرقابة المالية), we use the official Arabic name.
const ar: Record<string, string> = {
  "report.title": "تقرير المحاكاة",
  "report.attainable": "قابل للتحقيق",
  "report.aspirational": "طموح",
  "report.out_of_reach": "بعيد المنال",
  "report.disclosure": "تفاصيل المحاكاة والإفصاحات",

  "report.disclosure.mc":
    "تستند المحاكاة إلى 10,000 سيناريو باستخدام طريقة مونت كارلو.",
  "report.disclosure.real":
    "النتائج معروضة بالجنيه المصري بالقيمة الحقيقية (معدَّلة وفقًا للتضخم) ما لم يُذكر خلاف ذلك.",
  "report.disclosure.past":
    "الأداء السابق لا يُعد ضمانًا للنتائج المستقبلية.",
  "report.disclosure.data":
    "مصدر البيانات: {calibration}. وقت تشغيل المحاكاة: {now}.",
  "report.disclosure.regulator":
    "الجهة الرقابية: الهيئة العامة للرقابة المالية (FRA) — أوبتوفوليو أداة مساعدة وليست مستشارًا استثماريًا مرخَّصًا.",

  "nav.overview": "نظرة عامة",
  "nav.clients": "العملاء",
  "nav.new_client": "إضافة عميل جديد",
  "nav.signout": "تسجيل الخروج",

  "auth.login": "تسجيل الدخول",
  "auth.register": "إنشاء حساب",

  "wizard.profile": "البيانات الشخصية",
  "wizard.goals": "الأهداف",
  "wizard.scenario": "منشئ السيناريوهات",
  "wizard.run_simulation": "تشغيل المحاكاة",

  "locale.toggle": "English",
};

export default ar;
