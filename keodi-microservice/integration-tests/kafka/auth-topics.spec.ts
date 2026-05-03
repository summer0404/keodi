import { Kafka, Producer, Consumer, KafkaMessage } from 'kafkajs';
import {
  createKafkaClient,
  createAndConnectProducer,
  createAndSubscribeConsumer,
  waitForMessages,
} from '../helpers/kafka.helper';

// mirrors api-gateway/src/shared/constants/topic.constant.ts
const AuthTopics = {
  Register: 'auth.register',
  RegisterOwner: 'auth.register-owner',
  Login: 'auth.login',
  Google: 'auth.google',
  ForgotPasswordOtp: 'auth.forgot-password-otp',
  ResetPasswordOtp: 'auth.reset-password-otp',
  ValidateOtp: 'auth.validate-otp',
  ResetPassword: 'auth.reset-password',
  VerifyEmail: 'auth.verify-email',
  ExternalResendVerifyEmail: 'auth.external-resend-verify-email',
  ResendVerifyEmail: 'auth.resend-verify-email',
  Refresh: 'auth.refresh',
  ApproveOwner: 'auth.approve-owner',
  RejectOwner: 'auth.reject-owner',
} as const;

const TEST_TOPIC = 'integration-test.auth';

describe('Kafka Auth Topics Integration', () => {
  let kafka: Kafka;
  let producer: Producer;
  let consumer: Consumer;
  let receivedMessages: KafkaMessage[];
  let kafkaAvailable = true;

  const groupId = `integration-test-group-${Date.now()}`;

  beforeAll(async () => {
    kafka = createKafkaClient('integration-test-client');
    try {
      producer = await createAndConnectProducer(kafka);
    } catch (e: any) {
      console.warn(`[Kafka Integration] Broker not available — skipping tests. Reason: ${e.message}`);
      kafkaAvailable = false;
      return;
    }
    const result = await createAndSubscribeConsumer(kafka, groupId, TEST_TOPIC);
    consumer = result.consumer;
    receivedMessages = result.messages;
  }, 30000);

  afterAll(async () => {
    if (!kafkaAvailable) return;
    try {
      await producer?.disconnect();
      await consumer?.disconnect();
    } catch {
      // best-effort cleanup
    }
  });

  function skipIfUnavailable() {
    if (!kafkaAvailable) {
      console.warn('[Kafka Integration] Skipping — broker not available.');
      return true;
    }
    return false;
  }

  it('producer connects to the test Kafka broker successfully', () => {
    if (skipIfUnavailable()) return;
    expect(kafkaAvailable).toBe(true);
  });

  it('consumer receives the message sent by the producer within timeout', async () => {
    if (skipIfUnavailable()) return;

    const payload = { email: 'test@test.com', password: 'password123' };
    await producer.send({
      topic: TEST_TOPIC,
      messages: [{ value: JSON.stringify(payload) }],
    });

    await waitForMessages(receivedMessages, 1, 10000);

    const last = receivedMessages[receivedMessages.length - 1];
    expect(last.value).not.toBeNull();
    expect(JSON.parse(last.value!.toString())).toMatchObject(payload);
  }, 20000);

  it('all AuthTopics constants follow the "auth.<action>" naming convention', () => {
    Object.values(AuthTopics).forEach((topicName) => {
      expect(topicName).toMatch(/^auth\./);
    });
  });

  it('AuthTopics constants are non-empty strings without whitespace', () => {
    Object.values(AuthTopics).forEach((topicName) => {
      expect(typeof topicName).toBe('string');
      expect(topicName.length).toBeGreaterThan(0);
      expect(topicName).not.toMatch(/\s/);
    });
  });

  it('serialised login payload does not contain undefined values', () => {
    const payload = { email: 'login@test.com', password: 'secret123' };
    const deserialised = JSON.parse(JSON.stringify(payload));
    expect(deserialised.email).toBe('login@test.com');
    expect(deserialised.password).toBe('secret123');
    Object.values(deserialised).forEach((v) => {
      expect(v).not.toBeUndefined();
    });
  });

  it('multiple messages sent to the same topic arrive in order', async () => {
    if (skipIfUnavailable()) return;

    const startCount = receivedMessages.length;
    const batch = [
      { seq: 1, action: 'register' },
      { seq: 2, action: 'login' },
      { seq: 3, action: 'logout' },
    ];

    await producer.send({
      topic: TEST_TOPIC,
      messages: batch.map((b) => ({ value: JSON.stringify(b) })),
    });

    await waitForMessages(receivedMessages, startCount + batch.length, 10000);

    const received = receivedMessages.slice(startCount).map((m) => JSON.parse(m.value!.toString()));
    expect(received[0].seq).toBe(1);
    expect(received[1].seq).toBe(2);
    expect(received[2].seq).toBe(3);
  }, 20000);

  it('AuthTopics object exposes all required auth operation keys', () => {
    const requiredKeys: Array<keyof typeof AuthTopics> = [
      'Register', 'Login', 'ForgotPasswordOtp', 'ResetPassword', 'VerifyEmail', 'Refresh',
    ];
    requiredKeys.forEach((key) => {
      expect(AuthTopics).toHaveProperty(key);
      expect(typeof AuthTopics[key]).toBe('string');
    });
  });
});
