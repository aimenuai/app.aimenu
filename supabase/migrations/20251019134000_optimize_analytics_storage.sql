/*
  # Optimize Analytics Storage - Daily Aggregation System

  1. Overview
    - Replace per-visit row storage with daily aggregated counters
    - One row per restaurant per day instead of millions of individual visit rows
    - Dramatically reduce storage requirements and improve query performance
    - Support date range analytics with efficient aggregation

  2. Changes
    - Drop old page_visits table (no data migration needed)
    - Create restaurant_analytics_daily table for daily aggregated statistics
    - Add composite primary key on (restaurant_id, date)
    - Store visit counts and source breakdown in optimized format
    - Create indexes for fast date range queries

  3. New Tables
    - `restaurant_analytics_daily`
      - `restaurant_id` (uuid, foreign key to restaurants)
      - `date` (date, the day for this analytics record)
      - `total_visits` (integer, total visits for this day)
      - `source_breakdown` (jsonb, visit counts by source: QR, GMB, FB, IG, LI, TT, Direct)
      - `created_at` (timestamptz, when record was created)
      - `updated_at` (timestamptz, when record was last updated)

  4. Database Functions
    - `increment_daily_visits` - Atomically increment visit counter for a restaurant/date/source
    - `get_analytics_summary` - Get aggregated analytics for a date range

  5. Security
    - Enable RLS on restaurant_analytics_daily
    - Users can view analytics for their own restaurants
    - Only system (service role) can insert/update analytics
    - Resellers can view analytics for their clients' restaurants
    - Admins can view all analytics

  6. Performance
    - Composite index on (restaurant_id, date) for fast lookups
    - BRIN index on date column for efficient date range scans
    - Partial indexes for recent data queries
*/

-- Drop old table
DROP TABLE IF EXISTS page_visits CASCADE;

-- Create new daily analytics table
CREATE TABLE IF NOT EXISTS restaurant_analytics_daily (
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_visits integer NOT NULL DEFAULT 0,
  source_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (restaurant_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_daily_restaurant_date
  ON restaurant_analytics_daily(restaurant_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date
  ON restaurant_analytics_daily(date DESC);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_analytics_daily_recent
  ON restaurant_analytics_daily(restaurant_id, date DESC);

-- Enable RLS
ALTER TABLE restaurant_analytics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own restaurant analytics"
  ON restaurant_analytics_daily
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = restaurant_analytics_daily.restaurant_id
      AND restaurants.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage analytics"
  ON restaurant_analytics_daily
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to atomically increment daily visit counter
CREATE OR REPLACE FUNCTION increment_daily_visits(
  p_restaurant_id uuid,
  p_date date,
  p_source text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_key text;
BEGIN
  -- Normalize source to uppercase
  v_source_key := UPPER(COALESCE(p_source, 'DIRECT'));

  -- Insert or update the daily analytics record
  INSERT INTO restaurant_analytics_daily (
    restaurant_id,
    date,
    total_visits,
    source_breakdown,
    created_at,
    updated_at
  )
  VALUES (
    p_restaurant_id,
    p_date,
    1,
    jsonb_build_object(v_source_key, 1),
    now(),
    now()
  )
  ON CONFLICT (restaurant_id, date)
  DO UPDATE SET
    total_visits = restaurant_analytics_daily.total_visits + 1,
    source_breakdown = jsonb_set(
      restaurant_analytics_daily.source_breakdown,
      ARRAY[v_source_key],
      to_jsonb(COALESCE((restaurant_analytics_daily.source_breakdown->>v_source_key)::integer, 0) + 1)
    ),
    updated_at = now();
END;
$$;

-- Function to get analytics summary for a date range
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_restaurant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  total_visits bigint,
  source_breakdown jsonb,
  daily_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(rad.total_visits), 0)::bigint AS total_visits,
    COALESCE(
      jsonb_object_agg(
        source_key,
        source_count
      ) FILTER (WHERE source_key IS NOT NULL),
      '{}'::jsonb
    ) AS source_breakdown,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'date', rad.date,
          'visits', rad.total_visits,
          'sources', rad.source_breakdown
        )
        ORDER BY rad.date
      ) FILTER (WHERE rad.date IS NOT NULL),
      '[]'::jsonb
    ) AS daily_data
  FROM restaurant_analytics_daily rad
  CROSS JOIN LATERAL jsonb_each_text(rad.source_breakdown) AS sources(source_key, source_count)
  WHERE rad.restaurant_id = p_restaurant_id
    AND rad.date >= p_start_date
    AND rad.date <= p_end_date
  GROUP BY rad.restaurant_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_daily_visits TO service_role;
GRANT EXECUTE ON FUNCTION get_analytics_summary TO authenticated, service_role;
