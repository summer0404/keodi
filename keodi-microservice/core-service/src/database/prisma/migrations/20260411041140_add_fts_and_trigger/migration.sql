-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateFunction
CREATE OR REPLACE FUNCTION f_unaccent(text)
  RETURNS text AS
$func$
SELECT unaccent('unaccent', $1)
$func$  LANGUAGE sql IMMUTABLE;

-- AddColumn
ALTER TABLE "places" ADD COLUMN "fts_search_vector" tsvector;

-- UpdateExistingData
UPDATE "places" 
SET "fts_search_vector" = (
  setweight(to_tsvector('simple', f_unaccent(COALESCE("name", ''))), 'A') ||
  setweight(to_tsvector('simple', f_unaccent(COALESCE("description", ''))), 'B') ||
  setweight(to_tsvector('simple', f_unaccent(
    COALESCE("full_address", '') || ' ' || 
    COALESCE("street", '') || ' ' || 
    COALESCE("ward", '') || ' ' || 
    COALESCE("city", '')
  )), 'C')
);

-- CreateFunctionForTrigger
CREATE OR REPLACE FUNCTION update_fts_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fts_search_vector := (
    setweight(to_tsvector('simple', f_unaccent(COALESCE(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('simple', f_unaccent(COALESCE(NEW.description, ''))), 'B') ||
    setweight(to_tsvector('simple', f_unaccent(
      COALESCE(NEW.full_address, '') || ' ' || 
      COALESCE(NEW.street, '') || ' ' || 
      COALESCE(NEW.ward, '') || ' ' || 
      COALESCE(NEW.city, '')
    )), 'C')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CreateTrigger
CREATE TRIGGER trigger_update_fts_search_vector
BEFORE INSERT OR UPDATE ON "places"
FOR EACH ROW
EXECUTE FUNCTION update_fts_search_vector();

-- CreateIndex
CREATE INDEX "places_fts_vector_idx" ON "places" USING GIN ("fts_search_vector");