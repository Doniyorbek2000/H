/* eslint-disable no-console */
import {
  AppealPriority,
  AppealSource,
  AppealStatus,
  OrganizationType,
  PrismaClient,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'Admin123!';

const CATEGORIES: { name: string; description: string; hours: number; dep?: string }[] = [
  { name: 'Yo‘l', description: 'Yo‘l va transport infratuzilmasi', hours: 120, dep: 'Qurilish bo‘limi' },
  { name: 'Suv', description: 'Ichimlik suvi va kanalizatsiya', hours: 48, dep: 'Kommunal xizmatlar' },
  { name: 'Gaz', description: 'Tabiiy gaz ta’minoti', hours: 48, dep: 'Kommunal xizmatlar' },
  { name: 'Elektr', description: 'Elektr energiyasi ta’minoti', hours: 24, dep: 'Kommunal xizmatlar' },
  { name: 'Chiqindi', description: 'Chiqindilarni olib chiqish va tozalik', hours: 48, dep: 'Kommunal xizmatlar' },
  { name: 'Qurilish', description: 'Qurilish va obodonlashtirish', hours: 168, dep: 'Qurilish bo‘limi' },
  { name: 'Bandlik', description: 'Ish bilan ta’minlash masalalari', hours: 120, dep: 'Bandlik bo‘limi' },
  { name: 'Tadbirkorlik', description: 'Tadbirkorlikni qo‘llab-quvvatlash', hours: 120, dep: 'Tadbirkorlik bo‘limi' },
  { name: 'Ijtimoiy yordam', description: 'Ijtimoiy himoya va yordam', hours: 72, dep: 'Yoshlar bo‘limi' },
  { name: 'Ta’lim', description: 'Maktab va bog‘chalar masalalari', hours: 120, dep: 'Yoshlar bo‘limi' },
  { name: 'Sog‘liqni saqlash', description: 'Tibbiy xizmatlar', hours: 72 },
  { name: 'Boshqa', description: 'Boshqa turdagi murojaatlar', hours: 72 },
];

const MAHALLAS = [
  'Guliston mahallasi',
  'Navbahor mahallasi',
  'Do‘stlik mahallasi',
  'Istiqlol mahallasi',
  'Yangiobod mahallasi',
  'Bog‘iston mahallasi',
];

const DEMO_APPEALS: {
  title: string;
  description: string;
  category: string;
  status: AppealStatus;
  priority: AppealPriority;
  source: AppealSource;
  rating?: number;
}[] = [
  { title: 'Ko‘chada suv quvuri yorildi', description: 'Guliston mahallasi, 12-uy oldida suv quvuri yorilib, ko‘chani suv bosdi. Ikki kundan beri suv oqmoqda, yo‘l loyga aylandi.', category: 'Suv', status: AppealStatus.IN_PROGRESS, priority: AppealPriority.URGENT, source: AppealSource.WEB },
  { title: 'Mahallada elektr uzilishlari', description: 'Har kuni kechqurun soat 19:00 dan 22:00 gacha elektr o‘chib qoladi. Bolalar dars qila olmayapti.', category: 'Elektr', status: AppealStatus.ASSIGNED, priority: AppealPriority.HIGH, source: AppealSource.TELEGRAM },
  { title: 'Yo‘lda katta chuqurlar paydo bo‘ldi', description: 'Navbahor mahallasi markaziy ko‘chasida katta chuqurlar bor, mashinalar shikastlanmoqda. Yomg‘irdan keyin ahvol og‘irlashdi.', category: 'Yo‘l', status: AppealStatus.OPERATOR_REVIEW, priority: AppealPriority.MEDIUM, source: AppealSource.WEB },
  { title: 'Chiqindi olib ketilmayapti', description: 'Bir haftadan beri mahalladagi chiqindi konteynerlari to‘lib ketgan, hidi tarqalmoqda. Sanitariya holati yomonlashdi.', category: 'Chiqindi', status: AppealStatus.COMPLETED, priority: AppealPriority.MEDIUM, source: AppealSource.OPERATOR, rating: 5 },
  { title: 'Gaz bosimi juda past', description: 'Qishda gaz bosimi juda past bo‘lib, uyni isitib bo‘lmayapti. Keksalar va bolalar qiynalmoqda.', category: 'Gaz', status: AppealStatus.IN_PROGRESS, priority: AppealPriority.HIGH, source: AppealSource.TELEGRAM },
  { title: 'Maktab sport zali ta’mirtalab', description: '15-maktab sport zali eskirgan, pol taxtalari sinib yotibdi. Bolalar jarohat olishi mumkin.', category: 'Ta’lim', status: AppealStatus.NEW, priority: AppealPriority.MEDIUM, source: AppealSource.WEB },
  { title: 'Ish topishda yordam so‘rayman', description: 'Texnika oliygohini bitirganman, 6 oydan beri ish topa olmayapman. Bandlik bo‘limidan yordam so‘rayman.', category: 'Bandlik', status: AppealStatus.CLOSED, priority: AppealPriority.LOW, source: AppealSource.WEB, rating: 4 },
  { title: 'Ko‘cha yoritilmaydi', description: 'Do‘stlik mahallasida ko‘cha chiroqlari 3 oydan beri ishlamaydi, kechasi yurish xavfli.', category: 'Elektr', status: AppealStatus.OVERDUE, priority: AppealPriority.MEDIUM, source: AppealSource.QR },
  { title: 'Ariq to‘silib qolgan', description: 'Mahalla arig‘i chiqindi bilan to‘silib, suv toshib ketmoqda. Hovlilarga suv kirish xavfi bor.', category: 'Suv', status: AppealStatus.ACCEPTED, priority: AppealPriority.HIGH, source: AppealSource.TELEGRAM },
  { title: 'Bolalar maydonchasi buzilgan', description: 'Istiqlol mahallasidagi bolalar maydonchasi arg‘imchoqlari singan, xavfli holatda.', category: 'Qurilish', status: AppealStatus.WAITING_EVIDENCE, priority: AppealPriority.LOW, source: AppealSource.WEB },
  { title: 'Nogironlik nafaqasi masalasi', description: '2-guruh nogironman, nafaqam 2 oydan beri kelmayapti. Sabab tushunarsiz.', category: 'Ijtimoiy yordam', status: AppealStatus.COMPLETED, priority: AppealPriority.HIGH, source: AppealSource.OPERATOR, rating: 5 },
  { title: 'Tadbirkorlik uchun yer ajratish', description: 'Kichik ishlab chiqarish sexi ochmoqchiman, yer uchastkasi ajratilishini so‘rayman. Hujjatlarim tayyor.', category: 'Tadbirkorlik', status: AppealStatus.OPERATOR_REVIEW, priority: AppealPriority.MEDIUM, source: AppealSource.WEB },
  { title: 'Ichimlik suvi sifati yomon', description: 'Kranlardan loyqa suv oqmoqda, ichish mumkin emas. Laboratoriya tekshiruvi o‘tkazilishini so‘raymiz.', category: 'Suv', status: AppealStatus.IN_PROGRESS, priority: AppealPriority.URGENT, source: AppealSource.TELEGRAM },
  { title: 'Yo‘lak plitalari ko‘chib ketgan', description: 'Markaziy xiyobon yo‘lak plitalari ko‘chib, piyodalar qoqilib yiqilmoqda. Keksalar uchun xavfli.', category: 'Yo‘l', status: AppealStatus.ASSIGNED, priority: AppealPriority.MEDIUM, source: AppealSource.WEB },
  { title: 'Kanalizatsiya tiqilib qolgan', description: 'Ko‘p qavatli uy podvalida kanalizatsiya tiqilib, suv to‘planmoqda. Hid butun binoga tarqalgan.', category: 'Suv', status: AppealStatus.REOPENED, priority: AppealPriority.HIGH, source: AppealSource.OPERATOR },
  { title: 'Bog‘cha navbati masalasi', description: 'Farzandimni bog‘chaga navbatga qo‘yganimga 1 yil bo‘ldi, hali ham joy yo‘q deyishmoqda.', category: 'Ta’lim', status: AppealStatus.WAITING_CITIZEN_INFO, priority: AppealPriority.LOW, source: AppealSource.WEB },
  { title: 'Ko‘p qavatli uy tomi oqmoqda', description: 'Yuqori qavat kvartiralariga yomg‘ir suvi o‘tmoqda, shift namlanib qulash xavfi bor.', category: 'Qurilish', status: AppealStatus.IN_PROGRESS, priority: AppealPriority.HIGH, source: AppealSource.TELEGRAM },
  { title: 'Poliklinikada navbat juda uzun', description: 'Tuman poliklinikasida shifokor qabuliga tushish uchun yarim kun navbat kutish kerak. Qabul tizimini yaxshilashni so‘raymiz.', category: 'Sog‘liqni saqlash', status: AppealStatus.NEW, priority: AppealPriority.MEDIUM, source: AppealSource.WEB },
  { title: 'Avtobus qatnovi kamaytirildi', description: '12-yo‘nalish avtobusi ilgari 15 daqiqada kelardi, endi 1 soat kutish kerak. Qatnovni tiklashni so‘raymiz.', category: 'Boshqa', status: AppealStatus.OPERATOR_REVIEW, priority: AppealPriority.LOW, source: AppealSource.QR },
  { title: 'Isitish tizimi ishlamayapti', description: 'Maktab binosida isitish tizimi ishlamayapti, sinflarda harorat 10 daraja. Bolalar kasal bo‘lmoqda.', category: 'Kommunal', status: AppealStatus.OVERDUE, priority: AppealPriority.URGENT, source: AppealSource.OPERATOR },
];

async function main() {
  console.log('🌱 Seed boshlandi...');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // 1. Tashkilot
  let org = await prisma.organization.findFirst({ where: { name: 'Chust tumani hokimligi' } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Chust tumani hokimligi',
        type: OrganizationType.HOKIMLIK,
        region: 'Namangan viloyati',
        district: 'Chust tumani',
        address: 'Chust shahri, Mustaqillik ko‘chasi 1-uy',
        phone: '+998692271234',
        email: 'info@chust.uz',
      },
    });
  }

  // 2. Super admin
  await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      fullName: 'Super Administrator',
      email: 'superadmin@example.com',
      phone: '+998900000001',
      passwordHash,
      role: Role.SUPER_ADMIN,
    },
  });

  // 3. Bo'limlar
  const departmentNames = [
    'Kommunal xizmatlar',
    'Qurilish bo‘limi',
    'Bandlik bo‘limi',
    'Yoshlar bo‘limi',
    'Tadbirkorlik bo‘limi',
  ];
  const departments = new Map<string, string>();
  for (const name of departmentNames) {
    let dep = await prisma.department.findFirst({ where: { name, organizationId: org.id } });
    if (!dep) {
      dep = await prisma.department.create({
        data: { name, organizationId: org.id, description: `${name} — ${org.name}` },
      });
    }
    departments.set(name, dep.id);
  }

  // 4. Demo foydalanuvchilar
  const demoUsers: { email: string; fullName: string; role: Role; phone: string; departmentName?: string }[] = [
    { email: 'admin@example.com', fullName: 'Aliyev Akmal (Admin)', role: Role.ADMIN, phone: '+998900000002' },
    { email: 'operator@example.com', fullName: 'Karimova Nilufar (Operator)', role: Role.OPERATOR, phone: '+998900000003' },
    { email: 'executor@example.com', fullName: 'Umarov Botir (Ijrochi)', role: Role.EXECUTOR, phone: '+998900000004', departmentName: 'Kommunal xizmatlar' },
    { email: 'manager@example.com', fullName: 'Sodiqov Jasur (Bo‘lim rahbari)', role: Role.MANAGER, phone: '+998900000005', departmentName: 'Kommunal xizmatlar' },
    { email: 'leader@example.com', fullName: 'Rahimov Davron (Hokim)', role: Role.LEADER, phone: '+998900000006' },
  ];
  const userIds = new Map<string, string>();
  for (const du of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: du.email },
      update: {},
      create: {
        fullName: du.fullName,
        email: du.email,
        phone: du.phone,
        passwordHash,
        role: du.role,
        organizationId: org.id,
        departmentId: du.departmentName ? departments.get(du.departmentName) : undefined,
      },
    });
    userIds.set(du.email, user.id);
  }

  // Manager'ni bo'limga bog'lash
  await prisma.department.update({
    where: { id: departments.get('Kommunal xizmatlar')! },
    data: { managerId: userIds.get('manager@example.com') },
  });

  // 5. Kategoriyalar
  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: {
        name: c.name,
        description: c.description,
        defaultDeadlineHours: c.hours,
        departmentId: c.dep ? departments.get(c.dep) : undefined,
      },
    });
    categoryIds.set(c.name, cat.id);
  }

  // 6. Demo murojaatlar
  const existingAppeals = await prisma.appeal.count({ where: { organizationId: org.id } });
  if (existingAppeals === 0) {
    const executorId = userIds.get('executor@example.com')!;
    const operatorId = userIds.get('operator@example.com')!;
    const citizenNames = [
      'Toshpo‘latov Sherzod', 'Yo‘ldosheva Malika', 'Ergashev Nodir', 'Xolmatova Zulfiya',
      'Qodirov Rustam', 'Salimova Dilnoza', 'Mirzayev Otabek', 'Ismoilova Gulbahor',
    ];
    for (let i = 0; i < DEMO_APPEALS.length; i++) {
      const d = DEMO_APPEALS[i];
      const createdAt = new Date(Date.now() - (DEMO_APPEALS.length - i) * 36 * 3600 * 1000);
      const categoryId = categoryIds.get(d.category) ?? categoryIds.get('Boshqa')!;
      const category = CATEGORIES.find((c) => c.name === d.category);
      const depId = category?.dep ? departments.get(category.dep) : departments.get('Kommunal xizmatlar');
      const unassignedStatuses: AppealStatus[] = [AppealStatus.NEW, AppealStatus.OPERATOR_REVIEW];
      const doneStatuses: AppealStatus[] = [AppealStatus.COMPLETED, AppealStatus.CLOSED];
      const isAssigned = !unassignedStatuses.includes(d.status);
      const isDone = doneStatuses.includes(d.status);
      const deadlineAt =
        d.status === AppealStatus.OVERDUE
          ? new Date(createdAt.getTime() + 24 * 3600 * 1000)
          : new Date(createdAt.getTime() + (category?.hours ?? 72) * 3600 * 1000);
      const mahalla = MAHALLAS[i % MAHALLAS.length];
      const num = `SM-${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}-${String(1000 + i)}`;

      await prisma.appeal.create({
        data: {
          appealNumber: num,
          title: d.title,
          description: d.description,
          citizenName: citizenNames[i % citizenNames.length],
          citizenPhone: `+9989${String(10000000 + i * 111111).slice(0, 8)}`,
          source: d.source,
          status: d.status,
          priority: d.priority,
          categoryId,
          organizationId: org.id,
          departmentId: isAssigned ? depId : undefined,
          assignedToId: isAssigned ? executorId : undefined,
          region: 'Namangan viloyati',
          district: 'Chust tumani',
          mahalla,
          address: `${mahalla}, ${10 + i}-uy`,
          latitude: 41.003 + (i % 10) * 0.008,
          longitude: 71.237 + (i % 7) * 0.011,
          deadlineAt,
          completedAt: isDone ? new Date(createdAt.getTime() + 30 * 3600 * 1000) : undefined,
          closedAt: d.status === AppealStatus.CLOSED ? new Date(createdAt.getTime() + 40 * 3600 * 1000) : undefined,
          citizenRating: d.rating,
          aiSummary: `${d.title} — ${d.category} yo‘nalishidagi murojaat.`,
          aiCategorySuggestion: d.category,
          aiPrioritySuggestion: d.priority,
          aiDepartmentSuggestion: category?.dep ?? 'Kommunal xizmatlar',
          aiSentiment: d.priority === AppealPriority.URGENT ? 'urgent' : 'neutral',
          aiKeywords: d.title.toLowerCase().split(' ').slice(0, 3),
          aiResponseDraft:
            'Hurmatli fuqaro! Murojaatingiz qabul qilindi va mas’ul bo‘limga yo‘naltirildi. Belgilangan muddatda ko‘rib chiqiladi.',
          createdAt,
          statusHistory: {
            create: [
              { toStatus: AppealStatus.NEW, comment: 'Murojaat yaratildi', createdAt },
              ...(d.status !== AppealStatus.NEW
                ? [
                    {
                      fromStatus: AppealStatus.NEW,
                      toStatus: d.status,
                      changedById: operatorId,
                      comment: 'Demo holat',
                      createdAt: new Date(createdAt.getTime() + 3600 * 1000),
                    },
                  ]
                : []),
            ],
          },
          comments: isDone
            ? {
                create: {
                  userId: executorId,
                  message: 'Muammo joyida o‘rganilib, tegishli ishlar bajarildi.',
                  isInternal: false,
                },
              }
            : undefined,
        },
      });
    }
    console.log(`✅ ${DEMO_APPEALS.length} ta demo murojaat yaratildi`);
  } else {
    console.log('ℹ️ Murojaatlar allaqachon mavjud, o‘tkazib yuborildi');
  }

  console.log('✅ Seed yakunlandi.');
  console.log('Demo akkauntlar (parol: Admin123!):');
  console.log('  superadmin@example.com | admin@example.com | operator@example.com');
  console.log('  executor@example.com | manager@example.com | leader@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
