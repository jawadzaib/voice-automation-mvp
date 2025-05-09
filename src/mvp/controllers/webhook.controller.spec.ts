import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { CallService } from '../services/call.service';
import { HttpException } from '@nestjs/common';

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('WebhookController', () => {
  let controller: WebhookController;
  let mockCallService: CallService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: CallService,
          useValue: {
            initiateCall: jest.fn(),
            handleIVRResponse: jest.fn(),
            endCall: jest.fn(),
            getCallIdFromTelnyxId: jest.fn(),
          }, // no need to mock `handleIVRResponse` here directly
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    mockCallService = module.get(CallService); // Retrieve the actual service for spying
  });

  describe('POST /events', () => {
    it('should handle transcription event', async () => {
      // Spy on the handleIVRResponse method
      const spyHandleIVRResponse = jest
        .spyOn(mockCallService, 'handleIVRResponse')
        .mockResolvedValue(undefined);
      jest
        .spyOn(mockCallService, 'getCallIdFromTelnyxId')
        .mockReturnValue('call-id');

      await expect(
        controller.handleCallEvent({
          data: {
            event_type: 'call.transcription.received',
            payload: {
              call_control_id: 'some-id',
              transcription: { text: 'Hello' },
            },
          },
        }),
      ).resolves.toEqual({ status: 'received' });

      // Check if the spy was called with the expected arguments
      expect(spyHandleIVRResponse).toHaveBeenCalledWith('call-id', 'Hello');
    });

    it('should log error and throw if transcription handler fails', async () => {
      const error = new Error('fail');
      const spyHandleIVRResponse = jest
        .spyOn(mockCallService, 'handleIVRResponse')
        .mockRejectedValue(error);
      jest
        .spyOn(mockCallService, 'getCallIdFromTelnyxId')
        .mockReturnValue('call-id');

      await expect(
        controller.handleCallEvent({
          data: {
            event_type: 'call.transcription.received',
            payload: {
              call_control_id: 'some-id',
              transcription: { text: 'Hello' },
            },
          },
        }),
      ).rejects.toThrow(HttpException);

      // Verify handleIVRResponse was called even when an error occurred
      expect(spyHandleIVRResponse).toHaveBeenCalled();
    });

    // Additional tests...
  });
});
