import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { SessionsService } from '../sessions/sessions.service';
import { GoogleProfile, GoogleTokenVerifier } from './google-token.verifier';
import { AppException } from '../../common/exceptions/app-exceptions';
import { SelectUser } from '../../infrastructure/database/schema';
import { UserResponseDto } from '../users/dto/response-user.dto';

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

const profile: GoogleProfile = {
  sub: 'google-sub-1',
  email: 'budi@example.com',
  emailVerified: true,
  name: 'Budi',
  picture: 'https://lh3.googleusercontent.com/a/abc',
  locale: 'id',
};

const meta = { userAgent: 'jest', ipAddress: '127.0.0.1' };

interface Mocks {
  usersService: jest.Mocked<UsersService>;
  usersRepository: jest.Mocked<UsersRepository>;
  sessionsService: jest.Mocked<SessionsService>;
  verifier: jest.Mocked<GoogleTokenVerifier>;
}

function makeMocks(): Mocks {
  return {
    usersService: {
      createUser: jest
        .fn()
        .mockResolvedValue(new UserResponseDto({ id: user.id })),
      findById: jest
        .fn()
        .mockResolvedValue(new UserResponseDto({ id: user.id })),
    } as unknown as jest.Mocked<UsersService>,
    usersRepository: {
      findByEmail: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue(user),
    } as unknown as jest.Mocked<UsersRepository>,
    sessionsService: {
      create: jest.fn().mockResolvedValue({
        session: { expiresAt: new Date(Date.now() + 1000) },
        token: 'plain-token',
      }),
    } as unknown as jest.Mocked<SessionsService>,
    verifier: {
      verify: jest.fn().mockResolvedValue(profile),
    },
  };
}

function makeService(mocks: Mocks): AuthService {
  return new AuthService(
    mocks.usersService,
    mocks.usersRepository,
    mocks.sessionsService,
    mocks.verifier
  );
}

function makeRes(): jest.Mocked<Response> {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as jest.Mocked<Response>;
}

describe('AuthService.login', () => {
  let mocks: Mocks;
  let service: AuthService;
  let res: jest.Mocked<Response>;

  beforeEach(() => {
    mocks = makeMocks();
    service = makeService(mocks);
    res = makeRes();
  });

  it('menolak email tak terdaftar dengan pesan generik', async () => {
    await expect(
      service.login({ email: 'x@y.co', password: 'apapun-123' }, meta, res)
    ).rejects.toBeInstanceOf(AppException);
  });

  it('menolak akun OAuth-only (tanpa password)', async () => {
    mocks.usersRepository.findByEmail.mockResolvedValue(user);
    await expect(
      service.login({ email: user.email, password: 'apapun-123' }, meta, res)
    ).rejects.toBeInstanceOf(AppException);
  });

  it('menolak password salah', async () => {
    mocks.usersRepository.findByEmail.mockResolvedValue({
      ...user,
      password: await bcrypt.hash('benar-123', 4),
    });
    await expect(
      service.login({ email: user.email, password: 'salah-123' }, meta, res)
    ).rejects.toBeInstanceOf(AppException);
    expect(mocks.sessionsService.create).not.toHaveBeenCalled();
  });

  it('menolak akun suspended walau password benar', async () => {
    mocks.usersRepository.findByEmail.mockResolvedValue({
      ...user,
      status: 'suspended',
      password: await bcrypt.hash('benar-123', 4),
    });
    await expect(
      service.login({ email: user.email, password: 'benar-123' }, meta, res)
    ).rejects.toBeInstanceOf(AppException);
  });

  it('menerbitkan sesi + mencatat lastLoginAt saat sukses', async () => {
    mocks.usersRepository.findByEmail.mockResolvedValue({
      ...user,
      password: await bcrypt.hash('benar-123', 4),
    });

    const result = await service.login(
      { email: user.email, password: 'benar-123' },
      meta,
      res
    );

    expect(result.token).toBe('plain-token');
    expect(mocks.usersRepository.update).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({ lastLoginAt: expect.any(Date) as Date })
    );
    // Transport kedua: token juga di-set sebagai cookie httpOnly.
    expect(res.cookie).toHaveBeenCalledWith(
      'sessionToken',
      'plain-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      })
    );
  });
});

describe('AuthService.loginWithGoogle', () => {
  let mocks: Mocks;
  let service: AuthService;
  let res: jest.Mocked<Response>;

  beforeEach(() => {
    mocks = makeMocks();
    service = makeService(mocks);
    res = makeRes();
  });

  it('mendaftarkan user baru tanpa password (OAuth-only)', async () => {
    const result = await service.loginWithGoogle(
      { credential: 'gis-credential' },
      meta,
      res
    );

    expect(mocks.usersRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: profile.email,
        password: null,
        emailIsVerified: true,
      })
    );
    expect(result.token).toBe('plain-token');
  });

  it('user existing tidak diduplikasi — metadata di-update', async () => {
    mocks.usersRepository.findByEmail.mockResolvedValue(user);

    await service.loginWithGoogle({ credential: 'gis-credential' }, meta, res);

    expect(mocks.usersRepository.insert).not.toHaveBeenCalled();
    expect(mocks.usersRepository.update).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        oauthMetadata: expect.objectContaining({ provider: 'google' }) as {
          provider: string;
        },
        emailIsVerified: true,
      })
    );
  });

  it('menolak akun suspended sebelum sesi terbit', async () => {
    mocks.usersRepository.findByEmail.mockResolvedValue({
      ...user,
      status: 'suspended',
    });
    await expect(
      service.loginWithGoogle({ credential: 'gis-credential' }, meta, res)
    ).rejects.toBeInstanceOf(AppException);
    expect(mocks.sessionsService.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.register', () => {
  it('tidak pernah meneruskan role (anti eskalasi)', async () => {
    const mocks = makeMocks();
    const service = makeService(mocks);
    const res = makeRes();

    await service.register(
      { email: user.email, name: user.name, password: 'rahasia-123' },
      meta,
      res
    );

    const passed = mocks.usersService.createUser.mock.calls[0][0];
    expect(passed).not.toHaveProperty('role');
  });
});
