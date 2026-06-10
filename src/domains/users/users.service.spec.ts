import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    const repo = {
      insert: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
    } as unknown as UsersRepository;
    service = new UsersService(repo);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
