# YouTube View Tracker

A real-time monitoring system for tracking YouTube video view counts and sending alerts when views per minute exceed configured thresholds.

## Features

- Track multiple YouTube videos simultaneously
- Monitor view counts per minute in real-time
- Set warning and emergency thresholds for each video
- Receive alerts via Email, Zalo, and SMS
- View detailed statistics and historical data
- Test notification delivery before starting tracking

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS, Lucide icons
- **Backend**: Node.js with Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT
- **Charts**: Recharts
- **Forms**: React Hook Form

## Prerequisites

- Node.js (v14+)
- YouTube Data API v3 key
- Supabase account
- Email service (SMTP/SendGrid)
- Zalo Official Account (for Zalo notifications)
- SMS service (Twilio/FPT SMS)

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials
3. Install dependencies:

```bash
npm install
```

4. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL migration in `supabase/migrations/create_base_schema.sql`
   - Copy your Supabase URL and anon key to the `.env` file

5. Start the development server:

```bash
# Start frontend
npm run dev

# Start backend
npm run server
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Videos
- `GET /api/videos` - List all tracked videos
- `GET /api/videos/preview?id={youtube_id}` - Get video details before tracking
- `POST /api/videos` - Add a new video to track
- `GET /api/videos/:id` - Get detailed information for a specific video
- `PATCH /api/videos/:id/status` - Update video tracking status
- `DELETE /api/videos/:id` - Delete a tracked video

### Notifications
- `GET /api/notifications/history` - Get notification history
- `POST /api/notifications/test` - Send a test notification

## Database Schema

### videos
- `id` (text, primary key) - YouTube video ID
- `title` (text) - Video title
- `thumbnail` (text) - URL to video thumbnail
- `warning_threshold` (integer) - Views/minute for warning alert
- `emergency_threshold` (integer) - Views/minute for emergency alert
- `status` (text) - 'active' or 'paused'
- `notifications` (jsonb) - Recipients for notifications
- `created_at` (timestamptz) - When tracking started

### video_views
- `id` (uuid, primary key)
- `video_id` (text, foreign key)
- `views` (integer) - View count at this timestamp
- `timestamp` (timestamptz)

### notifications_log
- `id` (uuid, primary key)
- `video_id` (text, foreign key)
- `video_title` (text)
- `type` (text) - 'email', 'zalo', or 'sms'
- `recipient` (text)
- `alert_level` (text) - 'warning' or 'emergency'
- `message` (text)
- `status` (text) - 'delivered' or 'failed'
- `timestamp` (timestamptz)
- `views_per_minute` (integer)
- `threshold` (integer)

## License

MIT