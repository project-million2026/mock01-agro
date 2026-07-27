ALTER TABLE fleets ADD COLUMN flespi_device_type_id INTEGER;

-- Buildings polygon support (m² area calculation)
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS polygon geometry(POLYGON,4326);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS area_sqm FLOAT;
ALTER TABLE buildings ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE buildings ALTER COLUMN longitude DROP NOT NULL;
CREATE INDEX IF NOT EXISTS ix_buildings_polygon ON buildings USING GIST (polygon);
