import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FilesService } from './files.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

/**
 * Fayl kirish nazorati regressiyasi: `/files/:id/raw` avval autentifikatsiyasiz
 * ochiq edi (PII fosh). Endi murojaatga kirish huquqi qat'iy tekshiriladi.
 */
describe('FilesService — fayl kirish nazorati', () => {
  const attachment = {
    id: 'file-1',
    fileName: 'dalil.pdf',
    filePath: 'abc.pdf',
    mimeType: 'application/pdf',
    appeal: { organizationId: 'org-1', assignedToId: 'exec-1', createdById: 'cit-1' },
  };

  function makeService() {
    const prisma = {
      appealAttachment: { findUnique: jest.fn().mockResolvedValue(attachment) },
    };
    const storage = {
      resolve: jest.fn().mockResolvedValue({ kind: 'local', absPath: '/x/abc.pdf' }),
      getUrl: jest.fn().mockResolvedValue('/files/file-1/raw'),
    };
    // Haqiqiy AppealsService.assertAccess mantig'ini aks ettiruvchi stub
    const appeals = {
      assertAccess: (
        appeal: { organizationId: string; assignedToId: string | null; createdById: string | null },
        actor: AuthUser,
      ) => {
        if (actor.role === Role.SUPER_ADMIN) return;
        if (actor.role === Role.EXECUTOR && appeal.assignedToId !== actor.id) {
          throw new ForbiddenException();
        }
        if (actor.role === Role.CITIZEN && appeal.createdById !== actor.id) {
          throw new ForbiddenException();
        }
        const orgRoles: string[] = [Role.ADMIN, Role.OPERATOR, Role.MANAGER, Role.LEADER];
        if (orgRoles.includes(actor.role) && appeal.organizationId !== actor.organizationId) {
          throw new ForbiddenException();
        }
      },
    };
    const antivirus = { scan: jest.fn().mockResolvedValue({ clean: true }) };
    return new FilesService(prisma as any, storage as any, antivirus as any, appeals as any);
  }

  const user = (over: Partial<AuthUser>): AuthUser => ({
    id: 'u',
    email: 'u@t.uz',
    role: Role.OPERATOR,
    organizationId: 'org-1',
    departmentId: null,
    fullName: 'U',
    ...over,
  });

  it('biriktirilgan EXECUTOR faylni oladi', async () => {
    const svc = makeService();
    await expect(svc.resolveRaw('file-1', user({ role: Role.EXECUTOR, id: 'exec-1' }))).resolves.toBeDefined();
  });

  it('begona EXECUTOR rad etiladi (IDOR yopiq)', async () => {
    const svc = makeService();
    await expect(svc.resolveRaw('file-1', user({ role: Role.EXECUTOR, id: 'other' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('begona tashkilot CITIZEN rad etiladi', async () => {
    const svc = makeService();
    await expect(svc.resolveRaw('file-1', user({ role: Role.CITIZEN, id: 'other-cit' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('o‘z tashkiloti OPERATORi oladi', async () => {
    const svc = makeService();
    await expect(svc.resolveRaw('file-1', user({ role: Role.OPERATOR, organizationId: 'org-1' }))).resolves.toBeDefined();
  });

  it('boshqa tashkilot OPERATORi rad etiladi', async () => {
    const svc = makeService();
    await expect(svc.resolveRaw('file-1', user({ role: Role.OPERATOR, organizationId: 'org-2' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('mavjud bo‘lmagan fayl -> NotFound', async () => {
    const svc = makeService();
    (svc as any).prisma.appealAttachment.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.resolveRaw('yo-q', user({ role: Role.SUPER_ADMIN }))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
