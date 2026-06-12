import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { SessionsService } from '../../sessions/sessions.service';
import { UsersRepository } from '../../users/users.repository';
import { RequestWithUser } from '../auth.types';
import { AppException } from '../../../common/exceptions/app-exceptions';

const session = { id: 'sess-1', userId: 'user-1' };
const user = { id: 'user-1', status: 'active', role: 'customer' };

interface Setup {
  guard: AuthGuard;
  reflector: jest.Mocked<Reflector>;
  sessionsService: jest.Mocked<SessionsService>;
  usersRepository: jest.Mocked<UsersRepository>;
  request: RequestWithUser;
  context: ExecutionContext;
}

function makeSetup(
  authorization?: string,
  cookies?: Record<string, string>
): Setup {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(undefined),
  } as unknown as jest.Mocked<Reflector>;
  const sessionsService = {
    validate: jest.fn().mockResolvedValue(session),
  } as unknown as jest.Mocked<SessionsService>;
  const usersRepository = {
    findById: jest.fn().mockResolvedValue(user),
  } as unknown as jest.Mocked<UsersRepository>;

  const request = {
    headers: authorization ? { authorization } : {},
    ...(cookies ? { cookies } : {}),
  } as RequestWithUser;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  return {
    guard: new AuthGuard(reflector, sessionsService, usersRepository),
    reflector,
    sessionsService,
    usersRepository,
    request,
    context,
  };
}

describe('AuthGuard', () => {
  it('route @Public() lolos tanpa menyentuh sesi', async () => {
    const setup = makeSetup();
    setup.reflector.getAllAndOverride.mockReturnValue(true);

    await expect(setup.guard.canActivate(setup.context)).resolves.toBe(true);
    expect(setup.sessionsService.validate).not.toHaveBeenCalled();
  });

  it('tanpa header Authorization → AUTH_TOKEN_MISSING', async () => {
    const setup = makeSetup();
    await expect(setup.guard.canActivate(setup.context)).rejects.toBeInstanceOf(
      AppException
    );
  });

  it('scheme selain Bearer ditolak', async () => {
    const setup = makeSetup('Basic abc123');
    await expect(setup.guard.canActivate(setup.context)).rejects.toBeInstanceOf(
      AppException
    );
  });

  it('token valid → request.user & sessionToken terisi', async () => {
    const setup = makeSetup('Bearer token-abc');

    await expect(setup.guard.canActivate(setup.context)).resolves.toBe(true);
    expect(setup.sessionsService.validate).toHaveBeenCalledWith('token-abc');
    expect(setup.request.user).toEqual(user);
    expect(setup.request.sessionToken).toBe('token-abc');
  });

  it('fallback cookie httpOnly bila header Authorization tidak ada', async () => {
    const setup = makeSetup(undefined, { sessionToken: 'cookie-token' });

    await expect(setup.guard.canActivate(setup.context)).resolves.toBe(true);
    expect(setup.sessionsService.validate).toHaveBeenCalledWith('cookie-token');
    expect(setup.request.sessionToken).toBe('cookie-token');
  });

  it('Bearer header menang atas cookie bila keduanya ada', async () => {
    const setup = makeSetup('Bearer header-token', {
      sessionToken: 'cookie-token',
    });

    await expect(setup.guard.canActivate(setup.context)).resolves.toBe(true);
    expect(setup.sessionsService.validate).toHaveBeenCalledWith('header-token');
  });

  it('user suspended ditolak walau sesi valid', async () => {
    const setup = makeSetup('Bearer token-abc');
    setup.usersRepository.findById.mockResolvedValue({
      ...user,
      status: 'suspended',
    } as never);

    await expect(setup.guard.canActivate(setup.context)).rejects.toBeInstanceOf(
      AppException
    );
  });
});
