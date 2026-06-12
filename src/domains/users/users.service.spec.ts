import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { AppException } from '../../common/exceptions/app-exceptions';
import { SelectUser } from '../../infrastructure/database/schema';
import { CreateUserDTO } from './dto/create-user.dto';

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
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function makeRepo(): jest.Mocked<UsersRepository> {
  return {
    findById: jest.fn().mockResolvedValue(user),
    findByEmail: jest.fn().mockResolvedValue(null),
    list: jest.fn(),
    insert: jest.fn(),
    update: jest.fn().mockResolvedValue(user),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
}

const dto: CreateUserDTO = {
  email: 'budi@example.com',
  name: 'Budi',
  password: 'rahasia-123',
};

describe('UsersService', () => {
  let repo: jest.Mocked<UsersRepository>;
  let service: UsersService;

  beforeEach(() => {
    repo = makeRepo();
    service = new UsersService(repo);
  });

  describe('createUser', () => {
    it('meng-hash password dan tidak membocorkannya di response', async () => {
      repo.insert.mockImplementation((data) =>
        Promise.resolve({ ...user, password: data.password ?? null })
      );

      const result = await service.createUser(dto);

      const inserted = repo.insert.mock.calls[0][0];
      expect(inserted.password).not.toBe(dto.password);
      expect(
        await bcrypt.compare(dto.password, inserted.password as string)
      ).toBe(true);
      expect(result).not.toHaveProperty('password');
    });

    it('menolak email yang sudah terdaftar (409)', async () => {
      repo.findByEmail.mockResolvedValue(user);
      await expect(service.createUser(dto)).rejects.toBeInstanceOf(
        AppException
      );
      expect(repo.insert).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('akun OAuth tanpa password boleh langsung menyetel', async () => {
      await service.changePassword(user.id, { newPassword: 'baru-12345' });
      expect(repo.update).toHaveBeenCalledTimes(1);
    });

    it('menolak bila currentPassword salah', async () => {
      repo.findById.mockResolvedValue({
        ...user,
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
        ...user,
        password: await bcrypt.hash('benar-123', 4),
      });
      await service.changePassword(user.id, {
        currentPassword: 'benar-123',
        newPassword: 'baru-12345',
      });
      expect(repo.update).toHaveBeenCalledTimes(1);
    });
  });

  it('findById melempar USER_NOT_FOUND bila tidak ada', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById(user.id)).rejects.toBeInstanceOf(
      AppException
    );
  });
});
