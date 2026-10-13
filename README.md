# FS-03 Learning Management System

A full-stack learning management system with instructor and student accounts.

## Features

- Student and instructor accounts
- Course creation, editing, and publishing
- Lesson creation and video uploads
- Background video processing with FFmpeg and BullMQ
- Course enrollment, lesson completion, and progress tracking
- Quizzes and certificates
- Live classes with video, audio, chat, and screen sharing using LiveKit
- Stripe Checkout payments in test mode
- Instructor earnings summary

## Technology

- Client: React, Vite, Redux Toolkit
- Server: Node.js, Express, Mongoose
- Database: MongoDB
- Background jobs: BullMQ and Redis
- Live classes: LiveKit
- Test payments: Stripe
- Video conversion: FFmpeg

## Requirements

Install or configure:

- Node.js and npm
- MongoDB
- Redis or Memurai, available at `127.0.0.1:6379`
- FFmpeg

The video worker currently uses a Windows-specific FFmpeg executable path in `server/src/queues/videoWorker.js`. Update that path if FFmpeg is installed somewhere else.

## Configuration

Create `server/.env` and set these values:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
LIVEKIT_URL=your_livekit_server_url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
STRIPE_SECRET_KEY=your_stripe_test_secret_key
FFMPEG_PATH=path_to_ffmpeg_executable
```

## Run locally

Start MongoDB and Redis/Memurai first.

In one PowerShell window:

```powershell
cd server
npm install
npm run dev
```

In a second PowerShell window:

```powershell
cd client
npm install
npm run dev
```

Open the client at `http://localhost:5173`.

The API health check is at `http://localhost:5000/api/health`.

## Notes

- Uploaded videos are stored under `server/uploads/` and should not be committed.
- Live classes require valid LiveKit settings.
- Real payments are not enabled; Stripe is in test mode.