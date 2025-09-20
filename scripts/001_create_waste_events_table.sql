-- Create waste events table for logging dumping incidents
CREATE TABLE IF NOT EXISTS waste_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  location_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('illegal_dumping', 'normal_disposal', 'bin_full', 'maintenance')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  image_url TEXT,
  video_url TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive')),
  coordinates JSONB, -- {lat: number, lng: number}
  metadata JSONB, -- Additional detection data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_waste_events_location_id ON waste_events(location_id);
CREATE INDEX IF NOT EXISTS idx_waste_events_detected_at ON waste_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_waste_events_status ON waste_events(status);
CREATE INDEX IF NOT EXISTS idx_waste_events_event_type ON waste_events(event_type);

-- Create locations table for monitoring points
CREATE TABLE IF NOT EXISTS monitoring_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  coordinates JSONB NOT NULL, -- {lat: number, lng: number}
  camera_status TEXT NOT NULL DEFAULT 'active' CHECK (camera_status IN ('active', 'inactive', 'maintenance')),
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB, -- Camera and AI settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alerts table for notifications
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES waste_events(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('voice_warning', 'light_flash', 'sms', 'email', 'dashboard')),
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed', 'acknowledged')),
  metadata JSONB
);

-- Enable Row Level Security (RLS) - for future auth implementation
ALTER TABLE waste_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (will add proper policies when auth is implemented)
CREATE POLICY "Allow all operations on waste_events" ON waste_events FOR ALL USING (true);
CREATE POLICY "Allow all operations on monitoring_locations" ON monitoring_locations FOR ALL USING (true);
CREATE POLICY "Allow all operations on alerts" ON alerts FOR ALL USING (true);
