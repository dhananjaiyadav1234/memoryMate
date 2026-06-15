-- ================================================================
-- MemoryMate — Supabase Schema Setup
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ================================================================

-- Enable the uuid-ossp extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- Table: persons
-- Stores known people with their face descriptors (128-d vectors)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS persons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT '',
  face_descriptor FLOAT8[] NOT NULL,  -- 128-element array from face-api.js
  photo_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Table: memories
-- Stores notes/memories associated with known people
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id   UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_memories_person_id ON memories(person_id);
CREATE INDEX IF NOT EXISTS idx_persons_created_at ON persons(created_at DESC);

-- ----------------------------------------------------------------
-- Row Level Security (RLS)
-- For development: allow all operations with the anon key.
-- ⚠️  In production, restrict these policies to authenticated users.
-- ----------------------------------------------------------------
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Allow all operations for development (using anon key)
CREATE POLICY "Allow all access to persons" ON persons
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to memories" ON memories
  FOR ALL USING (true) WITH CHECK (true);
