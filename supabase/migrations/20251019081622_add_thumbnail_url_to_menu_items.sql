/*
  # Add thumbnail_url to menu_items table

  1. Changes
    - Add `thumbnail_url` column to `menu_items` table
      - Type: text (nullable)
      - Stores the URL for 80x80px thumbnail version of menu item photos
      - Nullable to support existing records without thumbnails
  
  2. Notes
    - Existing records will have NULL thumbnail_url until migration utility processes them
    - New uploads will automatically populate both photo_url and thumbnail_url
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN thumbnail_url text;
  END IF;
END $$;
