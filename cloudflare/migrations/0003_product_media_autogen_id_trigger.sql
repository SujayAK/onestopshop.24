CREATE TRIGGER IF NOT EXISTS product_media_autogen_id
AFTER INSERT ON product_media
FOR EACH ROW
WHEN NEW.id IS NULL OR NEW.id = '' OR LOWER(NEW.id) = 'default'
BEGIN
  UPDATE product_media
  SET id = lower(hex(randomblob(16)))
  WHERE rowid = NEW.rowid;
END;