# Voice Automation MVP

A voice automation MVP designed to eliminate the need for medical office staff to wait on hold during insurance verification calls.

## Features

- Automated IVR navigation using AI
- Human detection and staff notification
- Call logging and status tracking
- Webhook integration with n8n
- Dockerized deployment

## Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose
- Telnyx account and API credentials
- Google Gemini API key
- n8n instance for webhook handling

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=3003
NODE_ENV=development

# Telnyx Configuration
TELNYX_API_KEY=your_telnyx_api_key
TELNYX_CONNECTION_ID=your_connection_id

# Google Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key

# Webhook URLs
N8N_WEBHOOK_URL=http://your-n8n-webhook-url
HUMAN_DETECTED_WEBHOOK_URL=http://your-human-detected-webhook-url
CALL_COMPLETED_WEBHOOK_URL=http://your-call-completed-webhook-url

# Call Configuration
MAX_CALL_DURATION=3600
MAX_WAIT_FOR_STAFF=300
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd insurance-verification-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Build the application:
```bash
npm run build
```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Using Docker

1. Build and start the container:
```bash
docker-compose up --build
```

2. To run in detached mode:
```bash
docker-compose up -d
```

## API Endpoints

### Start a Call
```
POST /api/call/start
```
Request body:
```json
{
  "office_id": "office_xyz",
  "patient_ref": "case789",
  "insurance_phone_number": "+18885551234",
  "insurance_name": "Aetna"
}
```

### Handle IVR Response
```
POST /api/call/ivr
```
Request body:
```json
{
  "call_id": "call_123",
  "audio_data": "IVR response text"
}
```

### End Call
```
POST /api/call/end
```
Request body:
```json
{
  "call_id": "call_123",
  "status": "completed",
  "notes": "Call completed successfully"
}
```

### Receive Events from Telnyx
```
POST /api/call/events
```
Request body:
```json
{
  "data": {
    "event_type": "call.transcription.received",
    "payload": {
      "call_control_id": "call_123",
      "transcription": {
        "text": "Hello are you human"
      },
      "client_state": "received"
    }
  }
}
```

### Health Check
```
GET /health
```

## Webhook Payloads

### Human Detected
```json
{
  "call_id": "abc123",
  "timestamp": "2025-05-03T14:00:00Z",
  "office_id": "office_xyz",
  "patient_ref": "case789",
  "join_link": "tel:+18885551234,,123456#",
  "notes": "Live person detected, ready to transfer"
}
```

### Call Completed
```json
{
  "call_id": "abc123",
  "timestamp_start": "2025-05-03T14:00:00Z",
  "timestamp_end": "2025-05-03T14:33:15Z",
  "duration_seconds": 1995,
  "office_id": "office_xyz",
  "patient_ref": "case789",
  "status": "completed",
  "staff_join_timestamp": "2025-05-03T14:31:00Z",
  "seconds_waiting_for_staff": 135,
  "notes": "Call completed successfully, transferred to staff."
}
```

## Logging

Logs are stored in the `logs` directory:
- `error.log`: Error-level logs
- `combined.log`: All logs

## License

ISC 