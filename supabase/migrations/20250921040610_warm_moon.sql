/*
  # Add Mission Planning Tables

  1. New Tables
    - `mission_plans`
      - `mission_id` (uuid, primary key, references missions)
      - `plan_json` (jsonb, the compiled mission plan)
      - `validated` (boolean, default true)
      - `created_at` (timestamp)
    - `replans`
      - `id` (uuid, primary key)
      - `mission_id` (uuid, references missions)
      - `reason` (text, why the replan occurred)
      - `old_plan` (jsonb, previous plan)
      - `new_plan` (jsonb, new plan)
      - `ts` (timestamp, when replan occurred)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS mission_plans (
  mission_id uuid PRIMARY KEY REFERENCES missions(id) ON DELETE CASCADE,
  plan_json jsonb NOT NULL,
  validated boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  reason text NOT NULL,
  old_plan jsonb NOT NULL,
  new_plan jsonb NOT NULL,
  ts timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE mission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE replans ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can manage mission plans"
  ON mission_plans
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can read mission plans"
  ON mission_plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage replans"
  ON replans
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can read replans"
  ON replans
  FOR SELECT
  TO authenticated
  USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_replans_mission_id ON replans(mission_id);
CREATE INDEX IF NOT EXISTS idx_replans_ts ON replans(ts DESC);