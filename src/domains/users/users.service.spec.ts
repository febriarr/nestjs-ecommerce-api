import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { OutletsRepository } from '../outlets/outlets.repository';
import { AppException } from '../../common/exceptions/app-exceptions';
import { SelectOutlet, SelectUser } from '../../infrastructure/database/schema';
import { CreateUserDTO } from './dto/create-user.dto';

// ---------- fixtures ----------

const user: SelectUser = {
  id: '019527aa-0000-7000-8000-000000000001',
  email: 'budi@example.com',
  name: 'Budi',
  phone: null,
  avatar: null,
  role: 'customer',
  emailIsVerified: false,
  phoneIsVerified: false,
  status: 'active',
  oauthMetadata: null,
  notificationPref: null,
  password: null,
  lastLoginAt: null,
  outletId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const userWithOutlet = {
  ...user,
  outlet: null as { code: string } | null,
};

const outlet: SelectOutlet = {
  id: 1,
  code: 'OUTLET-01',
  name: 'Outlet Satu',
  street: null,
  district: null,
  city: null,
  province: null,
  postalCode: null,
  phone: null,
  email: null,
  latitude: null,
  longitude: null,
  isActive: true,
  servesOnline: false,
  isOnlineDefault: false,
  openingHours: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

// ---------- factory ----------

function makeRepo(): jest.Mocked<UsersRepository> {
  return {
    findById: jest.fn().mockResolvedValue(userWithOutlet),
    findByEmail: jest.fn().mockResolvedValue(null),
    list: jest.fn(),
    insert: jest.fn(),
    update: jest.fn().mockResolvedValue(user),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
}

function makeOutletsRepo(): jest.Mocked<OutletsRepository> {
  return {
    findById: jest.fn().mockResolvedValue(outlet),
  } as unknown as jest.Mocked<OutletsRepository>;
}

// ---------- suite ----------

describe('UsersService', () => {
  let repo: jest.Mocked<UsersRepository>;
  let outletsRepo: jest.Mocked<OutletsRepository>;
  let service: UsersService;

  beforeEach(() => {
    repo = makeRepo();
    outletsRepo = makeOutletsRepo();
    service = new UsersService(repo, outletsRepo);
  });

  // ---------- createUser ----------

  describe('createUser', () => {
    const baseDto: CreateUserDTO = {
      email: 'budi@example.com',
      name: 'Budi',
      password: 'rahasia-123',
    };

    it('meng-hash password dan tidak membocorkannya di response', async () => {
      repo.insert.mockImplementation((data) =>
        Promise.resolve({ ...user, password: data.password ?? null })
      );

      const result = await service.createUser(baseDto);

      const inserted = repo.insert.mock.calls[0][0];
      expect(inserted.password).not.toBe(baseDto.password);
      expect(
        await bcrypt.compare(baseDto.password, inserted.password as string)
      ).toBe(true);
      expect(result).not.toHaveProperty('password');
    });

    it('menolak email yang sudah terdaftar (409)', async () => {
      repo.findByEmail.mockResolvedValue(userWithOutlet);

      await expect(service.createUser(baseDto)).rejects.toBeInstanceOf(
        AppException
      );
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('menolak role admin tanpa outletId', async () => {
      await expect(
        service.createUser({ ...baseDto, role: 'admin' })
      ).rejects.toBeInstanceOf(AppException);
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('menolak role cashier tanpa outletId', async () => {
      await expect(
        service.createUser({ ...baseDto, role: 'cashier' })
      ).rejects.toBeInstanceOf(AppException);
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('menolak role customer dengan outletId', async () => {
      await expect(
        service.createUser({ ...baseDto, role: 'customer', outletId: 1 })
      ).rejects.toBeInstanceOf(AppException);
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('menolak role super_admin dengan outletId', async () => {
      await expect(
        service.createUser({ ...baseDto, role: 'super_admin', outletId: 1 })
      ).rejects.toBeInstanceOf(AppException);
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('menolak bila outletId tidak ditemukan', async () => {
      outletsRepo.findById.mockResolvedValue(null);

      await expect(
        service.createUser({ ...baseDto, role: 'admin', outletId: 99 })
      ).rejects.toBeInstanceOf(AppException);
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('berhasil membuat user admin dengan outletId valid', async () => {
      repo.insert.mockResolvedValue({ ...user, role: 'admin', outletId: 1 });
      repo.findById.mockResolvedValue({
        ...userWithOutlet,
        role: 'admin',
        outletId: 1,
        outlet: { code: 'OUTLET-01' },
      });

      const result = await service.createUser({
        ...baseDto,
        role: 'admin',
        outletId: 1,
      });

      expect(repo.insert).toHaveBeenCalledTimes(1);
      expect(result.outlet?.code).toBe('OUTLET-01');
    });
  });

  // ---------- update ----------

  describe('update', () => {
    it('menolak ganti role ke admin tanpa outletId tersedia', async () => {
      repo.findById.mockResolvedValue({ ...userWithOutlet, outletId: null });

      await expect(
        service.update(user.id, { role: 'admin' })
      ).rejects.toBeInstanceOf(AppException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('menolak ganti role ke customer bila masih punya outletId', async () => {
      repo.findById.mockResolvedValue({
        ...userWithOutlet,
        role: 'admin',
        outletId: 1,
        outlet: { code: 'OUTLET-01' },
      });

      await expect(
        service.update(user.id, { role: 'customer' })
      ).rejects.toBeInstanceOf(AppException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('menolak bila outletId baru tidak ditemukan', async () => {
      outletsRepo.findById.mockResolvedValue(null);
      repo.findById.mockResolvedValue({
        ...userWithOutlet,
        role: 'admin',
        outletId: 1,
        outlet: { code: 'OUTLET-01' },
      });

      await expect(
        service.update(user.id, { outletId: 99 })
      ).rejects.toBeInstanceOf(AppException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  // ---------- changePassword ----------

  describe('changePassword', () => {
    it('akun OAuth tanpa password boleh langsung menyetel', async () => {
      await service.changePassword(user.id, { newPassword: 'baru-12345' });
      expect(repo.update).toHaveBeenCalledTimes(1);
    });

    it('menolak bila currentPassword salah', async () => {
      repo.findById.mockResolvedValue({
        ...userWithOutlet,
        password: await bcrypt.hash('benar-123', 4),
      });

      await expect(
        service.changePassword(user.id, {
          currentPassword: 'salah-123',
          newPassword: 'baru-12345',
        })
      ).rejects.toBeInstanceOf(AppException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('mengganti password bila currentPassword cocok', async () => {
      repo.findById.mockResolvedValue({
        ...userWithOutlet,
        password: await bcrypt.hash('benar-123', 4),
      });

      await service.changePassword(user.id, {
        currentPassword: 'benar-123',
        newPassword: 'baru-12345',
      });
      expect(repo.update).toHaveBeenCalledTimes(1);
    });

    it('adminReset melewati verifikasi currentPassword', async () => {
      repo.findById.mockResolvedValue({
        ...userWithOutlet,
        password: await bcrypt.hash('lama-123', 4),
      });

      await service.changePassword(
        user.id,
        { newPassword: 'baru-12345' },
        true
      );
      expect(repo.update).toHaveBeenCalledTimes(1);
    });
  });

  // ---------- findById ----------

  it('findById melempar USER_NOT_FOUND bila tidak ada', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById(user.id)).rejects.toBeInstanceOf(
      AppException
    );
  });

  // ---------- softDelete ----------

  it('softDelete melempar USER_NOT_FOUND bila tidak ada', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.softDelete(user.id)).rejects.toBeInstanceOf(
      AppException
    );
    expect(repo.softDelete).not.toHaveBeenCalled();
  });
});
