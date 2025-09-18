/*
  # Create core NodeAI database schema

  1. New Tables
    - `sites` - Physical locations where robots operate
    - `robots` - Robot fleet management  
    - `missions` - Mission tracking
    - `mission_plans` - Generated mission plans
    - `events` - System events and telemetry

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read/write their data
*/

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
  id text PRIMARY KEY,
  name text NOT NULL,
  map_url text DEFAULT '',
  origin jsonb DEFAULT '{"x": 0, "y": 0}',
  scale_m_per_px numeric DEFAULT 0.1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read sites"
  ON sites
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage sites"
  ON sites
  FOR ALL
  TO authenticated
  USING (true);

-- Robots table
CREATE TABLE IF NOT EXISTS robots (
  id text PRIMARY KEY,
  site_id text NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  vendor text NOT NULL DEFAULT 'mock',
  pose jsonb DEFAULT '{"x": 0, "y": 0, "theta": 0}',
  battery numeric DEFAULT 1.0 CHECK (battery >= 0 AND battery <= 1),
  status text DEFAULT 'IDLE',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE robots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read robots"
  ON robots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage robots"
  ON robots
  FOR ALL
  TO authenticated
  USING (true);

-- Missions table
CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  nl text NOT NULL,
  status text DEFAULT 'planning',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read missions"
  ON missions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage missions"
  ON missions
  FOR ALL
  TO authenticated
  USING (true);

-- Mission plans table
CREATE TABLE IF NOT EXISTS mission_plans (
  mission_id uuid PRIMARY KEY REFERENCES missions(id) ON DELETE CASCADE,
  plan_json jsonb NOT NULL,
  validated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mission_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read mission plans"
  ON mission_plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage mission plans"
  ON mission_plans
  FOR ALL
  TO authenticated
  USING (true);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  robot_id text,
  type text NOT NULL,
  payload jsonb DEFAULT '{}',
  ts timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read events"
  ON events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage events"
  ON events
  FOR ALL
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_robots_site_id ON robots(site_id);
CREATE INDEX IF NOT EXISTS idx_missions_site_id ON missions(site_id);
CREATE INDEX IF NOT EXISTS idx_events_mission_id ON events(mission_id);
CREATE INDEX IF NOT EXISTS idx_events_robot_id ON events(robot_id);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts DESC);