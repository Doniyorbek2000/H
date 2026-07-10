/** Bot -> Backend API klienti */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const BOT_SECRET = process.env.BOT_API_SECRET || '';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiCall<T = any>(
  path: string,
  options: { method?: string; body?: unknown; botAuth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.botAuth) headers['X-Bot-Secret'] = BOT_SECRET;
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    let message = `API xatosi: ${res.status}`;
    try {
      const data: any = await res.json();
      message = Array.isArray(data.message) ? data.message.join('; ') : (data.message ?? message);
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

/** Telegramdan yuklab olingan fayllarni murojaatga biriktirish (multipart) */
export async function uploadAppealFiles(
  appealId: string,
  files: { buffer: ArrayBuffer; name: string; mime: string }[],
): Promise<void> {
  const form = new FormData();
  for (const f of files) {
    form.append('files', new Blob([f.buffer], { type: f.mime }), f.name);
  }
  const res = await fetch(`${API_URL}/telegram/appeals/${appealId}/attachments`, {
    method: 'POST',
    headers: { 'X-Bot-Secret': BOT_SECRET },
    body: form,
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Fayl yuklashda xato: ${res.status}`);
  }
}
