CREATE OR REPLACE FUNCTION RefreshLastModified()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updatedAt = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS qr(
  uuid UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW() NOT NULL,
  updatedAt TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TRIGGER OnUpdateQr
    BEFORE UPDATE
    ON qr
    FOR EACH ROW
EXECUTE PROCEDURE RefreshLastModified();