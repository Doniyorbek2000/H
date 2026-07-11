import { Injectable, Logger } from '@nestjs/common';
import { AppealPriority } from '@prisma/client';
import { AiAnalysisResult } from '@smart/shared';
import { AuditService } from '../audit/audit.service';
import {
  buildAnalyzePrompt,
  buildCitizenResponsePrompt,
  buildLeaderReportPrompt,
} from './prompts';

interface AnalyzeInput {
  title: string;
  text: string;
  region?: string | null;
  district?: string | null;
  mahalla?: string | null;
  categories: string[];
  departments: string[];
}

/** Kalit so'z -> kategoriya (Gemini ishlamaganda fallback tasniflash) */
const KEYWORD_CATEGORY_MAP: [RegExp, string, AppealPriority][] = [
  [/suv|vodoprovod|kanalizatsiya|quvur/i, 'Suv', AppealPriority.HIGH],
  [/gaz|gaz ta.minot/i, 'Gaz', AppealPriority.HIGH],
  [/elektr|svet|chiroq|энергия|tok/i, 'Elektr', AppealPriority.HIGH],
  [/yo.l|asfalt|ko.cha|chuqur|yol/i, 'Yo‘l', AppealPriority.MEDIUM],
  [/chiqindi|axlat|musor|tozalik/i, 'Chiqindi', AppealPriority.MEDIUM],
  [/qurilish|obodonlashtirish|remont|ta.mirlash/i, 'Qurilish', AppealPriority.MEDIUM],
  [/\bish\b|bandlik|ishsiz/i, 'Bandlik', AppealPriority.MEDIUM],
  [/tadbirkor|biznes|kredit/i, 'Tadbirkorlik', AppealPriority.MEDIUM],
  [/nafaqa|yordam|nogiron|kam ta.minlangan|ijtimoiy/i, 'Ijtimoiy yordam', AppealPriority.MEDIUM],
  [/maktab|bog.cha|ta.lim|o.qituvchi/i, 'Ta’lim', AppealPriority.MEDIUM],
  [/shifoxona|poliklinika|dori|shifokor|sog.liq/i, 'Sog‘liqni saqlash', AppealPriority.HIGH],
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly audit: AuditService) {}

  private get apiKey(): string | undefined {
    return process.env.GEMINI_API_KEY || undefined;
  }

  private get model(): string {
    return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Gemini generateContent chaqiruvi — timeout + eksponensial retry bilan.
   * Vaqtincha xatolar (429/5xx/tarmoq) uchun 3 martagacha qayta urinadi.
   * Yakuniy xatoda null qaytaradi — tizim fallbackka o'tadi, to'xtamaydi.
   */
  private async callGemini(prompt: string, jsonMode = false): Promise<string | null> {
    if (!this.apiKey) return null;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    };
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data: any = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          return typeof text === 'string' ? text : null;
        }
        // Vaqtincha xato (429/5xx) -> retry; doimiy (4xx) -> darhol to'xtash
        const retriable = res.status === 429 || res.status >= 500;
        this.logger.warn(`Gemini ${res.status} (urinish ${attempt}/${maxAttempts})`);
        if (!retriable || attempt === maxAttempts) return null;
      } catch (e) {
        clearTimeout(timer);
        this.logger.warn(`Gemini xato ${attempt}/${maxAttempts}: ${(e as Error).message}`);
        if (attempt === maxAttempts) return null;
      }
      // Eksponensial backoff: 0.5s, 1s
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
    }
    return null;
  }

  /** JSON javobni xavfsiz parse qilish (markdown code fence bo'lsa ham) */
  private parseJson<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
      const cleaned = raw
        .trim()
        .replace(/^```(json)?/i, '')
        .replace(/```$/, '')
        .trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start === -1 || end === -1) return null;
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }

  /** Fallback: kalit so'zga asoslangan sodda tahlil (Gemini ishlamasa) */
  private fallbackAnalyze(input: AnalyzeInput): AiAnalysisResult {
    const text = `${input.title} ${input.text}`;
    let category = 'Boshqa';
    let priority: AppealPriority = AppealPriority.MEDIUM;
    const keywords: string[] = [];
    for (const [re, cat, prio] of KEYWORD_CATEGORY_MAP) {
      const m = text.match(re);
      if (m) {
        category = cat;
        priority = prio;
        keywords.push(m[0].toLowerCase());
        break;
      }
    }
    const urgentWords = /avariya|portlash|yong.in|o.lim|xavf|shoshilinch|favqulodda/i;
    if (urgentWords.test(text)) priority = AppealPriority.URGENT;

    const missingInfo: string[] = [];
    if (!input.mahalla) missingInfo.push('mahalla nomi');
    if (text.length < 40) missingInfo.push('muammoning batafsil tavsifi');

    return {
      summary: input.text.length > 200 ? `${input.text.slice(0, 200)}…` : input.text,
      category,
      priority,
      departmentSuggestion: input.departments[0] ?? 'Kommunal xizmatlar',
      // 0 -> muddatni kategoriya/tashkilot sozlamasi belgilaydi
      deadlineHours: 0,
      sentiment: urgentWords.test(text) ? 'urgent' : 'neutral',
      missingInfo,
      responseDraft:
        'Hurmatli fuqaro! Murojaatingiz qabul qilindi va mas’ul bo‘limga yo‘naltirildi. Belgilangan muddatda ko‘rib chiqilib, sizga javob beriladi.',
      keywords,
    };
  }

  /** Murojaatni tahlil qilish: Gemini yoki fallback */
  async analyzeAppeal(input: AnalyzeInput): Promise<AiAnalysisResult & { engine: string }> {
    const prompt = buildAnalyzePrompt({
      text: input.text,
      title: input.title,
      region: input.region,
      district: input.district,
      mahalla: input.mahalla,
      categories: input.categories,
      departments: input.departments,
    });
    const raw = await this.callGemini(prompt, true);
    const parsed = this.parseJson<Partial<AiAnalysisResult>>(raw);
    if (parsed && parsed.summary) {
      const priority = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(String(parsed.priority))
        ? (parsed.priority as AppealPriority)
        : AppealPriority.MEDIUM;
      const result = {
        summary: String(parsed.summary),
        category: String(parsed.category ?? 'Boshqa'),
        priority,
        departmentSuggestion: String(parsed.departmentSuggestion ?? ''),
        deadlineHours: Number(parsed.deadlineHours) > 0 ? Number(parsed.deadlineHours) : 0,
        sentiment: (['neutral', 'angry', 'positive', 'urgent'].includes(String(parsed.sentiment))
          ? parsed.sentiment
          : 'neutral') as AiAnalysisResult['sentiment'],
        missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo.map(String) : [],
        responseDraft: String(parsed.responseDraft ?? ''),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
        engine: `gemini:${this.model}`,
      };
      await this.audit.log({
        action: 'AI_ANALYZE',
        entity: 'Appeal',
        newValue: { engine: result.engine, category: result.category, priority: result.priority },
      });
      return result;
    }
    const fallback = { ...this.fallbackAnalyze(input), engine: 'fallback:keywords' };
    await this.audit.log({
      action: 'AI_ANALYZE_FALLBACK',
      entity: 'Appeal',
      newValue: { engine: fallback.engine, category: fallback.category },
    });
    return fallback;
  }

  /** Fuqaroga rasmiy javob loyihasi */
  async generateCitizenResponse(appeal: {
    title: string;
    description: string;
    status: string;
    categoryName?: string | null;
    resolution?: string | null;
  }): Promise<string> {
    const raw = await this.callGemini(buildCitizenResponsePrompt(appeal));
    if (raw) return raw.trim();
    return `Hurmatli fuqaro! "${appeal.title}" mavzusidagi murojaatingiz ko‘rib chiqildi. ${
      appeal.resolution
        ? `Natija: ${appeal.resolution}`
        : 'Murojaatingiz bo‘yicha tegishli choralar ko‘rildi.'
    } Murojaatingiz uchun rahmat.`;
  }

  /** Rahbar uchun AI hisobot matni */
  async generateLeaderReport(stats: unknown, periodLabel: string): Promise<string> {
    const raw = await this.callGemini(buildLeaderReportPrompt(stats, periodLabel));
    if (raw) return raw.trim();
    const s = stats as Record<string, any>;
    return [
      `${periodLabel} davri bo‘yicha qisqacha hisobot.`,
      `Jami murojaatlar: ${s?.total ?? 0} ta, bajarilgan: ${s?.completed ?? 0} ta, kechikkan: ${s?.overdue ?? 0} ta.`,
      `Eng ko‘p murojaat tushgan yo‘nalishlar: ${
        Array.isArray(s?.topCategories)
          ? s.topCategories.map((c: any) => `${c.name} (${c.count})`).join(', ')
          : 'ma’lumot yo‘q'
      }.`,
      `Tavsiya: kechikayotgan murojaatlar ustida nazoratni kuchaytirish va eng ko‘p muammoli yo‘nalishlarga e’tibor qaratish lozim.`,
    ].join(' ');
  }

  /** Fuqaro/xodim bilan AI suhbat (bot uchun, bitta savol-javob) */
  async chat(question: string, lang: 'uz' | 'ru' = 'uz'): Promise<string> {
    const prompt =
      lang === 'ru'
        ? `Вы — вежливый ИИ-помощник платформы обращений граждан в хокимият. Кратко (3-6 предложений) и по делу ответьте на вопрос гражданина о коммунальных услугах, обращениях и госуслугах. Если вопрос не по теме, вежливо направьте к отправке обращения. Вопрос: ${question}`
        : `Siz hokimlik murojaatlar platformasining muloyim AI yordamchisisiz. Fuqaroning kommunal xizmatlar, murojaatlar va davlat xizmatlari haqidagi savoliga qisqa (3-6 gap) va aniq javob bering. Savol mavzuga oid bo'lmasa, muloyimlik bilan murojaat yuborishga yo'naltiring. Savol: ${question}`;
    const raw = await this.callGemini(prompt);
    if (raw) return raw.trim();
    return lang === 'ru'
      ? 'ИИ-помощник временно недоступен. Вы можете отправить обращение через меню «📝 Новое обращение», и оно будет рассмотрено ответственным отделом.'
      : 'AI yordamchi hozircha mavjud emas. "📝 Yangi murojaat" tugmasi orqali murojaat yuborishingiz mumkin — u mas’ul bo‘lim tomonidan ko‘rib chiqiladi.';
  }

  /** Takroriy murojaatlarni aniqlash uchun matnni normallashtirish */
  normalizeForDuplicate(text: string): string {
    return text
      .toLowerCase()
      .replace(/['’‘`ʻ]/g, '')
      .replace(/[^a-zа-яё0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Sodda Jaccard o'xshashlik — duplicate detection uchun */
  similarity(a: string, b: string): number {
    const setA = new Set(this.normalizeForDuplicate(a).split(' ').filter((w) => w.length > 3));
    const setB = new Set(this.normalizeForDuplicate(b).split(' ').filter((w) => w.length > 3));
    if (setA.size === 0 || setB.size === 0) return 0;
    let inter = 0;
    for (const w of setA) if (setB.has(w)) inter++;
    return inter / (setA.size + setB.size - inter);
  }
}
