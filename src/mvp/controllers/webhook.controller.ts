import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { CallStatusType } from 'src/types';
import { logger } from '../../utils/logger';
import { CallEndDto } from '../dto/call-end.dto';
import { CallEventDto } from '../dto/call-event.dto';
import { CallRequestDto } from '../dto/call-request.dto';
import { IvrResponseDto } from '../dto/ivr-response.dto';
import { CallService } from '../services/call.service';

@Controller('call')
export class WebhookController {
  constructor(@Inject() private callService: CallService) {}
  @Post('/start')
  async handleCallRequest(@Body() request: CallRequestDto) {
    const callId = await this.callService.initiateCall(request);

    return { call_id: callId };
  }

  @Post('/ivr')
  async handleIVRResponse(@Body() request: IvrResponseDto) {
    try {
      const { call_id, audio_data } = request;

      await this.callService.handleIVRResponse(call_id, audio_data);

      return { status: 'success' };
    } catch (error) {
      await logger.error(
        this.constructor.name,
        `Error handling IVR response: ${JSON.stringify(error)}`,
      );
      throw error;
    }
  }

  @Post('/end')
  async handleCallEnd(@Body() request: CallEndDto) {
    const { call_id, status, notes } = request;

    // Validate status is a valid CallStatusType
    const validStatuses: CallStatusType[] = [
      'completed',
      'partial_transfer',
      'missed_by_staff',
      'delayed_join',
      'ivr_failed',
      'telnyx_error',
      'timeout_waiting_for_human',
      'no_answer',
      'disconnected',
      'cancelled_by_user',
    ];

    if (!validStatuses.includes(status as CallStatusType)) {
      throw new HttpException('Invalid status value', HttpStatus.BAD_REQUEST);
    }

    await this.callService.endCall(call_id, status as CallStatusType, notes);

    return { status: 'success' };
  }

  @Post('/events')
  async handleCallEvent(@Body() body: { data: CallEventDto }) {
    const { payload, event_type } = body.data;

    await logger.info(
      this.constructor.name,
      `Received Telnyx event: ${event_type}`,
    );

    const eventType = event_type;
    const callControlId = payload?.call_control_id;
    const transcriptionText = payload?.transcription?.text;
    const clientState = payload?.client_state;

    // Optional: Log call_control_id to trace the call
    await logger.debug(
      this.constructor.name,
      `Telnyx Call Control ID: ${callControlId}`,
    );

    const callId = this.callService.getCallIdFromTelnyxId(callControlId);
    if (!callId) {
      throw new HttpException('Call ID not found', HttpStatus.BAD_REQUEST);
    }

    // Handle key events
    switch (eventType) {
      case 'call.transcription.received':
        if (transcriptionText) {
          try {
            await this.callService.handleIVRResponse(callId, transcriptionText);
          } catch (error) {
            await logger.error(
              this.constructor.name,
              `Transcription handler failed: ${error}`,
            );
            throw new HttpException(
              'Internal Server Error',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }
        }
        break;
      case 'call.hangup':
      case 'call.ended':
        if (clientState)
          await this.callService.endCall(clientState, 'completed');
        break;
      default:
        await logger.warn(
          this.constructor.name,
          `Invalid event type: ${eventType}`,
        );
        break;
    }

    return { status: 'received' };
  }
}
