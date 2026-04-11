-- CreateIndex
CREATE INDEX "places_fts_vector_idx" ON "places" USING GIN ("fts_search_vector");
