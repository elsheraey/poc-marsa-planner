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
    "الجهة الرقابية: الهيئة العامة للرقابة المالية (FRA) — {appName} أداة مساعدة وليست مستشارًا استثماريًا مرخَّصًا.",

  "nav.overview": "نظرة عامة",
  "nav.clients": "العملاء",
  "nav.new_client": "إضافة عميل جديد",
  "nav.signout": "تسجيل الخروج",

  "auth.login": "تسجيل الدخول",
  "auth.register": "إنشاء حساب",

  // TODO: native-speaker review
  "auth.login.heading": "تسجيل دخول المستشار المالي",
  // TODO: native-speaker review
  "auth.login.subheading":
    "سجّل الدخول لتشغيل خطط مالية موثوقة تراعي التضخم لعملائك المصريين.",
  // TODO: native-speaker review
  "auth.login.welcome": "مرحبًا بك في {appName}",
  // TODO: native-speaker review
  "auth.login.email": "البريد الإلكتروني",
  // TODO: native-speaker review
  "auth.login.email_placeholder": "عنوان البريد الإلكتروني",
  // TODO: native-speaker review
  "auth.login.password": "كلمة المرور",
  // TODO: native-speaker review
  "auth.login.password_placeholder": "كلمة المرور",
  // TODO: native-speaker review
  "auth.login.submit": "دخول",
  // TODO: native-speaker review
  "auth.login.submitting": "جارٍ تسجيل الدخول...",
  // TODO: native-speaker review
  "auth.login.need_account": "ليس لديك حساب؟",
  // TODO: native-speaker review
  "auth.login.sign_up": "إنشاء حساب",
  // TODO: native-speaker review
  "auth.login.toast.success": "تم تسجيل الدخول",

  // TODO: native-speaker review
  "auth.register.heading": "إنشاء حساب",
  // TODO: native-speaker review
  "auth.register.subheading": "ابدأ بإدارة محافظ العملاء في دقائق.",
  // TODO: native-speaker review
  "auth.register.welcome": "أنشئ حسابك في {appName}",
  // TODO: native-speaker review
  "auth.register.name": "الاسم الكامل",
  // TODO: native-speaker review
  "auth.register.email": "البريد الإلكتروني",
  // TODO: native-speaker review
  "auth.register.password": "كلمة المرور",
  // TODO: native-speaker review
  "auth.register.confirm_password": "تأكيد كلمة المرور",
  // TODO: native-speaker review
  "auth.register.submit": "إنشاء الحساب",
  // TODO: native-speaker review
  "auth.register.submitting": "جارٍ إنشاء الحساب...",
  // TODO: native-speaker review
  "auth.register.have_account": "لديك حساب بالفعل؟",
  // TODO: native-speaker review
  "auth.register.sign_in": "تسجيل الدخول",
  // TODO: native-speaker review
  "auth.register.toast.success": "تم إنشاء الحساب",

  // TODO: native-speaker review
  "auth.error.email_required": "أدخل بريدًا إلكترونيًا صالحًا",
  // TODO: native-speaker review
  "auth.error.email_invalid": "أدخل بريدًا إلكترونيًا صالحًا",
  // TODO: native-speaker review
  "auth.error.password_required": "كلمة المرور مطلوبة",
  // TODO: native-speaker review
  "auth.error.password_min": "يجب ألا تقل كلمة المرور عن 8 أحرف",
  // TODO: native-speaker review
  "auth.error.name_required": "الاسم مطلوب",
  // TODO: native-speaker review
  "auth.error.password_mismatch": "كلمتا المرور غير متطابقتين",

  // Mirrors the `auth.error.server.*` block in en.ts. Looked up by backend
  // error code (e.g. `unauthorized` → `auth.error.server.unauthorized`).
  // TODO: native-speaker review
  "auth.error.server.unauthorized":
    "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  // TODO: native-speaker review
  "auth.error.server.conflict": "هذا البريد الإلكتروني مسجَّل بالفعل.",
  // TODO: native-speaker review
  "auth.error.server.validation_error":
    "يرجى مراجعة النموذج والمحاولة مرة أخرى.",
  // TODO: native-speaker review
  "auth.error.server.rate_limited":
    "محاولات كثيرة جدًا. انتظر دقيقة ثم أعد المحاولة.",
  // TODO: native-speaker review
  "auth.error.server.default": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",

  "wizard.profile": "البيانات الشخصية",
  "wizard.goals": "الأهداف",
  "wizard.scenario": "منشئ السيناريوهات",
  "wizard.run_simulation": "تشغيل المحاكاة",

  "report.headline.met":
    "الخطة تحقق الهدف باحتمال ~{pct}٪.",
  "report.headline.shortfall":
    "بمساهمة شهرية {monthly}، تحقق الخطة الهدف باحتمال ~{pct}٪.",
  "report.headline.unreachable":
    "بمساهمة شهرية {monthly}، هدف {goal} للعميل {name} خارج نطاق التحقق ضمن هذه الخطة.",
  // TODO: native-speaker review
  "report.goal.default": "الهدف",
  // TODO: native-speaker review
  "report.client.default": "العميل",
  "report.headline.no_goal":
    "لم يُحدَّد مبلغ الهدف — الإسقاطات أدناه للعرض فقط.",
  // TODO: native-speaker review
  "report.suggest.monthly":
    "ارفع المساهمة الشهرية إلى {monthly} لبلوغ احتمال 80٪.",
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
    "{appName} يحوِّل محاكاتك إلى حوار — بالعربية أو الإنجليزية.",
  "landing.body":
    "مصمَّم للمستشارين الماليين في مصر لتشغيل خطط موثوقة تراعي التضخم أمام العميل. جنيه مصري حقيقي، أنظمة اقتصادية حقيقية، قرارات حقيقية.",
  "landing.cta": "ادخل إلى البوابة",
  // TODO: native-speaker review
  "landing.footer": "© {year} {appName}",

  // TODO: native-speaker review — editorial-voice section copy
  "landing.section.credible.title": "إجابة مدروسة، لا لوحة مؤشرات.",
  "landing.section.credible.body":
    "كل رقم هو تقدير مونت-كارلو مصحوبًا بخطئه المعياري على الصفحة. لا رسوم دائرية، ولا عدّادات زينة، ولا دقة مُختلقة.",
  "landing.section.inflation.title": "تراعي التضخم، بالجنيه المصري.",
  "landing.section.inflation.body":
    "الإسقاطات معروضة بالجنيه المصري الحقيقي. مصدر البيانات ونافذة المعايرة يظهران بجوار كل تقرير — فالمستشار، وليس الرسم البياني، هو من يحمل المصداقية.",
  "landing.section.arabic.title": "قابل للقراءة بالعربية أو الإنجليزية.",
  "landing.section.arabic.body":
    "يُعكس المستند بالكامل بسلاسة من اليمين إلى اليسار. يرى العميل الذي يقرأ التقرير بالعربية الفواصل الشعرية نفسها والطباعة المدروسة نفسها التي يراها المستشار.",

  // TODO: native-speaker review
  "shell.footer": "© {year}، من تطوير {appName}",

  "locale.toggle": "English",

  // TODO: native-speaker review — shared UI strings below are functional
  // MSA; a native reviewer should sign off before pilot GA.
  "common.loading": "جارٍ التحميل…",
  "common.cancel": "إلغاء",
  "common.save": "حفظ",

  "client.modify": "تعديل",
  // TODO: native-speaker review
  "client.notFound": "العميل غير موجود. قد يكون قد تم حذفه.",
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

  // TODO: native-speaker review
  "client.section.savedSims": "المحاكاات المحفوظة",
  // TODO: native-speaker review
  "client.savedSims.empty": "لا توجد محاكاات محفوظة بعد.",
  // TODO: native-speaker review
  "client.savedSims.error": "تعذّر تحميل المحاكاات المحفوظة.",
  // TODO: native-speaker review
  "client.savedSims.col.name": "الاسم",
  // TODO: native-speaker review
  "client.savedSims.col.createdAt": "تاريخ الإنشاء",
  // TODO: native-speaker review
  "client.savedSims.col.probability": "احتمال تحقيق الهدف",
  // TODO: native-speaker review
  "client.savedSims.col.attainability": "قابلية التحقيق",
  // TODO: native-speaker review
  "client.savedSims.col.actions": "إجراءات",
  // TODO: native-speaker review
  "client.savedSims.delete": "حذف",
  // TODO: native-speaker review
  "client.savedSims.confirmDelete": "حذف المحاكاة المحفوظة '{name}'؟",

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

  // TODO: native-speaker review
  "wizard.profile.error.fullName": "الاسم الكامل مطلوب",
  // TODO: native-speaker review
  "wizard.profile.error.email": "أدخل بريدًا إلكترونيًا صالحًا",
  // TODO: native-speaker review
  "wizard.profile.error.birthdate":
    "أدخل تاريخ ميلاد صحيحًا في الماضي (يوم/شهر/سنة)",
  // TODO: native-speaker review
  "wizard.profile.error.phone": "أدخل رقم هاتف (6–32 حرفًا)",
  // TODO: native-speaker review
  "wizard.profile.error.employmentStatus": "اختر الحالة الوظيفية",
  // TODO: native-speaker review
  "wizard.profile.error.riskAppetite": "اختر درجة المخاطرة",

  // TODO: native-speaker review
  "wizard.goals.error.name": "اسم الهدف مطلوب",
  // TODO: native-speaker review
  "wizard.goals.error.amount": "يجب أن يكون المبلغ أكبر من صفر",
  // TODO: native-speaker review
  "wizard.goals.error.year": "يجب أن تكون السنة هذه السنة أو أحدث",

  // TODO: native-speaker review
  "wizard.scenario.duplicate": "تكرار",
  // TODO: native-speaker review
  "wizard.scenario.duplicate.atCap":
    "تعذّر التكرار: وصلت إلى الحد الأقصى {max} سيناريوهات",

  // Wizard layout (title + subtitle at top of /clients/new/*)
  // TODO: native-speaker review
  "wizard.layout.title": "عميل جديد",
  // TODO: native-speaker review
  "wizard.layout.subtitle":
    "ابنِ الملف الشخصي، وسجِّل الأهداف، وشغِّل السيناريو.",
  // TODO: native-speaker review
  "wizard.tabs.aria": "خطوات المعالج",

  // Common UI labels reused across wizard steps.
  // TODO: native-speaker review
  "common.close": "إغلاق",
  // TODO: native-speaker review
  "common.add": "إضافة",
  // TODO: native-speaker review
  "common.remove": "حذف",
  // TODO: native-speaker review
  "common.select": "اختيار",
  // TODO: native-speaker review
  "common.choose": "اختر",
  // TODO: native-speaker review
  "common.amount": "المبلغ",
  // TODO: native-speaker review
  "common.year": "السنة",
  // TODO: native-speaker review
  "common.duration": "المدة",
  // TODO: native-speaker review
  "common.interestRate": "سعر الفائدة",
  // TODO: native-speaker review
  "common.name": "الاسم",

  // Goals step — repeater labels, CTAs, empty-state, add / remove aria.
  // TODO: native-speaker review
  "wizard.goals.title": "الأهداف",
  // TODO: native-speaker review
  "wizard.goals.add": "إضافة هدف",
  // TODO: native-speaker review
  "wizard.goals.remove": "حذف الهدف",
  // TODO: native-speaker review
  "wizard.goals.empty.before": "لا توجد أهداف بعد. اضغط على",
  // TODO: native-speaker review
  "wizard.goals.empty.after": "لإضافة واحد.",
  // TODO: native-speaker review
  "wizard.goals.col.name": "الاسم",
  // TODO: native-speaker review
  "wizard.goals.col.amount": "المبلغ",
  // TODO: native-speaker review
  "wizard.goals.col.year": "السنة",
  // TODO: native-speaker review
  "wizard.goals.col.payments": "الدفعات",
  // TODO: native-speaker review
  "wizard.goals.col.inflation": "التضخم ٪",
  // TODO: native-speaker review
  "wizard.goals.placeholder.name": "الهدف",
  // TODO: native-speaker review
  "wizard.goals.placeholder.amount": "المبلغ",
  // TODO: native-speaker review
  "wizard.goals.placeholder.year": "السنة",
  // TODO: native-speaker review
  "wizard.goals.placeholder.payments": "العدد",
  // TODO: native-speaker review
  "wizard.goals.placeholder.inflation": "٪",
  // TODO: native-speaker review
  "wizard.goals.cta.cancel": "إلغاء",
  // TODO: native-speaker review
  "wizard.goals.cta.save": "حفظ",
  // TODO: native-speaker review
  "wizard.goals.cta.proceed": "المتابعة إلى السيناريو",

  // Profile step — dossier placeholders & repeater add/remove aria.
  // TODO: native-speaker review
  "wizard.profile.placeholder.fullName": "الاسم الكامل",
  // TODO: native-speaker review
  "wizard.profile.placeholder.birthdate": "يوم/شهر/سنة",
  // TODO: native-speaker review
  "wizard.profile.repeater.add": "إضافة {group}",
  // TODO: native-speaker review
  "wizard.profile.repeater.remove": "حذف {group}",

  // Scenario step — top-level buttons and guard-rail toasts.
  // TODO: native-speaker review
  "wizard.scenario.add_new": "إضافة سيناريو جديد",
  // TODO: native-speaker review
  "wizard.scenario.save_for_later": "حفظ لوقت لاحق",
  // TODO: native-speaker review
  "wizard.scenario.run": "تشغيل المحاكاة",
  // TODO: native-speaker review
  "wizard.scenario.default_name": "السيناريو {n}",

  // Pre-run validation toasts surfaced by ScenarioStep.runAllInner.
  // TODO: native-speaker review
  "wizard.scenario.toast.no_scenarios":
    "أضف سيناريو واحدًا على الأقل قبل تشغيل المحاكاة",
  // TODO: native-speaker review
  "wizard.scenario.toast.no_goals":
    "أضف هدفًا واحدًا على الأقل باسم ومبلغ مستهدف",
  // TODO: native-speaker review
  "wizard.scenario.toast.no_profile":
    "أضف اسم العميل وبريده الإلكتروني في خطوة الملف الشخصي أولًا",
  // TODO: native-speaker review
  "wizard.scenario.toast.no_money":
    "أضف استثمارًا واحدًا على الأقل أو مساهمة شهرية",
  // TODO: native-speaker review
  "wizard.scenario.toast.skipped":
    "تم تخطي {n} سيناريو بدون استثمارات: {names}",
  // TODO: native-speaker review
  "wizard.scenario.toast.cap":
    "تُشغَّل أول {max} سيناريوهات فقط؛ تم إسقاط الباقي.",

  // ScenarioCard header — per-card controls.
  // TODO: native-speaker review
  "wizard.scenario.card.expand": "توسيع",
  // TODO: native-speaker review
  "wizard.scenario.card.collapse": "طيّ",
  // TODO: native-speaker review
  "wizard.scenario.card.remove": "حذف",
  // TODO: native-speaker review
  "wizard.scenario.card.name.label": "اسم السيناريو",
  // TODO: native-speaker review
  "wizard.scenario.card.name.placeholder": "اسم السيناريو",
  // TODO: native-speaker review
  "wizard.scenario.card.model.label": "النموذج",
  // TODO: native-speaker review
  "wizard.scenario.card.selectGoals": "اختيار الأهداف",
  // TODO: native-speaker review
  "wizard.scenario.card.selectGoals.choose": "اختر",
  // TODO: native-speaker review
  "wizard.scenario.card.selectGoals.close": "إغلاق",

  // Scenario model select — "Select model" placeholder + enum options.
  // TODO: native-speaker review
  "wizard.scenario.model.placeholder": "اختر النموذج",
  // TODO: native-speaker review
  "wizard.scenario.model.balanced": "متوازن",
  // TODO: native-speaker review
  "wizard.scenario.model.aggressive": "جريء",
  // TODO: native-speaker review
  "wizard.scenario.model.conservative": "متحفِّظ",

  // GoalPicker — inline picker shown under each ScenarioCard.
  // TODO: native-speaker review
  "wizard.scenario.goalpicker.title": "الأهداف",
  // TODO: native-speaker review
  "wizard.scenario.goalpicker.col.goal": "الهدف",
  // TODO: native-speaker review
  "wizard.scenario.goalpicker.col.amount": "المبلغ",
  // TODO: native-speaker review
  "wizard.scenario.goalpicker.col.year": "السنة",
  // TODO: native-speaker review
  "wizard.scenario.goalpicker.col.inflation": "التضخم",
  // TODO: native-speaker review
  "wizard.scenario.goalpicker.cancel": "إلغاء",
  // TODO: native-speaker review
  "wizard.scenario.goalpicker.select": "اختيار",

  // Per-section labels, columns and add/remove aria for GroupList rows.
  // TODO: native-speaker review
  "wizard.scenario.investments.title": "الاستثمارات",
  // TODO: native-speaker review
  "wizard.scenario.investments.col.amount": "المبلغ",
  // TODO: native-speaker review
  "wizard.scenario.investments.col.year": "السنة",
  // TODO: native-speaker review
  "wizard.scenario.monthly.title": "الاستثمارات الشهرية",
  // TODO: native-speaker review
  "wizard.scenario.monthly.col.amount": "المبلغ",
  // TODO: native-speaker review
  "wizard.scenario.monthly.col.annualIncrease": "معدل الزيادة السنوية",
  // TODO: native-speaker review
  "wizard.scenario.loans.title": "القروض",
  // TODO: native-speaker review
  "wizard.scenario.loans.col.amount": "المبلغ",
  // TODO: native-speaker review
  "wizard.scenario.loans.col.year": "سنة السحب",
  // TODO: native-speaker review
  "wizard.scenario.loans.col.duration": "المدة",
  // TODO: native-speaker review
  "wizard.scenario.loans.col.interest": "سعر الفائدة",
  // TODO: native-speaker review
  "wizard.scenario.group.add": "إضافة {group}",
  // TODO: native-speaker review
  "wizard.scenario.group.remove": "حذف {group}",

  "report.se.tail": "± {pp} نقطة مئوية",
};

export default ar;
