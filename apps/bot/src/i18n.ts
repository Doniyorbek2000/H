import { STATUS_LABELS_RU, STATUS_LABELS_UZ } from '@smart/shared';

export type Lang = 'uz' | 'ru';

/** Bot matnlari lug'ati — uz/ru */
const DICT = {
  welcome: {
    uz: '🏛 <b>Smart Murojaat AI</b> botiga xush kelibsiz!\n\nTilni tanlang / Выберите язык:',
    ru: '🏛 Добро пожаловать в бот <b>Smart Murojaat AI</b>!\n\nTilni tanlang / Выберите язык:',
  },
  sendPhone: {
    uz: 'Telefon raqamingizni yuboring (quyidagi tugma orqali) 👇',
    ru: 'Отправьте свой номер телефона (кнопка ниже) 👇',
  },
  sendPhoneBtn: { uz: '📱 Raqamni yuborish', ru: '📱 Отправить номер' },
  registered: {
    uz: '✅ Rahmat, <b>{name}</b>!\n\nEndi murojaat yuborishingiz yoki mavjud murojaatingiz holatini tekshirishingiz mumkin.',
    ru: '✅ Спасибо, <b>{name}</b>!\n\nТеперь вы можете отправить обращение или проверить статус существующего.',
  },
  menuNew: { uz: '📝 Yangi murojaat', ru: '📝 Новое обращение' },
  menuMy: { uz: '📋 Mening murojaatlarim', ru: '📋 Мои обращения' },
  menuTrack: { uz: '🔍 Holat tekshirish', ru: '🔍 Проверить статус' },
  menuHelp: { uz: '❓ Yordam', ru: '❓ Помощь' },
  chooseCategory: { uz: 'Murojaat yo‘nalishini tanlang:', ru: 'Выберите направление обращения:' },
  categoryAuto: { uz: '🤖 AI o‘zi aniqlasin', ru: '🤖 Пусть определит ИИ' },
  askTitle: {
    uz: '✍️ Murojaat mavzusini qisqacha yozing (masalan: "Ko‘chada suv quvuri yorildi"):',
    ru: '✍️ Кратко напишите тему обращения (например: «На улице прорвало водопровод»):',
  },
  askDescription: {
    uz: '📝 Endi muammoni batafsil yozing (qachondan beri, qayerda, kimlarga ta’sir qilmoqda):',
    ru: '📝 Теперь опишите проблему подробно (с какого времени, где, на кого влияет):',
  },
  descriptionTooShort: {
    uz: 'Iltimos, kamida 10 belgidan iborat batafsil tavsif yozing.',
    ru: 'Пожалуйста, напишите подробное описание (не менее 10 символов).',
  },
  askMahalla: {
    uz: '🏘 Mahalla nomini yozing (yoki "-" deb yuboring):',
    ru: '🏘 Напишите название махалли (или отправьте «-»):',
  },
  askLocation: {
    uz: '📍 Joylashuvni yuboring (skrepka → Lokatsiya) yoki "-" deb yozing:',
    ru: '📍 Отправьте геолокацию (скрепка → Локация) или напишите «-»:',
  },
  sendLocationBtn: { uz: '📍 Lokatsiyani yuborish', ru: '📍 Отправить локацию' },
  askMedia: {
    uz: '📷 Muammoni tasdiqlovchi rasm, video yoki hujjat yuborishingiz mumkin (5 tagacha, ixtiyoriy).\n\nTugatgach "{btn}" tugmasini bosing:',
    ru: '📷 Можете отправить фото, видео или документ, подтверждающие проблему (до 5, необязательно).\n\nЗатем нажмите кнопку «{btn}»:',
  },
  continueBtn: { uz: '➡️ Davom etish', ru: '➡️ Продолжить' },
  mediaLimit: {
    uz: 'Maksimal 5 ta fayl. "{btn}" tugmasini bosing.',
    ru: 'Максимум 5 файлов. Нажмите «{btn}».',
  },
  photoAccepted: {
    uz: '✅ Rasm qabul qilindi ({n}/5). Yana yuborishingiz yoki davom etishingiz mumkin.',
    ru: '✅ Фото принято ({n}/5). Можете отправить ещё или продолжить.',
  },
  videoAccepted: { uz: '✅ Video qabul qilindi ({n}/5).', ru: '✅ Видео принято ({n}/5).' },
  docAccepted: { uz: '✅ Hujjat qabul qilindi ({n}/5).', ru: '✅ Документ принят ({n}/5).' },
  confirmHeader: { uz: '📋 <b>Murojaatni tasdiqlang:</b>', ru: '📋 <b>Подтвердите обращение:</b>' },
  confirmTopic: { uz: '📌 Mavzu', ru: '📌 Тема' },
  confirmMahalla: { uz: '🏘 Mahalla', ru: '🏘 Махалля' },
  confirmCategory: { uz: '📂 Yo‘nalish', ru: '📂 Направление' },
  confirmCategoryAuto: { uz: 'AI aniqlaydi', ru: 'Определит ИИ' },
  confirmLocationSent: { uz: '📍 Lokatsiya: yuborildi', ru: '📍 Локация: отправлена' },
  confirmLocationNone: { uz: '📍 Lokatsiya: yo‘q', ru: '📍 Локация: нет' },
  confirmFiles: { uz: '📎 Fayllar: {n} ta', ru: '📎 Файлы: {n} шт.' },
  confirmSendBtn: { uz: '✅ Yuborish', ru: '✅ Отправить' },
  confirmCancelBtn: { uz: '❌ Bekor qilish', ru: '❌ Отменить' },
  cancelled: { uz: 'Murojaat bekor qilindi.', ru: 'Обращение отменено.' },
  created: {
    uz: '✅ <b>Murojaatingiz qabul qilindi!</b>\n\n📋 Murojaat raqami: <b>{num}</b>\n\nMurojaatingiz AI yordamida tahlil qilinib, mas’ul bo‘limga yo‘naltiriladi.\nHolat o‘zgarishi haqida shu yerda xabar olasiz. 🔔',
    ru: '✅ <b>Ваше обращение принято!</b>\n\n📋 Номер обращения: <b>{num}</b>\n\nОбращение будет проанализировано ИИ и направлено в ответственный отдел.\nОб изменении статуса вы получите уведомление здесь. 🔔',
  },
  createError: {
    uz: '❌ Yuborishda xatolik. Keyinroq urinib ko‘ring.',
    ru: '❌ Ошибка при отправке. Попробуйте позже.',
  },
  askTrackNumber: {
    uz: '🔍 Murojaat raqamini yuboring (masalan: SM-20260709-0001):',
    ru: '🔍 Отправьте номер обращения (например: SM-20260709-0001):',
  },
  trackNotFound: {
    uz: 'Topilmadi. Raqamni tekshirib qayta yuboring.',
    ru: 'Не найдено. Проверьте номер и отправьте снова.',
  },
  trackStatus: { uz: 'Holat', ru: 'Статус' },
  trackCategory: { uz: 'Yo‘nalish', ru: 'Направление' },
  trackDepartment: { uz: 'Bo‘lim', ru: 'Отдел' },
  trackDeadline: { uz: 'Muddat', ru: 'Срок' },
  trackLastReply: { uz: '💬 Oxirgi javob:', ru: '💬 Последний ответ:' },
  noAppeals: {
    uz: 'Sizda hali murojaatlar yo‘q. 📝 "{btn}" tugmasini bosing.',
    ru: 'У вас пока нет обращений. Нажмите «{btn}». 📝',
  },
  genericError: {
    uz: 'Xatolik yuz berdi, keyinroq urinib ko‘ring.',
    ru: 'Произошла ошибка, попробуйте позже.',
  },
  useMenu: {
    uz: 'Quyidagi menyudan foydalaning yoki /help buyrug‘ini yuboring 👇',
    ru: 'Воспользуйтесь меню ниже или отправьте команду /help 👇',
  },
  help: {
    uz: [
      '🏛 <b>Smart Murojaat AI — yordam</b>',
      '',
      '👤 <b>Fuqarolar uchun:</b>',
      '/new_appeal — yangi murojaat yuborish',
      '/my_appeals — mening murojaatlarim',
      '/status — murojaat holatini tekshirish',
      '/lang — tilni o‘zgartirish',
      '',
      '👔 <b>Xodimlar uchun:</b>',
      '/login — akkauntni bog‘lash',
      '/report yoki /hisobot — umumiy hisobot',
      '/today yoki /bugun — bugungi murojaatlar',
      '/overdue yoki /kechikkanlar — kechikayotganlar',
    ].join('\n'),
    ru: [
      '🏛 <b>Smart Murojaat AI — помощь</b>',
      '',
      '👤 <b>Для граждан:</b>',
      '/new_appeal — отправить новое обращение',
      '/my_appeals — мои обращения',
      '/status — проверить статус обращения',
      '/lang — сменить язык',
      '',
      '👔 <b>Для сотрудников:</b>',
      '/login — привязать аккаунт',
      '/report — общий отчёт',
      '/today — сегодняшние обращения',
      '/overdue — просроченные',
    ].join('\n'),
  },
  loginAskEmail: {
    uz: '👔 Xodim akkauntini bog‘lash.\n\nEmail manzilingizni yuboring:',
    ru: '👔 Привязка аккаунта сотрудника.\n\nОтправьте ваш email:',
  },
  loginAskPassword: {
    uz: '🔑 Parolingizni yuboring (xabar darhol o‘chiriladi):',
    ru: '🔑 Отправьте пароль (сообщение будет сразу удалено):',
  },
  loginSuccess: {
    uz: '✅ Akkaunt bog‘landi: <b>{name}</b> ({role})\n\nEndi /hisobot, /bugun, /kechikkanlar buyruqlaridan foydalanishingiz va yangi vazifalar haqida xabar olishingiz mumkin.',
    ru: '✅ Аккаунт привязан: <b>{name}</b> ({role})\n\nТеперь доступны команды /report, /today, /overdue, а также уведомления о новых задачах.',
  },
  loginError: { uz: '❌ Bog‘lashda xatolik.', ru: '❌ Ошибка привязки.' },
  staffOnly: {
    uz: 'Bu buyruq faqat xodimlar uchun. Avval /login orqali akkauntingizni bog‘lang.',
    ru: 'Эта команда только для сотрудников. Сначала привяжите аккаунт через /login.',
  },
  ratePrompt: {
    uz: '{num} murojaati bo‘yicha xizmatni baholang:',
    ru: 'Оцените качество услуги по обращению {num}:',
  },
  rateThanks: {
    uz: '🙏 Bahoyingiz uchun rahmat! Fikringiz xizmatni yaxshilashga yordam beradi.',
    ru: '🙏 Спасибо за оценку! Ваше мнение помогает улучшить сервис.',
  },
  rateError: { uz: 'Baholashda xatolik.', ru: 'Ошибка при оценке.' },
  reportHeader: { uz: '📊 <b>Hisobot</b> ({name})', ru: '📊 <b>Отчёт</b> ({name})' },
  reportTotal: { uz: 'Jami murojaatlar', ru: 'Всего обращений' },
  reportToday: { uz: 'Bugun kelib tushgan', ru: 'Поступило сегодня' },
  reportInProgress: { uz: 'Jarayonda', ru: 'В работе' },
  reportCompleted: { uz: 'Bajarilgan', ru: 'Выполнено' },
  reportOverdue: { uz: '⚠️ Kechikayotgan', ru: '⚠️ Просрочено' },
  reportUrgent: { uz: '🚨 Shoshilinch', ru: '🚨 Срочные' },
  reportRating: { uz: 'O‘rtacha baho', ru: 'Средняя оценка' },
  todayHeader: {
    uz: '📅 <b>Bugungi murojaatlar ({n} ta):</b>',
    ru: '📅 <b>Сегодняшние обращения ({n}):</b>',
  },
  todayEmpty: { uz: '📭 Bugun yangi murojaatlar yo‘q.', ru: '📭 Сегодня новых обращений нет.' },
  overdueHeader: {
    uz: '🔴 <b>Kechikayotgan murojaatlar ({n} ta):</b>',
    ru: '🔴 <b>Просроченные обращения ({n}):</b>',
  },
  overdueEmpty: {
    uz: '✅ Kechikayotgan murojaatlar yo‘q!',
    ru: '✅ Просроченных обращений нет!',
  },
  overdueAssignee: { uz: 'Mas’ul', ru: 'Ответственный' },
  unassigned: { uz: 'biriktirilmagan', ru: 'не назначен' },
} as const;

export type DictKey = keyof typeof DICT;

/** Tarjima: t('uz', 'created', { num: 'SM-...' }) */
export function t(lang: Lang, key: DictKey, params?: Record<string, string | number>): string {
  let text: string = DICT[key][lang] ?? DICT[key].uz;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

/** Status labelini tilga mos olish */
export function statusLabel(lang: Lang, status: string): string {
  const map = lang === 'ru' ? STATUS_LABELS_RU : STATUS_LABELS_UZ;
  return (map as Record<string, string>)[status] ?? status;
}

/** Menyu tugmalarining ikkala tildagi variantlari (hears uchun) */
export function menuVariants(key: 'menuNew' | 'menuMy' | 'menuTrack' | 'menuHelp'): string[] {
  return [DICT[key].uz, DICT[key].ru];
}

export function continueVariants(): string[] {
  return [DICT.continueBtn.uz, DICT.continueBtn.ru];
}
