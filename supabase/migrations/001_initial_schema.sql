-- Initial schema for MeldkamerSpel (Police Dispatch Simulator)
-- This migration creates the core tables for the police dispatch simulation

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE unit_role AS ENUM (
  'POLICE_PATROL',
  'POLICE_SIV', 
  'POLICE_SUPERVISOR'
);

CREATE TYPE unit_status AS ENUM (
  'IDLE',
  'ENROUTE',
  'ONSCENE',
  'RETURNING',
  'OFFLINE'
);

CREATE TYPE incident_type AS ENUM (
  'PURSUIT',
  'BURGLARY',
  'DISTURBANCE',
  'THEFT'
);

CREATE TYPE incident_state AS ENUM (
  'OPEN',
  'ASSIGNED',
  'ONSCENE',
  'DONE'
);

CREATE TYPE dispatch_status AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'COMPLETED'
);

-- Create incidents table
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type incident_type NOT NULL,
  state incident_state NOT NULL DEFAULT 'OPEN',
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  priority INTEGER NOT NULL CHECK (priority IN (1, 2, 3)),
  dwell_seconds INTEGER NOT NULL DEFAULT 0,
  reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create units table
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  role unit_role NOT NULL,
  status unit_status NOT NULL DEFAULT 'IDLE',
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create dispatches table
CREATE TABLE dispatches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  unit_ids UUID[] NOT NULL,
  status dispatch_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create unit status history table for tracking unit movements
CREATE TABLE unit_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  status unit_status NOT NULL,
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_incidents_state ON incidents(state);
CREATE INDEX idx_incidents_type ON incidents(type);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_units_role ON units(role);
CREATE INDEX idx_dispatches_incident_id ON dispatches(incident_id);
CREATE INDEX idx_dispatches_status ON dispatches(status);
CREATE INDEX idx_unit_status_history_unit_id ON unit_status_history(unit_id);
CREATE INDEX idx_unit_status_history_created_at ON unit_status_history(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_incidents_updated_at 
  BEFORE UPDATE ON incidents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at 
  BEFORE UPDATE ON units 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dispatches_updated_at 
  BEFORE UPDATE ON dispatches 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_status_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all operations on incidents" ON incidents
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on units" ON units
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on dispatches" ON dispatches
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on unit_status_history" ON unit_status_history
  FOR ALL USING (true);

-- Insert some sample data for testing
INSERT INTO units (name, role, status, location_lat, location_lng) VALUES
  ('Unit-001', 'POLICE_PATROL', 'IDLE', 52.3676, 4.9041),
  ('Unit-002', 'POLICE_PATROL', 'IDLE', 52.3700, 4.9100),
  ('Unit-003', 'POLICE_SIV', 'IDLE', 52.3650, 4.9000),
  ('Unit-004', 'POLICE_SUPERVISOR', 'IDLE', 52.3680, 4.9050);

-- Insert some sample incidents
INSERT INTO incidents (type, state, location_lat, location_lng, priority, dwell_seconds, reward) VALUES
  ('BURGLARY', 'OPEN', 52.3600, 4.8900, 2, 300, 100),
  ('DISTURBANCE', 'OPEN', 52.3700, 4.9200, 1, 180, 50),
  ('THEFT', 'OPEN', 52.3650, 4.8950, 3, 600, 200);



