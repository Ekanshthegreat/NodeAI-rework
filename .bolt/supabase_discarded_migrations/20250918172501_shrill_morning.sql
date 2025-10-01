/*
  # Create core NodeAI database schema

  1. New Tables
    - `sites` - Physical locations where robots operate
      - `id` (text, primary key) - Site identifier
      - `name` (text) - Human readable site name  
      - `map_url` (text) - URL to site map image
      - `origin` (jsonb) - Map origin coordinates {x, y}
      - `scale_m_per_px` (numeric) - Meters per pixel scale
    - `robots` - Robot fleet management
      - `id` (text, primary key) - Robot identifier
      - `site_id` (text, foreign key) - Associated site
      - `vendor` (text) - Robot vendor/protocol
      - `pose` (jsonb) - Current position {x, y, theta}
      - `battery` (numeric) - Battery level 0-1
      - `status` (text) - Current robot status
      - `updated_at` (timestamptz) - Last update timestamp
    - `missions` - Mission tracking
      - `id` (uuid, primary key) - Mission identifier
      - `site_id` (text, foreign key) - Target site
      - `nl` (text) - Natural language description
      - `status` (text) - Mission status
      - `created_at` (timestamptz) - Creation timestamp
    - `mission_plans` - Generated mission plans
      - `mission_id` (uuid, foreign key) - Associated mission
      - `plan_json` (jsonb) - Complete mission plan
      - `validated` (boolean) - Plan validation status
    - `events` - System events and telemetry
      - `id` (uuid, primary key) - Event identifier
      - `mission_id` (uuid, foreign key) - Associated mission
      - `robot_id` (text) - Associated robot
      - `type` (text) - Event type
      - `payload` (jsonb) - Event data
      - `ts` (timestamptz) - Event timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read/write their data