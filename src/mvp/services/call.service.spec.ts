import { CallService } from './call.service';
import axios from 'axios';
import { logger } from '../../utils/logger';
import { CallRequestDto } from '../dto/call-request.dto';

interface AxiosResponseData {
  data: {
    data: {
      call_control_id: string;
    };
  };
}

jest.mock('axios');
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest
          .fn()
          .mockResolvedValue({ response: { text: () => 'say: Hello' } }),
      }),
    })),
  };
});
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('CallService', () => {
  let service: CallService;

  beforeEach(() => {
    service = new CallService();
    process.env.BASE_URL = 'https://example.com';
  });

  it('should initiate a call and return callId', async () => {
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: { data: { call_control_id: 'telnyx-id' } },
    } as AxiosResponseData); //

    const dto: CallRequestDto = {
      insurance_phone_number: '+1234567890',
      office_id: 'office123',
      patient_ref: 'patientABC',
      insurance_name: '',
    };

    const callId = await service.initiateCall(dto);

    expect(callId).toContain('call_');
    expect(logger.info).toHaveBeenCalled();
  });

  it('should throw if Telnyx call fails', async () => {
    (axios as unknown as jest.Mock).mockRejectedValue(new Error('fail'));

    const dto: CallRequestDto = {
      insurance_phone_number: '+1234567890',
      office_id: 'office123',
      patient_ref: 'patientABC',
      insurance_name: '',
    };

    await expect(service.initiateCall(dto)).rejects.toThrow('fail');
  });

  it('should handle IVR response with action', async () => {
    const callId = 'call_123';

    // Set up a valid call status with telnyx_call_id
    service['activeCalls'].set(callId, {
      call_id: callId,
      timestamp_start: new Date().toISOString(),
      office_id: 'office123',
      patient_ref: 'patientABC',
      status: 'pending',
      ivr_transcript: [],
      bot_dialogue: [],
      telnyx_call_id: 'telnyx_456', // ✅ Required for handleIVRAction
    });

    // Mock Gemini model and axios
    (axios as unknown as jest.Mock).mockResolvedValue({});
    service['geminiModel'].generateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => 'press 1',
      },
    });

    await service.handleIVRResponse(callId, 'test audio');

    expect(logger.info).toHaveBeenCalled();
  });

  it('should throw if call not found on handleIVRResponse', async () => {
    await expect(
      service.handleIVRResponse('missing', 'data'),
    ).rejects.toThrow();
  });

  it('should end a call and post webhook', async () => {
    const callId = 'call_456';
    const start = new Date().toISOString();
    service['activeCalls'].set(callId, {
      call_id: callId,
      timestamp_start: start,
      office_id: 'officeX',
      patient_ref: 'refX',
      status: 'pending',
      ivr_transcript: [],
      bot_dialogue: [],
      telnyx_call_id: 'telnyx-id',
    });

    (axios as unknown as jest.Mock).mockResolvedValue({});

    await service.endCall(callId, 'completed');

    expect(logger.info).toHaveBeenCalledWith(
      'CallService',
      expect.stringContaining('Call call_456 ended'),
    );
  });

  it('should throw if call not found on endCall', async () => {
    await expect(service.endCall('not_found', 'completed')).rejects.toThrow();
  });

  it('getCallIdFromTelnyxId should return callId', () => {
    service['activeCalls'].set('call_789', {
      call_id: 'call_789',
      timestamp_start: new Date().toISOString(),
      office_id: 'office',
      patient_ref: 'ref',
      status: 'pending',
      ivr_transcript: [],
      bot_dialogue: [],
      telnyx_call_id: 'telnyx-789',
    });

    expect(service.getCallIdFromTelnyxId('telnyx-789')).toBe('call_789');
  });

  it('getCallIdFromTelnyxId should return undefined for unknown ID', () => {
    expect(service.getCallIdFromTelnyxId('unknown')).toBeUndefined();
  });
});
