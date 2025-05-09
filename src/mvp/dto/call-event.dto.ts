import { CallEventPayload } from 'src/types';

export class CallEventDto {
  event_type: string;
  payload: CallEventPayload;
}
