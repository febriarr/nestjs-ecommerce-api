import { SessionsService } from './sessions.service';
import { SessionsRepository } from './sessions.repository';

describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(() => {
    const repo = {
      create: jest.fn(),
      findByToken: jest.fn(),
      revoke: jest.fn(),
    } as unknown as SessionsRepository;
    service = new SessionsService(repo);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
