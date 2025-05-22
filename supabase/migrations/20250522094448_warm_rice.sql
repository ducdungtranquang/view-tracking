/*
  # YouTube View Tracker Schema

  1. New Tables
    - `videos` - Stores video information and tracking settings
    - `video_views` - Stores historical view counts at different time points
    - `notifications_log` - Records alert notifications sent

  2. Security
    - Enable RLS on all tables
    - Add policy for authenticated users to access their data
*/

-- Videos table to store tracking information
CREATE TABLE IF NOT EXISTS videos (
  id text PRIMARY KEY, -- YouTube video ID
  title text NOT NULL,
  thumbnail text NOT NULL,
  warning_threshold integer NOT NULL,
  emergency_threshold integer NOT NULL,
  status text NOT NULL DEFAULT 'active', -- 'active' or 'paused'
  notifications jsonb DEFAULT '{"emails":[], "zaloIds":[], "phoneNumbers":[]}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Video views table to store historical data
CREATE TABLE IF NOT EXISTS video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text REFERENCES videos(id) ON DELETE CASCADE,
  views integer NOT NULL,
  timestamp timestamptz DEFAULT now() NOT NULL
);

-- Notifications log table
CREATE TABLE IF NOT EXISTS notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text REFERENCES videos(id) ON DELETE CASCADE,
  video_title text NOT NULL,
  type text NOT NULL, -- 'email', 'zalo', 'sms'
  recipient text NOT NULL,
  alert_level text NOT NULL, -- 'warning', 'emergency'
  message text NOT NULL,
  status text NOT NULL, -- 'delivered', 'failed'
  timestamp timestamptz DEFAULT now() NOT NULL,
  views_per_minute integer NOT NULL,
  threshold integer NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_timestamp ON video_views(timestamp);
CREATE INDEX IF NOT EXISTS idx_notifications_log_video_id ON notifications_log(video_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_timestamp ON notifications_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);

-- Enable row-level security
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (default to allow all for authenticated users in this MVP)
CREATE POLICY "Allow all access for authenticated users" ON videos
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all access for authenticated users" ON video_views
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all access for authenticated users" ON notifications_log
  FOR ALL
  TO authenticated
  USING (true);