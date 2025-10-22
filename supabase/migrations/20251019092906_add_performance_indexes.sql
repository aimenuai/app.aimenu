/*
  # Add Performance Indexes for Menu Pages

  1. Purpose
    - Optimize query performance for public menu detail pages
    - Speed up restaurant, menu, category, and item lookups
    - Improve translation query performance
  
  2. Indexes Added
    - restaurants.slug - for fast restaurant lookup by URL slug
    - menus.restaurant_id - for finding menus by restaurant
    - menu_categories.menu_id - for finding categories by menu
    - menu_items.category_id - for finding items by category
    - category_translations composite index - for translation lookups
    - item_translations composite index - for translation lookups
    - menu_translations composite index - for translation lookups
  
  3. Impact
    - Significantly faster page load times for public menu pages
    - Reduced database query execution time
    - Better scalability as menu data grows
*/

-- Index for restaurant lookups by slug (most common public query)
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);

-- Index for finding menus by restaurant
CREATE INDEX IF NOT EXISTS idx_menus_restaurant_id ON menus(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menus_visible ON menus(is_visible) WHERE is_visible = true;

-- Index for finding categories by menu
CREATE INDEX IF NOT EXISTS idx_menu_categories_menu_id ON menu_categories(menu_id);

-- Index for finding items by category
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_visible ON menu_items(is_visible) WHERE is_visible = true;

-- Composite indexes for translation tables (language + foreign key)
CREATE INDEX IF NOT EXISTS idx_category_translations_lookup 
  ON category_translations(category_id, language_code);

CREATE INDEX IF NOT EXISTS idx_item_translations_lookup 
  ON item_translations(item_id, language_code);

CREATE INDEX IF NOT EXISTS idx_menu_translations_lookup 
  ON menu_translations(menu_id, language_code);

-- Index for ordering queries
CREATE INDEX IF NOT EXISTS idx_menu_categories_display_order 
  ON menu_categories(menu_id, display_order);

CREATE INDEX IF NOT EXISTS idx_menu_items_display_order 
  ON menu_items(category_id, display_order);