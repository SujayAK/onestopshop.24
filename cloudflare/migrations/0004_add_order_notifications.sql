-- Add order notifications table for owner alerts
CREATE TABLE IF NOT EXISTS order_notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'new_order',
  status TEXT NOT NULL DEFAULT 'pending',
  email_sent INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  customer_name TEXT,
  customer_email TEXT,
  total_amount REAL NOT NULL DEFAULT 0,
  items_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_notifications_status
  ON order_notifications(status, email_sent, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_notifications_order_id
  ON order_notifications(order_id);
