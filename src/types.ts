export interface CallStatus {
  call_id: string;
  timestamp_start: string;
  timestamp_end?: string;
  duration_seconds?: number;
  office_id: string;
  patient_ref: string;
  status: CallStatusType;
  staff_join_timestamp?: string;
  seconds_waiting_for_staff?: number;
  notes?: string;
  ivr_transcript?: IVRTranscriptEntry[];
  bot_dialogue?: BotDialogueEntry[];
  telnyx_call_id?: string;
}

export type CallStatusType =
  | 'pending'
  | 'waiting_for_staff'
  | 'completed'
  | 'partial_transfer'
  | 'missed_by_staff'
  | 'delayed_join'
  | 'ivr_failed'
  | 'telnyx_error'
  | 'timeout_waiting_for_human'
  | 'no_answer'
  | 'disconnected'
  | 'cancelled_by_user';

export interface IVRTranscriptEntry {
  timestamp: string;
  heard: string;
  bot_action: string;
}

export interface BotDialogueEntry {
  timestamp: string;
  bot: string;
}

export interface HumanDetectedPayload {
  call_id: string;
  timestamp: string;
  office_id: string;
  patient_ref: string;
  join_link: string;
  notes: string;
}

export interface CallConfig {
  maxCallDuration: number;
  maxWaitForStaff: number;
  telnyxApiKey: string;
  telnyxConnectionId: string;
  geminiApiKey: string;
  n8nWebhookUrl: string;
  humanDetectedWebhookUrl: string;
  callCompletedWebhookUrl: string;
}

export type LogType = 'info' | 'warn' | 'error' | 'debug';

export type Logger = (
  service: string,
  message: string,
  type?: LogType,
) => Promise<void>;

export type CallEventPayload = {
  call_control_id: string;
  transcription?: {
    text: string;
  };
  client_state?: string;
};

export type TelnyxCallResponse = {
  call_control_id: string;
};
