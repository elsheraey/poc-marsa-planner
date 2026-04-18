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

  "report.headline.met":
    "الخطة تحقق الهدف باحتمال ~{pct}٪.",
  "report.headline.shortfall":
    "بمساهمة شهرية {monthly} جنيهًا، تحقق الخطة الهدف باحتمال ~{pct}٪.",
  "report.headline.no_goal":
    "لم يُحدَّد مبلغ الهدف — الإسقاطات أدناه للعرض فقط.",
  "report.suggest.monthly":
    "ارفع المساهمة الشهرية إلى حوالي {monthly} جنيهًا لبلوغ الهدف باحتمال 80٪ (تقديري).",
  "report.suggest.year":
    "إبقِ المساهمة كما هي ومدِّد الأفق حتى عام {year} — يصل المتوسط المتوقع إلى الهدف في تلك السنة.",
  "report.suggest.none":
    "لا يوجد حل مباشر — جرِّب إعادة التشغيل بمدخلات مختلفة.",

  "report.action.present": "عرض للعميل",
  "report.action.exit_present": "الخروج من وضع العرض",
  "report.action.print": "طباعة",
  "report.action.save": "حفظ المحاكاة",
  "report.action.back": "العودة إلى السيناريوهات",

  "report.section.probability": "احتمال تحقيق الأهداف",
  "report.section.projection": "الإسقاط",
  "report.section.scenarios": "السيناريوهات",

  "landing.title": "أجب عن سؤال عميلك التالي في ثلاثين ثانية.",
  "landing.subtitle":
    "أوبتوفوليو يحوِّل محاكاتك إلى حوار — بالعربية أو الإنجليزية.",
  "landing.body":
    "مصمَّم للمستشارين الماليين في مصر لتشغيل خطط موثوقة تراعي التضخم أمام العميل. جنيه مصري حقيقي، أنظمة اقتصادية حقيقية، قرارات حقيقية.",
  "landing.cta": "دخول المستشار",

  "locale.toggle": "English",
};

export default ar;
