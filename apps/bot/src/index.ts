/* eslint-disable no-console */
import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import { STATUS_LABELS_UZ } from '@smart/shared';
import { apiCall, ApiError, uploadAppealFiles } from './api';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN sozlanmagan. Bot ishga tushmaydi.');
  console.error('   .env faylida TELEGRAM_BOT_TOKEN=... qiymatini kiriting.');
  process.exit(1);
}

const bot = new Bot(token);

// ============ SESSIYA (oddiy in-memory holat mashinasi) ============

type Step =
  | 'idle'
  | 'lang'
  | 'phone'
  | 'category'
  | 'title'
  | 'description'
  | 'mahalla'
  | 'location'
  | 'media'
  | 'confirm'
  | 'track'
  | 'login_email'
  | 'login_password'
  | 'rate';

interface Session {
  step: Step;
  lang: 'uz' | 'ru';
  citizenName?: string;
  citizenPhone?: string;
  categoryId?: string;
  categoryName?: string;
  title?: string;
  description?: string;
  mahalla?: string;
  latitude?: number;
  longitude?: number;
  loginEmail?: string;
  rateNumber?: string;
  media?: { fileId: string; name: string; mime: string }[];
}

const sessions = new Map<string, Session>();

function getSession(chatId: string): Session {
  let s = sessions.get(chatId);
  if (!s) {
    s = { step: 'idle', lang: 'uz' };
    sessions.set(chatId, s);
  }
  return s;
}

const MAIN_MENU = new Keyboard()
  .text('📝 Yangi murojaat')
  .text('📋 Mening murojaatlarim')
  .row()
  .text('🔍 Holat tekshirish')
  .text('❓ Yordam')
  .resized()
  .persistent();

// ============ /start ============

bot.command('start', async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  s.step = 'lang';
  await ctx.reply(
    '🏛 <b>Smart Murojaat AI</b> botiga xush kelibsiz!\n\nTilni tanlang / Выберите язык:',
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text("🇺🇿 O'zbekcha", 'lang:uz').text('🇷🇺 Русский', 'lang:ru'),
    },
  );
});

bot.callbackQuery(/^lang:(uz|ru)$/, async (ctx) => {
  const s = getSession(String(ctx.chat!.id));
  s.lang = ctx.match[1] as 'uz' | 'ru';
  s.step = 'phone';
  await ctx.answerCallbackQuery();
  const text =
    s.lang === 'ru'
      ? 'Отправьте свой номер телефона (кнопка ниже) 👇'
      : 'Telefon raqamingizni yuboring (quyidagi tugma orqali) 👇';
  await ctx.reply(text, {
    reply_markup: new Keyboard()
      .requestContact(s.lang === 'ru' ? '📱 Отправить номер' : '📱 Raqamni yuborish')
      .resized()
      .oneTime(),
  });
});

bot.on('message:contact', async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  s.citizenPhone = ctx.message.contact.phone_number.startsWith('+')
    ? ctx.message.contact.phone_number
    : `+${ctx.message.contact.phone_number}`;
  s.citizenName = [ctx.message.contact.first_name, ctx.message.contact.last_name]
    .filter(Boolean)
    .join(' ');
  s.step = 'idle';
  await ctx.reply(
    `✅ Rahmat, <b>${s.citizenName}</b>!\n\nEndi murojaat yuborishingiz yoki mavjud murojaatingiz holatini tekshirishingiz mumkin.`,
    { parse_mode: 'HTML', reply_markup: MAIN_MENU },
  );
});

// ============ FUQARO: yangi murojaat ============

async function startNewAppeal(ctx: any) {
  const s = getSession(String(ctx.chat.id));
  if (!s.citizenPhone) {
    s.step = 'phone';
    await ctx.reply('Avval telefon raqamingizni yuboring 👇', {
      reply_markup: new Keyboard().requestContact('📱 Raqamni yuborish').resized().oneTime(),
    });
    return;
  }
  s.step = 'category';
  try {
    const cats = await apiCall<{ data: { id: string; name: string }[] }>(
      '/categories?limit=50&isActive=true',
    );
    const kb = new InlineKeyboard();
    cats.data.forEach((c, i) => {
      kb.text(c.name, `cat:${c.id}`);
      if (i % 2 === 1) kb.row();
    });
    kb.row().text('🤖 AI o‘zi aniqlasin', 'cat:auto');
    await ctx.reply('Murojaat yo‘nalishini tanlang:', { reply_markup: kb });
  } catch {
    s.step = 'title';
    await ctx.reply('Murojaat mavzusini qisqacha yozing:');
  }
}

bot.command('new_appeal', startNewAppeal);
bot.hears('📝 Yangi murojaat', startNewAppeal);

bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
  const s = getSession(String(ctx.chat!.id));
  if (s.step !== 'category') return ctx.answerCallbackQuery();
  const val = ctx.match[1];
  if (val !== 'auto') {
    s.categoryId = val;
    const btn = ctx.callbackQuery.message?.reply_markup?.inline_keyboard
      .flat()
      .find((b: any) => b.callback_data === `cat:${val}`);
    s.categoryName = (btn as any)?.text;
  }
  s.step = 'title';
  await ctx.answerCallbackQuery();
  await ctx.reply('✍️ Murojaat mavzusini qisqacha yozing (masalan: "Ko‘chada suv quvuri yorildi"):');
});

// ============ FUQARO: holat tekshirish / mening murojaatlarim ============

bot.command('status', async (ctx) => {
  getSession(String(ctx.chat.id)).step = 'track';
  await ctx.reply('🔍 Murojaat raqamini yuboring (masalan: SM-20260709-0001):');
});
bot.hears('🔍 Holat tekshirish', async (ctx) => {
  getSession(String(ctx.chat.id)).step = 'track';
  await ctx.reply('🔍 Murojaat raqamini yuboring (masalan: SM-20260709-0001):');
});

async function myAppeals(ctx: any) {
  try {
    const appeals = await apiCall<any[]>(`/telegram/citizen/${ctx.chat.id}/appeals`, {
      botAuth: true,
    });
    if (appeals.length === 0) {
      await ctx.reply('Sizda hali murojaatlar yo‘q. 📝 "Yangi murojaat" tugmasini bosing.', {
        reply_markup: MAIN_MENU,
      });
      return;
    }
    const lines = appeals.map(
      (a) =>
        `📋 <b>${a.appealNumber}</b>\n${a.title}\nHolat: ${
          (STATUS_LABELS_UZ as any)[a.status] ?? a.status
        }\n`,
    );
    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', reply_markup: MAIN_MENU });
  } catch (e) {
    await ctx.reply('Xatolik yuz berdi, keyinroq urinib ko‘ring.');
  }
}
bot.command('my_appeals', myAppeals);
bot.hears('📋 Mening murojaatlarim', myAppeals);

bot.command('help', async (ctx) => {
  await ctx.reply(
    [
      '🏛 <b>Smart Murojaat AI — yordam</b>',
      '',
      '👤 <b>Fuqarolar uchun:</b>',
      '/new_appeal — yangi murojaat yuborish',
      '/my_appeals — mening murojaatlarim',
      '/status — murojaat holatini tekshirish',
      '',
      '👔 <b>Xodimlar uchun:</b>',
      '/login — akkauntni bog‘lash',
      '/report yoki /hisobot — umumiy hisobot',
      '/today yoki /bugun — bugungi murojaatlar',
      '/overdue yoki /kechikkanlar — kechikayotganlar',
    ].join('\n'),
    { parse_mode: 'HTML' },
  );
});
bot.hears('❓ Yordam', (ctx) => ctx.reply('/help buyrug‘ini yuboring yoki menyudan foydalaning.', { reply_markup: MAIN_MENU }));

// ============ XODIM: login va hisobotlar ============

bot.command('login', async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  s.step = 'login_email';
  await ctx.reply('👔 Xodim akkauntini bog‘lash.\n\nEmail manzilingizni yuboring:');
});

async function staffSummary(ctx: any) {
  try {
    const { user, overview } = await apiCall<any>(`/telegram/staff/${ctx.chat.id}/summary`, {
      botAuth: true,
    });
    await ctx.reply(
      [
        `📊 <b>Hisobot</b> (${user.fullName})`,
        '',
        `Jami murojaatlar: <b>${overview.total}</b>`,
        `Bugun kelib tushgan: <b>${overview.today}</b>`,
        `Jarayonda: <b>${overview.inProgress}</b>`,
        `Bajarilgan: <b>${overview.completed}</b>`,
        `⚠️ Kechikayotgan: <b>${overview.overdue}</b>`,
        `🚨 Shoshilinch: <b>${overview.urgent}</b>`,
        `O‘rtacha baho: <b>${overview.avgRating ?? '—'}</b>`,
      ].join('\n'),
      { parse_mode: 'HTML' },
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await ctx.reply('Bu buyruq faqat xodimlar uchun. Avval /login orqali akkauntingizni bog‘lang.');
    } else {
      await ctx.reply('Xatolik yuz berdi, keyinroq urinib ko‘ring.');
    }
  }
}
bot.command(['report', 'hisobot'], staffSummary);

async function staffToday(ctx: any) {
  try {
    const appeals = await apiCall<any[]>(`/telegram/staff/${ctx.chat.id}/today`, { botAuth: true });
    if (appeals.length === 0) {
      await ctx.reply('📭 Bugun yangi murojaatlar yo‘q.');
      return;
    }
    const lines = appeals.map(
      (a) =>
        `• <b>${a.appealNumber}</b> — ${a.title}\n  ${(STATUS_LABELS_UZ as any)[a.status] ?? a.status} · ${a.category?.name ?? ''}`,
    );
    await ctx.reply(`📅 <b>Bugungi murojaatlar (${appeals.length} ta):</b>\n\n${lines.join('\n')}`, {
      parse_mode: 'HTML',
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await ctx.reply('Bu buyruq faqat xodimlar uchun. Avval /login orqali akkauntingizni bog‘lang.');
    } else {
      await ctx.reply('Xatolik yuz berdi.');
    }
  }
}
bot.command(['today', 'bugun'], staffToday);

async function staffOverdue(ctx: any) {
  try {
    const list = await apiCall<any[]>(`/telegram/staff/${ctx.chat.id}/overdue`, { botAuth: true });
    if (list.length === 0) {
      await ctx.reply('✅ Kechikayotgan murojaatlar yo‘q!');
      return;
    }
    const lines = list
      .slice(0, 15)
      .map(
        (a) =>
          `⚠️ <b>${a.appealNumber}</b> — ${a.title}\n  Mas’ul: ${a.assignedTo ?? 'biriktirilmagan'} · ${a.department ?? ''}`,
      );
    await ctx.reply(`🔴 <b>Kechikayotgan murojaatlar (${list.length} ta):</b>\n\n${lines.join('\n')}`, {
      parse_mode: 'HTML',
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await ctx.reply('Bu buyruq faqat xodimlar uchun. Avval /login orqali akkauntingizni bog‘lang.');
    } else {
      await ctx.reply('Xatolik yuz berdi.');
    }
  }
}
bot.command(['overdue', 'kechikkanlar'], staffOverdue);

// ============ Baholash: /baho_SM_20260709_0001 ============

bot.hears(/^\/baho_(.+)$/, async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  s.rateNumber = ctx.match[1].replace(/_/g, '-');
  s.step = 'rate';
  const kb = new InlineKeyboard();
  for (let i = 1; i <= 5; i++) kb.text('⭐'.repeat(i), `rate:${i}`);
  await ctx.reply(`${s.rateNumber} murojaati bo‘yicha xizmatni baholang:`, { reply_markup: kb });
});

bot.callbackQuery(/^rate:([1-5])$/, async (ctx) => {
  const s = getSession(String(ctx.chat!.id));
  await ctx.answerCallbackQuery();
  if (!s.rateNumber) return;
  try {
    await apiCall(`/appeals/track/${s.rateNumber}/rate`, {
      method: 'POST',
      body: { rating: Number(ctx.match[1]), chatId: String(ctx.chat!.id) },
    });
    await ctx.reply('🙏 Bahoyingiz uchun rahmat! Fikringiz xizmatni yaxshilashga yordam beradi.');
  } catch (e) {
    await ctx.reply(e instanceof ApiError ? e.message : 'Baholashda xatolik.');
  }
  s.rateNumber = undefined;
  s.step = 'idle';
});

// ============ Lokatsiya ============

bot.on('message:location', async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  if (s.step !== 'location') return;
  s.latitude = ctx.message.location.latitude;
  s.longitude = ctx.message.location.longitude;
  await askMedia(ctx, s);
});

// ============ Rasm / hujjat qabul qilish ============

async function askMedia(ctx: any, s: Session) {
  s.step = 'media';
  s.media = [];
  await ctx.reply(
    '📷 Muammoni tasdiqlovchi rasm, video yoki hujjat yuborishingiz mumkin (5 tagacha, ixtiyoriy).\n\nTugatgach "➡️ Davom etish" tugmasini bosing:',
    { reply_markup: new Keyboard().text('➡️ Davom etish').resized().oneTime() },
  );
}

bot.on('message:photo', async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  if (s.step !== 'media') return;
  const sizes = ctx.message.photo;
  const best = sizes[sizes.length - 1];
  s.media = s.media ?? [];
  if (s.media.length >= 5) {
    await ctx.reply('Maksimal 5 ta fayl. "➡️ Davom etish" tugmasini bosing.');
    return;
  }
  s.media.push({ fileId: best.file_id, name: `photo_${s.media.length + 1}.jpg`, mime: 'image/jpeg' });
  await ctx.reply(`✅ Rasm qabul qilindi (${s.media.length}/5). Yana yuborishingiz yoki davom etishingiz mumkin.`);
});

bot.on('message:video', async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  if (s.step !== 'media') return;
  s.media = s.media ?? [];
  if (s.media.length >= 5) return;
  s.media.push({
    fileId: ctx.message.video.file_id,
    name: `video_${s.media.length + 1}.mp4`,
    mime: 'video/mp4',
  });
  await ctx.reply(`✅ Video qabul qilindi (${s.media.length}/5).`);
});

bot.on('message:document', async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  if (s.step !== 'media') return;
  s.media = s.media ?? [];
  if (s.media.length >= 5) return;
  const doc = ctx.message.document;
  s.media.push({
    fileId: doc.file_id,
    name: doc.file_name ?? `hujjat_${s.media.length + 1}`,
    mime: doc.mime_type ?? 'application/pdf',
  });
  await ctx.reply(`✅ Hujjat qabul qilindi (${s.media.length}/5).`);
});

/** Telegram serveridan faylni yuklab olish */
async function downloadTelegramFile(fileId: string): Promise<ArrayBuffer | null> {
  try {
    const file = await bot.api.getFile(fileId);
    if (!file.file_path) return null;
    const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function confirmAppeal(ctx: any, s: Session) {
  s.step = 'confirm';
  await ctx.reply(
    [
      '📋 <b>Murojaatni tasdiqlang:</b>',
      '',
      `👤 ${s.citizenName} (${s.citizenPhone})`,
      `📌 Mavzu: ${s.title}`,
      `📝 ${s.description}`,
      `🏘 Mahalla: ${s.mahalla ?? '—'}`,
      `📂 Yo‘nalish: ${s.categoryName ?? 'AI aniqlaydi'}`,
      s.latitude ? `📍 Lokatsiya: yuborildi` : '📍 Lokatsiya: yo‘q',
      `📎 Fayllar: ${s.media?.length ?? 0} ta`,
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('✅ Yuborish', 'confirm:yes')
        .text('❌ Bekor qilish', 'confirm:no'),
    },
  );
}

bot.callbackQuery(/^confirm:(yes|no)$/, async (ctx) => {
  const s = getSession(String(ctx.chat!.id));
  await ctx.answerCallbackQuery();
  if (ctx.match[1] === 'no' || s.step !== 'confirm') {
    s.step = 'idle';
    await ctx.reply('Murojaat bekor qilindi.', { reply_markup: MAIN_MENU });
    return;
  }
  try {
    const created = await apiCall<any>('/appeals/public', {
      method: 'POST',
      body: {
        title: s.title,
        description: s.description,
        citizenName: s.citizenName,
        citizenPhone: s.citizenPhone,
        categoryId: s.categoryId,
        mahalla: s.mahalla,
        latitude: s.latitude,
        longitude: s.longitude,
        source: 'TELEGRAM',
        citizenTelegramChatId: String(ctx.chat!.id),
      },
    });

    // Rasmlar/hujjatlarni Telegramdan yuklab olib, murojaatga biriktiramiz
    if (s.media?.length) {
      const files: { buffer: ArrayBuffer; name: string; mime: string }[] = [];
      for (const m of s.media) {
        const buffer = await downloadTelegramFile(m.fileId);
        if (buffer) files.push({ buffer, name: m.name, mime: m.mime });
      }
      if (files.length) {
        await uploadAppealFiles(created.id, files).catch((e) =>
          console.warn('Fayl biriktirishda xato:', e.message),
        );
      }
    }

    await ctx.reply(
      [
        '✅ <b>Murojaatingiz qabul qilindi!</b>',
        '',
        `📋 Murojaat raqami: <b>${created.appealNumber}</b>`,
        '',
        'Murojaatingiz AI yordamida tahlil qilinib, mas’ul bo‘limga yo‘naltiriladi.',
        'Holat o‘zgarishi haqida shu yerda xabar olasiz. 🔔',
      ].join('\n'),
      { parse_mode: 'HTML', reply_markup: MAIN_MENU },
    );
  } catch (e) {
    await ctx.reply(
      e instanceof ApiError ? `❌ ${e.message}` : '❌ Yuborishda xatolik. Keyinroq urinib ko‘ring.',
      { reply_markup: MAIN_MENU },
    );
  }
  // Sessiyani tozalash (telefon saqlanadi)
  s.step = 'idle';
  s.title = s.description = s.mahalla = s.categoryId = s.categoryName = undefined;
  s.latitude = s.longitude = undefined;
  s.media = undefined;
});

// ============ Matnli xabarlar (holat mashinasi) ============

bot.on('message:text', async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return;

  switch (s.step) {
    case 'title':
      s.title = text.slice(0, 300);
      s.step = 'description';
      await ctx.reply('📝 Endi muammoni batafsil yozing (qachondan beri, qayerda, kimlarga ta’sir qilmoqda):');
      break;
    case 'description':
      if (text.length < 10) {
        await ctx.reply('Iltimos, kamida 10 belgidan iborat batafsil tavsif yozing.');
        return;
      }
      s.description = text.slice(0, 5000);
      s.step = 'mahalla';
      await ctx.reply('🏘 Mahalla nomini yozing (yoki "-" deb yuboring):');
      break;
    case 'mahalla':
      s.mahalla = text === '-' ? undefined : text;
      s.step = 'location';
      await ctx.reply('📍 Joylashuvni yuboring (skrepka → Lokatsiya) yoki "-" deb yozing:', {
        reply_markup: new Keyboard().requestLocation('📍 Lokatsiyani yuborish').text('-').resized().oneTime(),
      });
      break;
    case 'location':
      await askMedia(ctx, s);
      break;
    case 'media':
      await confirmAppeal(ctx, s);
      break;
    case 'track':
      s.step = 'idle';
      try {
        const a = await apiCall<any>(`/appeals/track/${encodeURIComponent(text)}`);
        await ctx.reply(
          [
            `📋 <b>${a.appealNumber}</b>`,
            a.title,
            '',
            `Holat: <b>${(STATUS_LABELS_UZ as any)[a.status] ?? a.status}</b>`,
            `Yo‘nalish: ${a.category?.name ?? '—'}`,
            `Bo‘lim: ${a.department?.name ?? '—'}`,
            a.deadlineAt ? `Muddat: ${new Date(a.deadlineAt).toLocaleString('uz-UZ')}` : '',
            ...(a.comments?.length ? ['', '💬 Oxirgi javob:', a.comments[0].message] : []),
          ]
            .filter(Boolean)
            .join('\n'),
          { parse_mode: 'HTML', reply_markup: MAIN_MENU },
        );
      } catch (e) {
        await ctx.reply(
          e instanceof ApiError ? `❌ ${e.message}` : 'Topilmadi. Raqamni tekshirib qayta yuboring.',
          { reply_markup: MAIN_MENU },
        );
      }
      break;
    case 'login_email':
      s.loginEmail = text;
      s.step = 'login_password';
      await ctx.reply('🔑 Parolingizni yuboring (xabar darhol o‘chiriladi):');
      break;
    case 'login_password': {
      s.step = 'idle';
      try {
        await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
      } catch {
        /* ignore */
      }
      try {
        const res = await apiCall<any>('/auth/telegram-link', {
          method: 'POST',
          botAuth: true,
          body: { identifier: s.loginEmail, password: text, chatId: String(ctx.chat.id) },
        });
        await ctx.reply(
          `✅ Akkaunt bog‘landi: <b>${res.user.fullName}</b> (${res.user.role})\n\nEndi /hisobot, /bugun, /kechikkanlar buyruqlaridan foydalanishingiz va yangi vazifalar haqida xabar olishingiz mumkin.`,
          { parse_mode: 'HTML' },
        );
      } catch (e) {
        await ctx.reply(e instanceof ApiError ? `❌ ${e.message}` : '❌ Bog‘lashda xatolik.');
      }
      s.loginEmail = undefined;
      break;
    }
    default:
      await ctx.reply('Quyidagi menyudan foydalaning yoki /help buyrug‘ini yuboring 👇', {
        reply_markup: MAIN_MENU,
      });
  }
});

// ============ Ishga tushirish ============

bot.api
  .setMyCommands([
    { command: 'start', description: 'Botni ishga tushirish' },
    { command: 'new_appeal', description: 'Yangi murojaat yuborish' },
    { command: 'my_appeals', description: 'Mening murojaatlarim' },
    { command: 'status', description: 'Murojaat holatini tekshirish' },
    { command: 'help', description: 'Yordam' },
    { command: 'login', description: 'Xodim akkauntini bog‘lash' },
    { command: 'report', description: 'Hisobot (xodimlar)' },
    { command: 'today', description: 'Bugungi murojaatlar (xodimlar)' },
    { command: 'overdue', description: 'Kechikkan murojaatlar (xodimlar)' },
  ])
  .catch((e) => console.warn('setMyCommands xatosi:', e.message));

bot.catch((err) => {
  console.error('Bot xatosi:', err.error);
});

console.log('🤖 Smart Murojaat AI bot ishga tushmoqda...');
bot.start();
