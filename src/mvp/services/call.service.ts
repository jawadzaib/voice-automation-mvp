import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/call.config';
import {
  CallStatus,
  CallStatusType,
  HumanDetectedPayload,
  TelnyxCallResponse,
} from 'src/types';
import { logger } from '../../utils/logger';
import { CallRequestDto } from '../dto/call-request.dto';

@Injectable()
export class CallService {
  private geminiModel: GenerativeModel;
  private activeCalls: Map<string, CallStatus>;
  private telnyxApiKey: string;
  private serviceName: string;

  constructor() {
    this.geminiModel = new GoogleGenerativeAI(
      config.geminiApiKey,
    ).getGenerativeModel({ model: 'gemini-pro' });
    this.activeCalls = new Map();
    this.serviceName = 'CallService';
    this.telnyxApiKey = config.telnyxApiKey;
  }

  async initiateCall(request: CallRequestDto): Promise<string> {
    const callId = `call_${Date.now()}`;
    const callStatus: CallStatus = {
      call_id: callId,
      timestamp_start: new Date().toISOString(),
      office_id: request.office_id,
      patient_ref: request.patient_ref,
      status: 'pending',
      ivr_transcript: [],
      bot_dialogue: [],
    };

    this.activeCalls.set(callId, callStatus);
    await logger.info(
      this.serviceName,
      `Initiating call ${callId} to ${request.insurance_phone_number}`,
    );

    try {
      await this.startTelnyxCall(callId, request.insurance_phone_number);
      return callId;
    } catch (error) {
      await logger.error(
        this.serviceName,
        `Failed to initiate call ${callId}:`,
      );
      this.activeCalls.delete(callId);
      throw error;
    }
  }

  async handleIVRResponse(callId: string, audioData: string): Promise<void> {
    const callStatus = this.activeCalls.get(callId);
    if (!callStatus) {
      throw new Error(`Call ${callId} not found`);
    }

    try {
      const response = await this.geminiModel.generateContent(
        `Analyze this IVR response and determine the next action: ${audioData}`,
      );

      const action = response.response.text();

      callStatus.ivr_transcript?.push({
        timestamp: new Date().toISOString(),
        heard: audioData,
        bot_action: action,
      });

      if (this.isHumanResponse(action)) {
        await this.handleHumanDetected(callId);
      } else {
        await this.handleIVRAction(callId, action);
      }

      this.activeCalls.set(callId, callStatus);
    } catch (error) {
      await logger.error(
        this.serviceName,
        `Error processing IVR response for call ${callId}: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  async endCall(
    callId: string,
    status: CallStatusType,
    notes?: string,
  ): Promise<void> {
    const callStatus = this.activeCalls.get(callId);
    if (!callStatus) {
      throw new Error(`Call ${callId} not found`);
    }

    try {
      // End the call in Telnyx if it's still active
      if (callStatus.telnyx_call_id) {
        await this.makeTelnyxRequest(
          `/calls/${callStatus.telnyx_call_id}/actions/hangup`,
          'POST',
        );
      }

      callStatus.timestamp_end = new Date().toISOString();
      callStatus.status = status;
      callStatus.notes = notes;

      const startTime = new Date(callStatus.timestamp_start).getTime();
      const endTime = new Date(callStatus.timestamp_end).getTime();
      callStatus.duration_seconds = Math.floor((endTime - startTime) / 1000);

      await axios.post(config.callCompletedWebhookUrl, callStatus);

      this.activeCalls.delete(callId);
      await logger.info(
        this.serviceName,
        `Call ${callId} ended with status ${status}`,
      );
    } catch (error) {
      await logger.error(
        this.serviceName,
        `Error ending call ${callId}: ${error}`,
      );
      throw error;
    }
  }

  getCallIdFromTelnyxId(telnyxCallId: string): string | undefined {
    for (const [callId, status] of this.activeCalls.entries()) {
      if (status.telnyx_call_id === telnyxCallId) {
        return callId;
      }
    }

    return undefined;
  }

  private async startTelnyxCall(
    callId: string,
    phoneNumber: string,
  ): Promise<void> {
    const call = await this.makeTelnyxRequest<TelnyxCallResponse>(
      '/calls',
      'POST',
      {
        connection_id: config.telnyxConnectionId,
        to: phoneNumber,
        from: '+18885551234', // Your Telnyx phone number
        webhook_url: `${process.env.BASE_URL}/call/events`,
        webhook_url_method: 'POST',
        client_state: callId,
        audio_url: this.getInitialGreetingUrl(),
        timeout_secs: 30,
        time_limit_secs: 3600,
        answering_machine_detection: 'premium',
        media_encryption: 'SRTP',
        sip_headers: [
          {
            name: 'User-to-User',
            value: callId,
          },
        ],
        sip_transport_protocol: 'UDP',
        stream_track: 'both_tracks',
        send_silence_when_idle: true,
        record_channels: 'dual',
        record_format: 'mp3',
        record_trim: 'trim-silence',
        transcription_config: {
          enabled: true,
          language: 'en',
        },
      },
    );

    if (call && call.data) {
      await logger.info(
        this.serviceName,
        `Telnyx call initiated: ${call.data.call_control_id}`,
      );

      // Update call status with Telnyx call ID
      const callStatus = this.activeCalls.get(callId);
      if (callStatus) {
        callStatus.telnyx_call_id = call.data.call_control_id;
        this.activeCalls.set(callId, callStatus);
      }
    }
  }

  private async makeTelnyxRequest<T>(
    endpoint: string,
    method: string,
    data?: unknown,
  ): Promise<{ data: T }> {
    try {
      const response = await axios<{ data: T }>({
        method,
        url: `https://api.telnyx.com/v2${endpoint}`,
        headers: {
          Authorization: `Bearer ${this.telnyxApiKey}`,
          'Content-Type': 'application/json',
        },
        data,
      });

      return response.data;
    } catch (error) {
      await logger.error(
        this.serviceName,
        `Telnyx API error: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  private getInitialGreetingUrl(): string {
    // This would typically point to an audio file with your initial greeting
    // For development, you can use a placeholder URL
    return `${process.env.BASE_URL}/audio/greeting.mp3`;
  }

  private isHumanResponse(response: string): boolean {
    return (
      response.toLowerCase().includes('human') ||
      response.toLowerCase().includes('representative') ||
      response.toLowerCase().includes('agent')
    );
  }

  private async handleHumanDetected(callId: string): Promise<void> {
    const callStatus = this.activeCalls.get(callId);
    if (!callStatus) {
      throw new Error(`Call ${callId} not found`);
    }

    const payload: HumanDetectedPayload = {
      call_id: callId,
      timestamp: new Date().toISOString(),
      office_id: callStatus.office_id,
      patient_ref: callStatus.patient_ref,
      join_link: `tel:${callStatus.office_id},,${callId}#`,
      notes: 'Live person detected, ready to transfer',
    };

    try {
      await axios.post(config.humanDetectedWebhookUrl, payload);

      callStatus.status = 'waiting_for_staff';
      this.activeCalls.set(callId, callStatus);

      await logger.info(
        this.serviceName,
        `Human detected for call ${callId}, webhook sent`,
      );
    } catch (error) {
      await logger.error(
        this.serviceName,
        `Error sending human detected webhook for call ${callId}: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  private async handleIVRAction(callId: string, action: string): Promise<void> {
    const callStatus = this.activeCalls.get(callId);
    if (!callStatus || !callStatus.telnyx_call_id) {
      throw new Error(`Call ${callId} not found or missing Telnyx ID`);
    }

    // Parse the action to determine what to do
    if (action.includes('press')) {
      const digit = action.match(/\d+/)?.[0];
      if (digit) {
        await this.sendDTMF(callStatus.telnyx_call_id, digit);
      }
    } else if (action.includes('say')) {
      const text = action.split('say:')[1]?.trim();
      if (text) {
        await this.speakText(callStatus.telnyx_call_id, text);
      }
    }
  }

  private async sendDTMF(callId: string, digit: string): Promise<void> {
    try {
      await this.makeTelnyxRequest(`/calls/${callId}/actions/dtmf`, 'POST', {
        digits: digit,
      });
      await logger.info(
        this.serviceName,
        `Sent DTMF ${digit} for call ${callId}`,
      );
    } catch (error) {
      await logger.error(
        this.serviceName,
        `Error sending DTMF for call ${callId}: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  private async speakText(callId: string, text: string): Promise<void> {
    try {
      await this.makeTelnyxRequest(`/calls/${callId}/actions/speak`, 'POST', {
        payload: text,
        payload_type: 'text',
        service_level: 'premium',
        voice: 'female',
        language: 'en',
      });
      await logger.info(
        this.serviceName,
        `Spoke text for call ${callId}: ${text}`,
      );
    } catch (error) {
      await logger.error(
        this.serviceName,
        `Error speaking text for call ${callId}: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  }
}
