import * as dotenv from 'dotenv';
import { CallConfig } from 'src/types';

dotenv.config();

const validateConfig = (): CallConfig => {
  const requiredEnvVars = [
    'TELNYX_API_KEY',
    'TELNYX_CONNECTION_ID',
    'GEMINI_API_KEY',
    'N8N_WEBHOOK_URL',
    'HUMAN_DETECTED_WEBHOOK_URL',
    'CALL_COMPLETED_WEBHOOK_URL',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    maxCallDuration: parseInt(process.env.MAX_CALL_DURATION || '3600', 10),
    maxWaitForStaff: parseInt(process.env.MAX_WAIT_FOR_STAFF || '300', 10),
    telnyxApiKey: process.env.TELNYX_API_KEY!,
    telnyxConnectionId: process.env.TELNYX_CONNECTION_ID!,
    geminiApiKey: process.env.GEMINI_API_KEY!,
    n8nWebhookUrl: process.env.N8N_WEBHOOK_URL!,
    humanDetectedWebhookUrl: process.env.HUMAN_DETECTED_WEBHOOK_URL!,
    callCompletedWebhookUrl: process.env.CALL_COMPLETED_WEBHOOK_URL!,
  };
};

export const config = validateConfig();
