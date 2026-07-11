'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlarmClockPlus,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Copy,
  GitMerge,
  MapPin,
  Paperclip,
  RefreshCw,
  Send,
  TriangleAlert,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { api, apiDownload } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  PRIORITY_BADGE,
  PRIORITY_LABELS_UZ,
  SOURCE_LABELS_UZ,
  STATUS_BADGE,
  STATUS_LABELS_UZ,
  fmtDate,
} from '@/lib/labels';
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  ErrorState,
  Input,
  Label,
  Modal,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui';

const CAN_MANAGE = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'MANAGER'];

export default function AppealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [appeal, setAppeal] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [executors, setExecutors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ departmentId: '', assignedToId: '', priority: '', deadlineHours: '', comment: '' });
  const [showStatus, setShowStatus] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', comment: '' });
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showClose, setShowClose] = useState(false);
  const [finalResponse, setFinalResponse] = useState('');
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [confirmReanalyze, setConfirmReanalyze] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [mergeNumber, setMergeNumber] = useState('');
  const [showExtend, setShowExtend] = useState(false);
  const [extendForm, setExtendForm] = useState({ additionalHours: '48', reason: '' });
  const [showCoAssign, setShowCoAssign] = useState(false);
  const [coAssignId, setCoAssignId] = useState('');
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const canManage = user && CAN_MANAGE.includes(user.role);

  const load = useCallback(() => {
    api(`/appeals/${id}`)
      .then((a) => {
        setAppeal(a);
        setFinalResponse(a.aiResponseDraft ?? '');
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);
  useEffect(() => {
    if (!canManage) return;
    api('/users?limit=100&isActive=true').then((r) => setExecutors(r.data.filter((u: any) => ['EXECUTOR', 'MANAGER'].includes(u.role)))).catch(() => {});
    api('/departments?limit=100').then((r) => setDepartments(r.data)).catch(() => {});
  }, [canManage]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} />;
  if (!appeal)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    await act(
      () => api(`/appeals/${id}/attachments`, { method: 'POST', formData: fd }),
      'Fayl(lar) yuklandi',
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-lg font-bold">{appeal.appealNumber}</h1>
              <Badge className={STATUS_BADGE[appeal.status]}>{(STATUS_LABELS_UZ as any)[appeal.status]}</Badge>
              <Badge className={PRIORITY_BADGE[appeal.priority]}>{(PRIORITY_LABELS_UZ as any)[appeal.priority]}</Badge>
            </div>
            <p className="text-sm text-slate-500">
              {(SOURCE_LABELS_UZ as any)[appeal.source]} orqali · {fmtDate(appeal.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setConfirmReanalyze(true)}>
                <Bot size={15} /> AI qayta tahlil
              </Button>
              <Button size="sm" disabled={busy} onClick={() => setShowAssign(true)}>
                <UserCheck size={15} /> Biriktirish
              </Button>
              <Button size="sm" variant="success" disabled={busy} onClick={() => setShowClose(true)}>
                <CheckCircle2 size={15} /> Yopish
              </Button>
              <Button size="sm" variant="danger" disabled={busy} onClick={() => setShowReject(true)}>
                <XCircle size={15} /> Rad etish
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setShowMerge(true)}>
                <GitMerge size={15} /> Takroriy
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setShowExtend(true)}>
                <AlarmClockPlus size={15} /> Muddat
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setShowCoAssign(true)}>
                <UserPlus size={15} /> Hamijrochi
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setShowEscalate(true)}>
                <TriangleAlert size={15} /> Eskalatsiya
              </Button>
            </>
          )}
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setShowStatus(true)}>
            <RefreshCw size={15} /> Holat
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-2 text-lg font-semibold">{appeal.title}</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{appeal.description}</p>
            {appeal.rejectedReason && (
              <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
                <b>Rad etish sababi:</b> {appeal.rejectedReason}
              </div>
            )}
          </Card>

          <Card className="border-violet-200 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/30 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Bot size={18} className="text-violet-600" />
              <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-200">AI tahlil va tavsiyalar</h3>
            </div>
            {appeal.aiSummary ? (
              <div className="space-y-3 text-sm">
                <p><b>Qisqa mazmun:</b> {appeal.aiSummary}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-3">
                    <div className="text-xs text-slate-500">Tavsiya etilgan kategoriya</div>
                    <div className="font-medium">{appeal.aiCategorySuggestion ?? '—'}</div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-3">
                    <div className="text-xs text-slate-500">Tavsiya etilgan bo‘lim</div>
                    <div className="font-medium">{appeal.aiDepartmentSuggestion ?? '—'}</div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-3">
                    <div className="text-xs text-slate-500">Ustuvorlik / Kayfiyat</div>
                    <div className="font-medium">
                      {appeal.aiPrioritySuggestion ?? '—'} / {appeal.aiSentiment ?? '—'}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-3">
                    <div className="text-xs text-slate-500">Kalit so‘zlar</div>
                    <div className="font-medium">{appeal.aiKeywords?.join(', ') || '—'}</div>
                  </div>
                </div>
                {appeal.aiMissingInfo?.length > 0 && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 text-amber-800 dark:text-amber-300">
                    <b>Yetishmayotgan ma’lumotlar:</b> {appeal.aiMissingInfo.join(', ')}
                  </div>
                )}
                {appeal.aiResponseDraft && (
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-3">
                    <div className="mb-1 text-xs text-slate-500">Fuqaroga javob loyihasi (AI)</div>
                    <p className="text-slate-700 dark:text-slate-200">{appeal.aiResponseDraft}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">AI tahlil hali tayyor emas...</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Izohlar ({appeal.comments.length})</h3>
            </div>
            <div className="mb-4 space-y-3">
              {appeal.comments.length === 0 && (
                <p className="text-sm text-slate-400">Hozircha izohlar yo‘q</p>
              )}
              {appeal.comments.map((c: any) => (
                <div
                  key={c.id}
                  className={`rounded-lg p-3 text-sm ${c.isInternal ? 'border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40' : 'bg-slate-50 dark:bg-slate-800/60'}`}
                >
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {c.user?.fullName ?? 'Tizim'}
                      {c.isInternal && ' · 🔒 ichki izoh'}
                    </span>
                    <span>{fmtDate(c.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{c.message}</p>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!comment.trim()) return;
                act(
                  () => api(`/appeals/${id}/comment`, { method: 'POST', body: { message: comment, isInternal } }),
                  'Izoh qo‘shildi',
                ).then(() => setComment(''));
              }}
              className="space-y-2"
            >
              <Textarea rows={2} placeholder="Izoh yozing..." value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="h-3.5 w-3.5" />
                  Ichki izoh (fuqaroga ko‘rinmaydi)
                </label>
                <Button type="submit" size="sm" disabled={busy || !comment.trim()}>
                  <Send size={14} /> Yuborish
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          {appeal.duplicates?.length > 0 && (
            <Card className="border-pink-200 dark:border-pink-900 bg-pink-50/50 dark:bg-pink-950/30 p-5">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-pink-900 dark:text-pink-200">
                <Copy size={15} /> O‘xshash / takroriy murojaatlar
              </h3>
              <div className="space-y-2">
                {appeal.duplicates.map((d: any) => (
                  <Link
                    key={d.id}
                    href={`/appeals/${d.id}`}
                    className="block rounded-lg bg-white dark:bg-slate-900 px-3 py-2 text-sm hover:bg-pink-50 dark:hover:bg-pink-950/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs">{d.appealNumber}</span>
                      <Badge className={STATUS_BADGE[d.status]}>
                        {(STATUS_LABELS_UZ as any)[d.status]}
                      </Badge>
                    </div>
                    <div className="truncate text-xs text-slate-600 dark:text-slate-300">{d.title}</div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Fuqaro ma’lumotlari</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-slate-500">F.I.Sh.</dt><dd className="font-medium">{appeal.citizenName}</dd></div>
              <div><dt className="text-xs text-slate-500">Telefon</dt><dd className="font-medium">{appeal.citizenPhone}</dd></div>
              {appeal.citizenJshshir && (
                <div><dt className="text-xs text-slate-500">JShShIR</dt><dd className="font-medium">{appeal.citizenJshshir}</dd></div>
              )}
              {appeal.citizenRating && (
                <div><dt className="text-xs text-slate-500">Fuqaro bahosi</dt><dd className="font-medium">{'⭐'.repeat(appeal.citizenRating)} ({appeal.citizenRating}/5)</dd></div>
              )}
              {appeal.citizenFeedback && (
                <div><dt className="text-xs text-slate-500">Fikr</dt><dd>{appeal.citizenFeedback}</dd></div>
              )}
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Ijro ma’lumotlari</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-slate-500">Kategoriya</dt><dd className="font-medium">{appeal.category?.name ?? '—'}</dd></div>
              <div><dt className="text-xs text-slate-500">Bo‘lim</dt><dd className="font-medium">{appeal.department?.name ?? '—'}</dd></div>
              <div><dt className="text-xs text-slate-500">Mas’ul xodim</dt><dd className="font-medium">{appeal.assignedTo?.fullName ?? 'Biriktirilmagan'}</dd></div>
              {appeal.coAssignees?.length > 0 && (
                <div>
                  <dt className="text-xs text-slate-500">Hamijrochilar</dt>
                  <dd className="font-medium">
                    {appeal.coAssignees.map((c: any) => c.user.fullName).join(', ')}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-500">Muddat</dt>
                <dd className="font-medium">
                  {fmtDate(appeal.deadlineAt)}
                  {appeal.deadlineExtendedCount > 0 && (
                    <span className="ml-1 text-xs text-amber-600">({appeal.deadlineExtendedCount}x uzaytirilgan)</span>
                  )}
                </dd>
              </div>
              {appeal.escalatedAt && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-2">
                  <dt className="text-xs font-semibold text-red-700 dark:text-red-300">⚠️ Eskalatsiya qilingan</dt>
                  <dd className="text-xs text-red-600 dark:text-red-400">{appeal.escalationReason}</dd>
                </div>
              )}
              {appeal.completedAt && <div><dt className="text-xs text-slate-500">Bajarilgan</dt><dd>{fmtDate(appeal.completedAt)}</dd></div>}
              {appeal.closedAt && <div><dt className="text-xs text-slate-500">Yopilgan</dt><dd>{fmtDate(appeal.closedAt)}</dd></div>}
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><MapPin size={15} /> Joylashuv</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-slate-500">Hudud</dt><dd>{[appeal.region, appeal.district].filter(Boolean).join(', ') || '—'}</dd></div>
              <div><dt className="text-xs text-slate-500">Mahalla</dt><dd className="font-medium">{appeal.mahalla ?? '—'}</dd></div>
              <div><dt className="text-xs text-slate-500">Manzil</dt><dd>{appeal.address ?? '—'}</dd></div>
            </dl>
            {appeal.latitude && appeal.longitude && (
              <a
                className="mt-2 inline-block text-xs text-primary-600 hover:underline"
                href={`https://www.openstreetmap.org/?mlat=${appeal.latitude}&mlon=${appeal.longitude}#map=16/${appeal.latitude}/${appeal.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Xaritada ochish ({appeal.latitude.toFixed(4)}, {appeal.longitude.toFixed(4)}) →
              </a>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Paperclip size={15} /> Fayllar ({appeal.attachments.length})
              </h3>
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                Yuklash
              </Button>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
            </div>
            <div className="space-y-2">
              {appeal.attachments.length === 0 && <p className="text-sm text-slate-400">Fayl biriktirilmagan</p>}
              {appeal.attachments.map((f: any) => (
                <button
                  key={f.id}
                  onClick={() =>
                    apiDownload(`/files/${f.id}/raw`, f.fileName).catch((e) =>
                      toast(e.message, 'error'),
                    )
                  }
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="truncate">{f.fileName}</span>
                  <span className="text-xs text-slate-400">{Math.round(f.size / 1024)} KB</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Holatlar tarixi</h3>
            <div className="space-y-0">
              {appeal.statusHistory.map((h: any, i: number) => (
                <div key={h.id} className="relative flex gap-3 pb-4">
                  {i < appeal.statusHistory.length - 1 && (
                    <div className="absolute left-[7px] top-4 h-full w-0.5 bg-slate-200 dark:bg-slate-700" />
                  )}
                  <div className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary-500 bg-white dark:bg-slate-900" />
                  <div className="min-w-0 text-sm">
                    <div className="font-medium">{(STATUS_LABELS_UZ as any)[h.toStatus] ?? h.toStatus}</div>
                    <div className="text-xs text-slate-500">
                      {h.changedBy?.fullName ?? 'Tizim'} · {fmtDate(h.createdAt)}
                    </div>
                    {h.comment && <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{h.comment}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Assign modal */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Bo‘limga / xodimga biriktirish">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(
              () =>
                api(`/appeals/${id}/assign`, {
                  method: 'POST',
                  body: {
                    departmentId: assignForm.departmentId || undefined,
                    assignedToId: assignForm.assignedToId || undefined,
                    priority: assignForm.priority || undefined,
                    deadlineHours: assignForm.deadlineHours ? Number(assignForm.deadlineHours) : undefined,
                    comment: assignForm.comment || undefined,
                  },
                }),
              'Murojaat biriktirildi',
            ).then(() => setShowAssign(false));
          }}
          className="space-y-3"
        >
          <div>
            <Label>Bo‘lim {appeal.aiDepartmentSuggestion && <span className="text-violet-600">(AI tavsiyasi: {appeal.aiDepartmentSuggestion})</span>}</Label>
            <Select value={assignForm.departmentId} onChange={(e) => setAssignForm({ ...assignForm, departmentId: e.target.value })}>
              <option value="">Tanlang...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Mas’ul xodim</Label>
            <Select value={assignForm.assignedToId} onChange={(e) => setAssignForm({ ...assignForm, assignedToId: e.target.value })}>
              <option value="">Tanlang...</option>
              {executors
                .filter((u) => !assignForm.departmentId || u.departmentId === assignForm.departmentId || !u.departmentId)
                .map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.department?.name ?? 'bo‘limsiz'})</option>
                ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ustuvorlik</Label>
              <Select value={assignForm.priority} onChange={(e) => setAssignForm({ ...assignForm, priority: e.target.value })}>
                <option value="">O‘zgartirmaslik</option>
                {Object.entries(PRIORITY_LABELS_UZ).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Muddat (soat)</Label>
              <Input type="number" min={1} placeholder="72" value={assignForm.deadlineHours} onChange={(e) => setAssignForm({ ...assignForm, deadlineHours: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Izoh</Label>
            <Input value={assignForm.comment} onChange={(e) => setAssignForm({ ...assignForm, comment: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAssign(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={busy}>Biriktirish</Button>
          </div>
        </form>
      </Modal>

      {/* Status modal */}
      <Modal open={showStatus} onClose={() => setShowStatus(false)} title="Holatni o‘zgartirish">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(
              () => api(`/appeals/${id}/status`, { method: 'POST', body: statusForm }),
              'Holat yangilandi',
            ).then(() => setShowStatus(false));
          }}
          className="space-y-3"
        >
          <div>
            <Label>Yangi holat</Label>
            <Select required value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
              <option value="">Tanlang...</option>
              {Object.entries(STATUS_LABELS_UZ).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Izoh</Label>
            <Textarea rows={2} value={statusForm.comment} onChange={(e) => setStatusForm({ ...statusForm, comment: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowStatus(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={busy}>Saqlash</Button>
          </div>
        </form>
      </Modal>

      {/* Reject modal */}
      <Modal open={showReject} onClose={() => setShowReject(false)} title="Murojaatni rad etish">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(() => api(`/appeals/${id}/reject`, { method: 'POST', body: { reason: rejectReason } }), 'Murojaat rad etildi').then(
              () => setShowReject(false),
            );
          }}
          className="space-y-3"
        >
          <div>
            <Label>Rad etish sababi *</Label>
            <Textarea required rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowReject(false)}>Bekor qilish</Button>
            <Button type="submit" variant="danger" disabled={busy}>Rad etish</Button>
          </div>
        </form>
      </Modal>

      {/* Close modal */}
      <Modal open={showClose} onClose={() => setShowClose(false)} title="Murojaatni yopish" wide>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(() => api(`/appeals/${id}/close`, { method: 'POST', body: { finalResponse: finalResponse || undefined } }), 'Murojaat yopildi').then(
              () => setShowClose(false),
            );
          }}
          className="space-y-3"
        >
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Fuqaroga yakuniy javob</Label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  try {
                    const r = await api(`/appeals/${id}/response-draft`, { method: 'POST' });
                    setFinalResponse(r.responseDraft);
                    toast('AI javob loyihasi yaratildi');
                  } catch (e: any) {
                    toast(e.message, 'error');
                  }
                }}
              >
                <Bot size={14} /> AI yozsin
              </Button>
            </div>
            <Textarea rows={6} value={finalResponse} onChange={(e) => setFinalResponse(e.target.value)} placeholder="Bo‘sh qoldirsangiz AI avtomatik yozadi" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowClose(false)}>Bekor qilish</Button>
            <Button type="submit" variant="success" disabled={busy}>Yopish va javob yuborish</Button>
          </div>
        </form>
      </Modal>

      {/* Merge modal */}
      <Modal open={showMerge} onClose={() => setShowMerge(false)} title="Takroriy murojaatni birlashtirish">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(
              () => api(`/appeals/${id}/merge`, { method: 'POST', body: { targetAppealNumber: mergeNumber.trim() } }),
              'Murojaat birlashtirildi (takroriy deb belgilandi)',
            ).then(() => setShowMerge(false));
          }}
          className="space-y-3"
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Ushbu murojaat takroriy deb belgilanadi va ko‘rsatilgan asosiy murojaatga bog‘lanadi.
            Fuqaroga xabar yuboriladi.
          </p>
          <div>
            <Label>Asosiy murojaat raqami *</Label>
            <Input required placeholder="SM-20260709-0001" value={mergeNumber} onChange={(e) => setMergeNumber(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowMerge(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={busy}>Birlashtirish</Button>
          </div>
        </form>
      </Modal>

      {/* Muddat uzaytirish */}
      <Modal open={showExtend} onClose={() => setShowExtend(false)} title="Ijro muddatini uzaytirish">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(
              () => api(`/appeals/${id}/extend-deadline`, { method: 'POST', body: { additionalHours: Number(extendForm.additionalHours), reason: extendForm.reason } }),
              'Muddat uzaytirildi',
            ).then(() => setShowExtend(false));
          }}
          className="space-y-3"
        >
          <div>
            <Label>Qo‘shimcha soatlar *</Label>
            <Input type="number" min={1} required value={extendForm.additionalHours} onChange={(e) => setExtendForm({ ...extendForm, additionalHours: e.target.value })} />
          </div>
          <div>
            <Label>Sabab *</Label>
            <Textarea required rows={2} value={extendForm.reason} onChange={(e) => setExtendForm({ ...extendForm, reason: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowExtend(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={busy}>Uzaytirish</Button>
          </div>
        </form>
      </Modal>

      {/* Hamijrochi qo'shish */}
      <Modal open={showCoAssign} onClose={() => setShowCoAssign(false)} title="Hamijrochi xodim qo‘shish">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(
              () => api(`/appeals/${id}/co-assignees`, { method: 'POST', body: { userId: coAssignId } }),
              'Hamijrochi qo‘shildi',
            ).then(() => { setShowCoAssign(false); setCoAssignId(''); });
          }}
          className="space-y-3"
        >
          <div>
            <Label>Xodim *</Label>
            <Select required value={coAssignId} onChange={(e) => setCoAssignId(e.target.value)}>
              <option value="">Tanlang...</option>
              {executors.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.department?.name ?? 'bo‘limsiz'})</option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCoAssign(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={busy || !coAssignId}>Qo‘shish</Button>
          </div>
        </form>
      </Modal>

      {/* Eskalatsiya */}
      <Modal open={showEscalate} onClose={() => setShowEscalate(false)} title="Murojaatni eskalatsiya qilish">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(
              () => api(`/appeals/${id}/escalate`, { method: 'POST', body: { reason: escalateReason } }),
              'Eskalatsiya qilindi (rahbarlarga xabar berildi)',
            ).then(() => { setShowEscalate(false); setEscalateReason(''); });
          }}
          className="space-y-3"
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Murojaat rahbar va bo‘lim boshliqlariga ko‘tariladi, ustuvorlik oshiriladi.
          </p>
          <div>
            <Label>Sabab *</Label>
            <Textarea required rows={3} value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEscalate(false)}>Bekor qilish</Button>
            <Button type="submit" variant="danger" disabled={busy}>Eskalatsiya</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmReanalyze}
        onClose={() => setConfirmReanalyze(false)}
        onConfirm={() => act(() => api(`/appeals/${id}/analyze-ai`, { method: 'POST' }), 'AI tahlil yakunlandi')}
        title="AI qayta tahlil"
        message="Murojaat AI tomonidan qayta tahlil qilinadi va tavsiyalar yangilanadi. Davom etasizmi?"
      />
    </div>
  );
}
