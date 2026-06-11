import { ConfigService } from '@nestjs/config';
import { DummyPaymentGateway } from './dummy-payment.gateway';
import { PaymentWebhookEvent } from './payment-gateway.interface';

const SECRET = 'test-secret';

function makeGateway(): DummyPaymentGateway {
  const config = {
    getOrThrow: jest.fn().mockReturnValue(SECRET),
  } as unknown as ConfigService;
  return new DummyPaymentGateway(config);
}

const event: PaymentWebhookEvent = {
  orderId: '019527aa-0000-7000-8000-000000000001',
  status: 'SUCCEEDED',
  amount: 150000,
  externalId: null,
};

describe('DummyPaymentGateway', () => {
  it('initiate menghasilkan paymentCode dari orderNumber', async () => {
    const gateway = makeGateway();
    const initiation = await gateway.initiate({
      orderId: event.orderId,
      orderNumber: 'ORD-20260611-ABC123',
      amount: 150000,
      customerEmail: 'a@b.co',
    });
    expect(initiation.paymentCode).toBe('PAY-ORD-20260611-ABC123');
    expect(initiation.externalId).toBeNull();
  });

  it('menerima signature yang valid', () => {
    const gateway = makeGateway();
    const signature = gateway.buildSignature(event);
    expect(gateway.verifySignature(event, signature)).toBe(true);
  });

  it('menolak signature yang salah', () => {
    const gateway = makeGateway();
    expect(gateway.verifySignature(event, 'deadbeef')).toBe(false);
  });

  it('menolak signature event yang dimodifikasi (amount diubah)', () => {
    const gateway = makeGateway();
    const signature = gateway.buildSignature(event);
    expect(gateway.verifySignature({ ...event, amount: 1 }, signature)).toBe(
      false
    );
  });
});
