/* eslint-disable no-console */
import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import { apiCall, ApiError, uploadAppealFiles } from './api';
import { continueVariants, Lang, menuVariants, statusLabel, t } from './i18n';

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
  | 'ai_chat'
  | 'login_email'
  | 'login_password'
  | 'rate';

interface Session {
  step: Step;
  lang: Lang;
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

function mainMenu(lang: Lang) {
  return new Keyboard()
    .text(t(lang, 'menuNew'))
    .text(t(lang, 'menuMy'))
    .row()
    .text(t(lang, 'menuTrack'))
    .text(t(lang, 'menuAi'))
    .row()
    .text(t(lang, 'menuHelp'))
    .resized()
    .persistent();
}

// ============ /start va til tanlash ============

async function askLanguage(ctx: any) {
  const s = getSession(String(ctx.chat.id));
  s.step = 'lang';
  await ctx.reply(t(s.lang, 'welcome'), {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text("🇺🇿 O'zbekcha", 'lang:uz').text('🇷🇺 Русский', 'lang:ru'),
  });
}

bot.command('start', askLanguage);
bot.command('lang', askLanguage);

bot.callbackQuery(/^lang:(uz|ru)$/, async (ctx) => {
  const s = getSession(String(ctx.chat!.id));
  s.lang = ctx.match[1] as Lang;
  await ctx.answerCallbackQuery();
  if (s.citizenPhone) {
    s.step = 'idle';
    await ctx.reply(t(s.lang, 'registered', { name: s.citizenName ?? '' }), {
      parse_mode: 'HTML',
      reply_markup: mainMenu(s.lang),
    });
    return;
  }
  s.step = 'phone';
  await ctx.reply(t(s.lang, 'sendPhone'), {
    reply_markup: new Keyboard().requestContact(t(s.lang, 'sendPhoneBtn')).resized().oneTime(),
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
  await ctx.reply(t(s.lang, 'registered', { name: s.citizenName }), {
    parse_mode: 'HTML',
    reply_markup: mainMenu(s.lang),
  });
});

// ============ FUQARO: yangi murojaat ============

async function startNewAppeal(ctx: any) {
  const s = getSession(String(ctx.chat.id));
  if (!s.citizenPhone) {
    s.step = 'phone';
    await ctx.reply(t(s.lang, 'sendPhone'), {
      reply_markup: new Keyboard().requestContact(t(s.lang, 'sendPhoneBtn')).resized().oneTime(),
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
    kb.row().text(t(s.lang, 'categoryAuto'), 'cat:auto');
    await ctx.reply(t(s.lang, 'chooseCategory'), { reply_markup: kb });
  } catch {
    s.step = 'title';
    await ctx.reply(t(s.lang, 'askTitle'));
  }
}

bot.command('new_appeal', startNewAppeal);
bot.hears(menuVariants('menuNew'), startNewAppeal);

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
  await ctx.reply(t(s.lang, 'askTitle'));
});

// ============ FUQARO: holat tekshirish / mening murojaatlarim ============

async function askTrack(ctx: any) {
  const s = getSession(String(ctx.chat.id));
  s.step = 'track';
  await ctx.reply(t(s.lang, 'askTrackNumber'));
}
bot.command('status', askTrack);
bot.hears(menuVariants('menuTrack'), askTrack);

async function myAppeals(ctx: any) {
  const s = getSession(String(ctx.chat.id));
  try {
    const appeals = await apiCall<any[]>(`/telegram/citizen/${ctx.chat.id}/appeals`, {
      botAuth: true,
    });
    if (appeals.length === 0) {
      await ctx.reply(t(s.lang, 'noAppeals', { btn: t(s.lang, 'menuNew') }), {
        reply_markup: mainMenu(s.lang),
      });
      return;
    }
    const lines = appeals.map(
      (a) =>
        `📋 <b>${a.appealNumber}</b>\n${a.title}\n${t(s.lang, 'trackStatus')}: ${statusLabel(
          s.lang,
          a.status,
        )}\n`,
    );
    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', reply_markup: mainMenu(s.lang) });
  } catch {
    await ctx.reply(t(s.lang, 'genericError'));
  }
}
bot.command('my_appeals', myAppeals);
bot.hears(menuVariants('menuMy'), myAppeals);

// ============ AI suhbat ============

async function startAiChat(ctx: any) {
  const s = getSession(String(ctx.chat.id));
  s.step = 'ai_chat';
  await ctx.reply(t(s.lang, 'askAiQuestion'));
}
bot.command('savol', startAiChat);
bot.hears(menuVariants('menuAi'), startAiChat);

// ============ Xodim: tasdiqlash/rad etish (inline tugmalar) ============

bot.callbackQuery(/^(apr|rej):(.+)$/, async (ctx) => {
  const s = getSession(String(ctx.chat!.id));
  const [, action, appealId] = ctx.match;
  await ctx.answerCallbackQuery();
  try {
    await apiCall(`/telegram/appeals/${appealId}/bot-action`, {
      method: 'POST',
      botAuth: true,
      body: {
        chatId: String(ctx.chat!.id),
        action: action === 'apr' ? 'approve' : 'reject',
      },
    });
    await ctx.reply(t(s.lang, action === 'apr' ? 'actionApproved' : 'actionRejected'));
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch {
      /* ignore */
    }
  } catch (e) {
    await ctx.reply(e instanceof ApiError ? `❌ ${e.message}` : t(s.lang, 'actionError'));
  }
});

bot.command('help', async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  await ctx.reply(t(s.lang, 'help'), { parse_mode: 'HTML' });
});
bot.hears(menuVariants('menuHelp'), async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  await ctx.reply(t(s.lang, 'help'), { parse_mode: 'HTML', reply_markup: mainMenu(s.lang) });
});

// ============ XODIM: login va hisobotlar ============

bot.command('login', async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  s.step = 'login_email';
  await ctx.reply(t(s.lang, 'loginAskEmail'));
});

async function staffSummary(ctx: any) {
  const s = getSession(String(ctx.chat.id));
  try {
    const { user, overview } = await apiCall<any>(`/telegram/staff/${ctx.chat.id}/summary`, {
      botAuth: true,
    });
    await ctx.reply(
      [
        t(s.lang, 'reportHeader', { name: user.fullName }),
        '',
        `${t(s.lang, 'reportTotal')}: <b>${overview.total}</b>`,
        `${t(s.lang, 'reportToday')}: <b>${overview.today}</b>`,
        `${t(s.lang, 'reportInProgress')}: <b>${overview.inProgress}</b>`,
        `${t(s.lang, 'reportCompleted')}: <b>${overview.completed}</b>`,
        `${t(s.lang, 'reportOverdue')}: <b>${overview.overdue}</b>`,
        `${t(s.lang, 'reportUrgent')}: <b>${overview.urgent}</b>`,
        `${t(s.lang, 'reportRating')}: <b>${overview.avgRating ?? '—'}</b>`,
      ].join('\n'),
      { parse_mode: 'HTML' },
    );
  } catch (e) {
    await ctx.reply(
      e instanceof ApiError && e.status === 404 ? t(s.lang, 'staffOnly') : t(s.lang, 'genericError'),
    );
  }
}
bot.command(['report', 'hisobot'], staffSummary);

async function staffToday(ctx: any) {
  const s = getSession(String(ctx.chat.id));
  try {
    const appeals = await apiCall<any[]>(`/telegram/staff/${ctx.chat.id}/today`, { botAuth: true });
    if (appeals.length === 0) {
      await ctx.reply(t(s.lang, 'todayEmpty'));
      return;
    }
    const lines = appeals.map(
      (a) =>
        `• <b>${a.appealNumber}</b> — ${a.title}\n  ${statusLabel(s.lang, a.status)} · ${a.category?.name ?? ''}`,
    );
    await ctx.reply(`${t(s.lang, 'todayHeader', { n: appeals.length })}\n\n${lines.join('\n')}`, {
      parse_mode: 'HTML',
    });
  } catch (e) {
    await ctx.reply(
      e instanceof ApiError && e.status === 404 ? t(s.lang, 'staffOnly') : t(s.lang, 'genericError'),
    );
  }
}
bot.command(['today', 'bugun'], staffToday);

async function staffOverdue(ctx: any) {
  const s = getSession(String(ctx.chat.id));
  try {
    const list = await apiCall<any[]>(`/telegram/staff/${ctx.chat.id}/overdue`, { botAuth: true });
    if (list.length === 0) {
      await ctx.reply(t(s.lang, 'overdueEmpty'));
      return;
    }
    const lines = list
      .slice(0, 15)
      .map(
        (a) =>
          `⚠️ <b>${a.appealNumber}</b> — ${a.title}\n  ${t(s.lang, 'overdueAssignee')}: ${
            a.assignedTo ?? t(s.lang, 'unassigned')
          } · ${a.department ?? ''}`,
      );
    await ctx.reply(`${t(s.lang, 'overdueHeader', { n: list.length })}\n\n${lines.join('\n')}`, {
      parse_mode: 'HTML',
    });
  } catch (e) {
    await ctx.reply(
      e instanceof ApiError && e.status === 404 ? t(s.lang, 'staffOnly') : t(s.lang, 'genericError'),
    );
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
  await ctx.reply(t(s.lang, 'ratePrompt', { num: s.rateNumber }), { reply_markup: kb });
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
    await ctx.reply(t(s.lang, 'rateThanks'));
  } catch (e) {
    await ctx.reply(e instanceof ApiError ? e.message : t(s.lang, 'rateError'));
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
  await ctx.reply(t(s.lang, 'askMedia', { btn: t(s.lang, 'continueBtn') }), {
    reply_markup: new Keyboard().text(t(s.lang, 'continueBtn')).resized().oneTime(),
  });
}

bot.on('message:photo', async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  if (s.step !== 'media') return;
  const sizes = ctx.message.photo;
  const best = sizes[sizes.length - 1];
  s.media = s.media ?? [];
  if (s.media.length >= 5) {
    await ctx.reply(t(s.lang, 'mediaLimit', { btn: t(s.lang, 'continueBtn') }));
    return;
  }
  s.media.push({ fileId: best.file_id, name: `photo_${s.media.length + 1}.jpg`, mime: 'image/jpeg' });
  await ctx.reply(t(s.lang, 'photoAccepted', { n: s.media.length }));
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
  await ctx.reply(t(s.lang, 'videoAccepted', { n: s.media.length }));
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
  await ctx.reply(t(s.lang, 'docAccepted', { n: s.media.length }));
});

// Ovozli izoh (Telegram voice = OGG/OPUS)
bot.on('message:voice', async (ctx) => {
  const s = getSession(String(ctx.chat.id));
  if (s.step !== 'media') return;
  s.media = s.media ?? [];
  if (s.media.length >= 5) return;
  s.media.push({
    fileId: ctx.message.voice.file_id,
    name: `ovozli_izoh_${s.media.length + 1}.ogg`,
    mime: 'audio/ogg',
  });
  await ctx.reply(t(s.lang, 'voiceAccepted', { n: s.media.length }));
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

// ============ Tasdiqlash va yuborish ============

async function confirmAppeal(ctx: any, s: Session) {
  s.step = 'confirm';
  await ctx.reply(
    [
      t(s.lang, 'confirmHeader'),
      '',
      `👤 ${s.citizenName} (${s.citizenPhone})`,
      `${t(s.lang, 'confirmTopic')}: ${s.title}`,
      `📝 ${s.description}`,
      `${t(s.lang, 'confirmMahalla')}: ${s.mahalla ?? '—'}`,
      `${t(s.lang, 'confirmCategory')}: ${s.categoryName ?? t(s.lang, 'confirmCategoryAuto')}`,
      s.latitude ? t(s.lang, 'confirmLocationSent') : t(s.lang, 'confirmLocationNone'),
      t(s.lang, 'confirmFiles', { n: s.media?.length ?? 0 }),
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text(t(s.lang, 'confirmSendBtn'), 'confirm:yes')
        .text(t(s.lang, 'confirmCancelBtn'), 'confirm:no'),
    },
  );
}

bot.callbackQuery(/^confirm:(yes|no)$/, async (ctx) => {
  const s = getSession(String(ctx.chat!.id));
  await ctx.answerCallbackQuery();
  if (ctx.match[1] === 'no' || s.step !== 'confirm') {
    s.step = 'idle';
    await ctx.reply(t(s.lang, 'cancelled'), { reply_markup: mainMenu(s.lang) });
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

    await ctx.reply(t(s.lang, 'created', { num: created.appealNumber }), {
      parse_mode: 'HTML',
      reply_markup: mainMenu(s.lang),
    });
  } catch (e) {
    await ctx.reply(
      e instanceof ApiError ? `❌ ${e.message}` : t(s.lang, 'createError'),
      { reply_markup: mainMenu(s.lang) },
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
      await ctx.reply(t(s.lang, 'askDescription'));
      break;
    case 'description':
      if (text.length < 10) {
        await ctx.reply(t(s.lang, 'descriptionTooShort'));
        return;
      }
      s.description = text.slice(0, 5000);
      s.step = 'mahalla';
      await ctx.reply(t(s.lang, 'askMahalla'));
      break;
    case 'mahalla':
      s.mahalla = text === '-' ? undefined : text;
      s.step = 'location';
      await ctx.reply(t(s.lang, 'askLocation'), {
        reply_markup: new Keyboard()
          .requestLocation(t(s.lang, 'sendLocationBtn'))
          .text('-')
          .resized()
          .oneTime(),
      });
      break;
    case 'location':
      await askMedia(ctx, s);
      break;
    case 'media':
      if (text === '-' || continueVariants().includes(text)) {
        await confirmAppeal(ctx, s);
      }
      break;
    case 'ai_chat': {
      s.step = 'idle';
      const thinking = await ctx.reply(t(s.lang, 'aiThinking'));
      try {
        const res = await apiCall<{ answer: string }>('/telegram/ai-chat', {
          method: 'POST',
          botAuth: true,
          body: { question: text, lang: s.lang },
        });
        await ctx.api.editMessageText(ctx.chat.id, thinking.message_id, `🤖 ${res.answer}`);
      } catch {
        await ctx.api.editMessageText(ctx.chat.id, thinking.message_id, t(s.lang, 'aiError'));
      }
      break;
    }
    case 'track':
      s.step = 'idle';
      try {
        const a = await apiCall<any>(`/appeals/track/${encodeURIComponent(text)}`);
        await ctx.reply(
          [
            `📋 <b>${a.appealNumber}</b>`,
            a.title,
            '',
            `${t(s.lang, 'trackStatus')}: <b>${statusLabel(s.lang, a.status)}</b>`,
            `${t(s.lang, 'trackCategory')}: ${a.category?.name ?? '—'}`,
            `${t(s.lang, 'trackDepartment')}: ${a.department?.name ?? '—'}`,
            a.deadlineAt
              ? `${t(s.lang, 'trackDeadline')}: ${new Date(a.deadlineAt).toLocaleString(
                  s.lang === 'ru' ? 'ru-RU' : 'uz-UZ',
                )}`
              : '',
            ...(a.comments?.length ? ['', t(s.lang, 'trackLastReply'), a.comments[0].message] : []),
          ]
            .filter(Boolean)
            .join('\n'),
          { parse_mode: 'HTML', reply_markup: mainMenu(s.lang) },
        );
      } catch (e) {
        await ctx.reply(
          e instanceof ApiError ? `❌ ${e.message}` : t(s.lang, 'trackNotFound'),
          { reply_markup: mainMenu(s.lang) },
        );
      }
      break;
    case 'login_email':
      s.loginEmail = text;
      s.step = 'login_password';
      await ctx.reply(t(s.lang, 'loginAskPassword'));
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
        await ctx.reply(t(s.lang, 'loginSuccess', { name: res.user.fullName, role: res.user.role }), {
          parse_mode: 'HTML',
        });
      } catch (e) {
        await ctx.reply(e instanceof ApiError ? `❌ ${e.message}` : t(s.lang, 'loginError'));
      }
      s.loginEmail = undefined;
      break;
    }
    default:
      await ctx.reply(t(s.lang, 'useMenu'), { reply_markup: mainMenu(s.lang) });
  }
});

// ============ Ishga tushirish ============

bot.api
  .setMyCommands([
    { command: 'start', description: 'Botni ishga tushirish / Запуск бота' },
    { command: 'new_appeal', description: 'Yangi murojaat / Новое обращение' },
    { command: 'my_appeals', description: 'Mening murojaatlarim / Мои обращения' },
    { command: 'status', description: 'Holat tekshirish / Проверить статус' },
    { command: 'savol', description: 'AI yordamchiga savol / Вопрос ИИ' },
    { command: 'lang', description: 'Tilni o‘zgartirish / Сменить язык' },
    { command: 'help', description: 'Yordam / Помощь' },
    { command: 'login', description: 'Xodim akkauntini bog‘lash / Привязать аккаунт' },
    { command: 'report', description: 'Hisobot (xodimlar) / Отчёт' },
    { command: 'today', description: 'Bugungi murojaatlar / Сегодняшние' },
    { command: 'overdue', description: 'Kechikkanlar / Просроченные' },
  ])
  .catch((e) => console.warn('setMyCommands xatosi:', e.message));

bot.catch((err) => {
  console.error('Bot xatosi:', err.error);
});

// ============ Ishga tushirish: webhook (production) yoki long-polling (dev) ============

const webhookUrl = process.env.BOT_WEBHOOK_URL;
if (webhookUrl) {
  // Production: Telegram webhook -> HTTP server (masshtablanadi, nginx orqasida)
  import('http').then(async ({ createServer }) => {
    const { webhookCallback } = await import('grammy');
    const secretPath = `/telegram/webhook/${process.env.BOT_API_SECRET || 'hook'}`;
    const handle = webhookCallback(bot, 'http');
    const port = parseInt(process.env.BOT_WEBHOOK_PORT || '3002', 10);
    createServer((req, res) => {
      if (req.method === 'POST' && req.url === secretPath) {
        return handle(req, res);
      }
      res.writeHead(req.url === '/health' ? 200 : 404).end(
        req.url === '/health' ? 'ok' : 'not found',
      );
    }).listen(port, async () => {
      await bot.api.setWebhook(`${webhookUrl.replace(/\/$/, '')}${secretPath}`);
      console.log(`🤖 Bot webhook rejimida: ${webhookUrl}${secretPath} (port ${port})`);
    });
  });
} else {
  console.log('🤖 Smart Murojaat AI bot long-polling rejimida ishga tushmoqda...');
  bot.start();
}
