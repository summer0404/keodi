ALTER TABLE "group_sessions"
ADD COLUMN "search_radius" DOUBLE PRECISION NOT NULL DEFAULT 5;

CREATE TABLE "group_session_categories" (
    "session_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_session_categories_pkey" PRIMARY KEY ("session_id","category_id")
);

ALTER TABLE "group_session_categories"
ADD CONSTRAINT "group_session_categories_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "group_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_session_categories"
ADD CONSTRAINT "group_session_categories_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
