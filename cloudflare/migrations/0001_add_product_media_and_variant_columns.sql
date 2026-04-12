ALTER TABLE products ADD COLUMN details TEXT NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN variants TEXT NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN media_gallery TEXT NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN media_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN media_schema_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS product_media (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id TEXT NOT NULL,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '',
  view_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  alt_text TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_media_product_color_order
  ON product_media(product_id, color_name, sort_order);