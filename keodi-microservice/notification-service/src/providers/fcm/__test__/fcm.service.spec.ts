import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as admin from 'firebase-admin';
import { FcmService } from '../fcm.service';

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn().mockReturnValue({}) },
  messaging: jest.fn(),
}));

describe('FcmService', () => {
  let service: FcmService;

  const mockSubscribeToTopic = jest.fn();
  const mockUnsubscribeFromTopic = jest.fn();
  const mockSend = jest.fn();
  const mockSendEachForMulticast = jest.fn();

  beforeEach(async () => {
    (admin.messaging as jest.Mock).mockReturnValue({
      subscribeToTopic: mockSubscribeToTopic,
      unsubscribeFromTopic: mockUnsubscribeFromTopic,
      send: mockSend,
      sendEachForMulticast: mockSendEachForMulticast,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FcmService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-value') },
        },
      ],
    }).compile();

    service = module.get<FcmService>(FcmService);
    service.onModuleInit();
  });

  afterEach(() => jest.clearAllMocks());

  // ---- subscribeToTopic ----

  describe('subscribeToTopic', () => {
    it('calls admin.messaging().subscribeToTopic with the given tokens and topic', async () => {
      mockSubscribeToTopic.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
      });

      await service.subscribeToTopic(['tok-1', 'tok-2'], 'user-abc');

      expect(mockSubscribeToTopic).toHaveBeenCalledWith(
        ['tok-1', 'tok-2'],
        'user-abc',
      );
    });

    it('returns early without calling FCM when tokens array is empty', async () => {
      await service.subscribeToTopic([], 'user-abc');

      expect(mockSubscribeToTopic).not.toHaveBeenCalled();
    });

    it('swallows FCM errors and does not throw', async () => {
      mockSubscribeToTopic.mockRejectedValue(new Error('FCM unavailable'));

      await expect(
        service.subscribeToTopic(['tok-1'], 'user-abc'),
      ).resolves.toBeUndefined();
    });
  });

  // ---- unsubscribeFromTopic ----

  describe('unsubscribeFromTopic', () => {
    it('calls admin.messaging().unsubscribeFromTopic with the given tokens and topic', async () => {
      mockUnsubscribeFromTopic.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
      });

      await service.unsubscribeFromTopic(['tok-1'], 'user-abc');

      expect(mockUnsubscribeFromTopic).toHaveBeenCalledWith(
        ['tok-1'],
        'user-abc',
      );
    });

    it('returns early without calling FCM when tokens array is empty', async () => {
      await service.unsubscribeFromTopic([], 'user-abc');

      expect(mockUnsubscribeFromTopic).not.toHaveBeenCalled();
    });

    it('swallows FCM errors and does not throw', async () => {
      mockUnsubscribeFromTopic.mockRejectedValue(new Error('FCM unavailable'));

      await expect(
        service.unsubscribeFromTopic(['tok-1'], 'user-abc'),
      ).resolves.toBeUndefined();
    });
  });

  // ---- sendToTopic ----

  describe('sendToTopic', () => {
    it('calls admin.messaging().send with topic, notification, and data', async () => {
      mockSend.mockResolvedValue('msg-id-1');

      await service.sendToTopic('user-123', {
        title: 'Hello',
        body: 'World',
        data: { key: 'value' },
      });

      expect(mockSend).toHaveBeenCalledWith({
        topic: 'user-123',
        notification: { title: 'Hello', body: 'World' },
        data: { key: 'value' },
      });
    });

    it('calls admin.messaging().send without data when data is undefined', async () => {
      mockSend.mockResolvedValue('msg-id-2');

      await service.sendToTopic('user-456', { title: 'T', body: 'B' });

      expect(mockSend).toHaveBeenCalledWith({
        topic: 'user-456',
        notification: { title: 'T', body: 'B' },
        data: undefined,
      });
    });

    it('propagates FCM errors (does not swallow them)', async () => {
      mockSend.mockRejectedValue(new Error('send failed'));

      await expect(
        service.sendToTopic('user-123', { title: 'T', body: 'B' }),
      ).rejects.toThrow('send failed');
    });
  });
});
