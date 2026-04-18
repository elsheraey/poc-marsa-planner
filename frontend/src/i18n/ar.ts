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
  // TODO: native-speaker review
  "report.suggest.monthly":
    "ارفع المساهمة الشهرية إلى {monthly} جنيهًا لبلوغ احتمال 80٪.",
  // TODO: native-speaker review
  "report.suggest.horizon":
    "مدِّد الأفق حتى عام {year} أو راجع الهدف.",
  // TODO: native-speaker review
  "report.suggest.unreachable":
    "هذا الهدف خارج نطاق التحقق ضمن أي خطة شهرية في نموذجنا.",
  "report.suggest.none":
    "لا يوجد حل مباشر — جرِّب إعادة التشغيل بمدخلات مختلفة.",

  "report.action.present": "عرض للعميل",
  "report.action.exit_present": "الخروج من وضع العرض",
  "report.action.print": "طباعة",
  "report.action.save": "حفظ المحاكاة",
  // TODO: native-speaker review
  "report.action.saving": "جارٍ الحفظ…",
  // TODO: native-speaker review
  "report.action.saved": "تم الحفظ",
  "report.action.back": "العودة إلى السيناريوهات",

  // TODO: native-speaker review
  "report.save.prompt": "اسم هذه المحاكاة",
  // TODO: native-speaker review
  "report.save.toast.success": "تم حفظ المحاكاة '{name}'",

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

  // TODO: native-speaker review — shared UI strings below are functional
  // MSA; a native reviewer should sign off before pilot GA.
  "common.loading": "جارٍ التحميل…",
  "common.cancel": "إلغاء",
  "common.save": "حفظ",

  "client.modify": "تعديل",
  "client.section.info": "بيانات العميل",
  "client.section.coClient": "العميل المشارك",
  "client.section.incomeSources": "مصادر الدخل",
  "client.section.dependents": "المُعالون",
  "client.section.assets": "الأصول",
  "client.section.debts": "الديون",
  "client.section.goals": "الأهداف",
  "client.field.fullName": "الاسم الكامل",
  "client.field.mobile": "الجوّال",
  "client.field.email": "البريد الإلكتروني",
  "client.field.birthdate": "تاريخ الميلاد",
  "client.field.employmentStatus": "الحالة الوظيفية",
  "client.field.employmentIncome": "دخل العمل",
  "client.tile.riskAppetite": "درجة المخاطرة",
  "client.tile.totalAssets": "إجمالي الأصول",
  "client.tile.totalDebts": "إجمالي الديون",
  "client.tile.monthlyExpenses": "المصروفات الشهرية",
  "client.col.source": "المصدر",
  "client.col.amount": "المبلغ",
  "client.col.annualIncrease": "الزيادة السنوية",
  "client.col.asset": "الأصل",
  "client.col.debt": "الدَّين",
  "client.col.duration": "المدة",
  "client.col.interestRate": "سعر الفائدة",
  "client.col.goal": "الهدف",
  "client.col.year": "السنة",
  "client.empty.coClient": "لا يوجد عميل مشارك.",
  "client.empty.incomeSources": "لا توجد مصادر دخل بعد",
  "client.empty.dependents": "لا يوجد مُعالون بعد",
  "client.empty.assets": "لا توجد أصول بعد",
  "client.empty.debts": "لا توجد ديون بعد",
  "client.empty.goals": "لا توجد أهداف بعد",
  "client.empty.addOne": "أضف واحدًا",
  "client.years": "{n} سنوات",

  "profile.section.required": "البيانات الشخصية",
  "profile.section.dossier": "الملف الموسَّع (اختياري)",
  "profile.section.dossier.help":
    "المُعالون ومصادر الدخل والأصول والديون والعميل المشارك والمصروفات. تُحفَظ هذه الحقول لكنها ليست مطلوبة لتشغيل المحاكاة.",
  "profile.field.fullName": "الاسم الكامل",
  "profile.field.email": "البريد الإلكتروني",
  "profile.field.birthdate": "تاريخ الميلاد",
  "profile.field.phone": "رقم الهاتف",
  "profile.field.employmentStatus": "الحالة الوظيفية",
  "profile.field.riskAppetite": "درجة المخاطرة",
  "profile.employmentStatus.select": "اختر",
  "profile.employmentStatus.employed": "موظف",
  "profile.employmentStatus.selfEmployed": "عمل حر",
  "profile.employmentStatus.retired": "متقاعد",
  "profile.employmentStatus.unemployed": "بدون عمل",
  "profile.risk.very_low": "منخفضة جدًا",
  "profile.risk.low": "منخفضة",
  "profile.risk.moderate": "متوسطة",
  "profile.risk.high": "مرتفعة",
  "profile.risk.very_high": "مرتفعة جدًا",
  "profile.dossier.coClient": "العميل المشارك",
  "profile.dossier.dependents": "المُعالون",
  "profile.dossier.incomeSources": "مصادر الدخل",
  "profile.dossier.assets": "الأصول",
  "profile.dossier.debts": "الديون",
  "profile.dossier.monthlyExpenses": "متوسط المصروفات الشهرية",
  "profile.dossier.employmentIncome": "دخل العمل",
  "profile.dossier.source": "المصدر",
  "profile.dossier.amount": "المبلغ",
  "profile.dossier.annualIncrease": "الزيادة السنوية (٪)",
  "profile.dossier.asset": "الأصل",
  "profile.dossier.debt": "الدَّين",
  "profile.dossier.duration": "المدة (سنوات)",
  "profile.dossier.interestRate": "سعر الفائدة (٪)",
  "profile.dossier.relation": "صلة القرابة",
  "profile.dossier.relation.son": "ابن",
  "profile.dossier.relation.daughter": "ابنة",
  "profile.cta.cancel": "إلغاء",
  "profile.cta.proceed": "المتابعة إلى الأهداف",

  "report.se.tail": "± {pp} نقطة مئوية",
};

export default ar;
