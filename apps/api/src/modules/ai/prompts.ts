/** Gemini uchun prompt shablonlari (o'zbek tilida, JSON javob talab qilinadi) */

export function buildAnalyzePrompt(params: {
  text: string;
  title: string;
  region?: string | null;
  district?: string | null;
  mahalla?: string | null;
  categories: string[];
  departments: string[];
}): string {
  return `Siz hokimlik murojaatlarini tahlil qiluvchi AI yordamchisiz. Quyidagi fuqaro murojaatini tahlil qiling va FAQAT JSON qaytaring (markdown, izoh yoki boshqa matn yozmang).

Murojaat sarlavhasi: ${params.title}
Murojaat matni: ${params.text}
Hudud: ${params.region ?? 'noma’lum'}, ${params.district ?? 'noma’lum'}, mahalla: ${params.mahalla ?? 'noma’lum'}

Mavjud kategoriyalar: ${params.categories.join(', ')}
Mavjud bo'limlar: ${params.departments.join(', ')}

Quyidagi JSON formatda javob bering:
{
  "summary": "murojaatning 1-2 gapdan iborat qisqa mazmuni (o'zbek tilida)",
  "category": "yuqoridagi mavjud kategoriyalardan eng mosi",
  "priority": "LOW|MEDIUM|HIGH|URGENT",
  "departmentSuggestion": "yuqoridagi mavjud bo'limlardan eng mosi",
  "deadlineHours": 72,
  "sentiment": "neutral|angry|positive|urgent",
  "missingInfo": ["yetishmayotgan ma'lumotlar ro'yxati, masalan aniq manzil yoki foto"],
  "responseDraft": "fuqaroga dastlabki rasmiy javob loyihasi (o'zbek tilida, qisqa va hurmatli)",
  "keywords": ["asosiy kalit so'zlar"]
}

Ustuvorlikni aniqlashda: hayot/sog'liqqa xavf, ko'p odamga ta'sir, kommunal avariya bo'lsa URGENT yoki HIGH bering.`;
}

export function buildLeaderReportPrompt(stats: unknown, periodLabel: string): string {
  return `Siz hokim uchun qisqa va rasmiy boshqaruv hisobotini tayyorlovchi AI yordamchisiz. Quyidagi ${periodLabel} statistikalar asosida o'zbek tilida rasmiy hisobot matni yozing. Hisobotda: umumiy holat, asosiy muammolar, tendensiyalar, xavfli yo'nalishlar va aniq tavsiyalar bo'lsin. Hajmi 150-250 so'z. Faqat hisobot matnini qaytaring, boshqa izoh yozmang.

Statistikalar (JSON):
${JSON.stringify(stats, null, 2)}`;
}

export function buildCitizenResponsePrompt(appeal: {
  title: string;
  description: string;
  status: string;
  categoryName?: string | null;
  resolution?: string | null;
}): string {
  return `Siz davlat tashkiloti nomidan fuqaroga hurmatli va rasmiy javob yozuvchi yordamchisiz. Javob qisqa, aniq, rasmiy va tushunarli bo'lsin (o'zbek tilida, 3-6 gap). Faqat javob matnini qaytaring.

Murojaat: ${appeal.title}
Mazmuni: ${appeal.description}
Kategoriya: ${appeal.categoryName ?? 'aniqlanmagan'}
Holat: ${appeal.status}
Bajarilgan ish / xulosa: ${appeal.resolution ?? 'ko‘rib chiqilmoqda'}`;
}
