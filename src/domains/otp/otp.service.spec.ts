import { OtpService } from './otp.service';
import { OtpRepository } from './otp.repository';

describe('OtpService', () => {
  let service: OtpService;

  beforeEach(() => {
    const repo = {
      saveOtp: jest.fn(),
      findActiveOtp: jest.fn(),
      markUsed: jest.fn(),
      incrementAttempts: jest.fn(),
    } as unknown as OtpRepository;
    service = new OtpService(repo);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
