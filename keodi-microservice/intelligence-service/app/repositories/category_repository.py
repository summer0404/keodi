from app.repositories.base_repository import BaseRepository
from app.common.constant import TOP_K_CATEGORIES, THRESHOLD_SIMILARITY

class CategoryRepository(BaseRepository):
    async def get_all_categories(self):
        return await self.db.category.find_many()
    

    async def get_top_k_attributes(self, search_vector: list[float]) -> list[dict]:
        if not search_vector:
            return []

        query = """
            SELECT name
            FROM categories
            WHERE embedding IS NOT NULL
                AND (1 - (embedding <=> CAST($1 AS vector))) >= $2
            ORDER BY (embedding <=> CAST($1 AS vector)) ASC
            LIMIT $3
        """
        vector_literal = "[" + ",".join(str(float(v)) for v in search_vector) + "]"
        return await self.db.query_raw(
            query,
            vector_literal,
            float(THRESHOLD_SIMILARITY),
            TOP_K_CATEGORIES,
        )
