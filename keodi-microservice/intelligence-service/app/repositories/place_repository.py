from app.repositories.base_repository import BaseRepository
from typing import List

class PlaceRepository(BaseRepository):
    @staticmethod
    def _get_distance_sql(lat: float, lng: float) -> str:
        return f"""(6371 * acos(LEAST(1.0,
                       cos(radians({lat})) * cos(radians(p.latitude))
                       * cos(radians(p.longitude) - radians({lng}))
                       + sin(radians({lat})) * sin(radians(p.latitude))
                   )))"""

    async def get_by_id(self, place_id: str):
        return await self.db.place.find_unique(
            where={
                "id": place_id
            }
        )

    async def get_by_id_with_details(self, place_id: str):
        return await self.db.place.find_unique(
            where={"id": place_id, "status": "PUBLISHED"},
            include={
                "placeCategories": {"include": {"category": True}},
                "placeAttributes": True,
            },
        )

    async def search_nearby_by_embedding(
        self,
        embedding_str: str,
        lat: float,
        lng: float,
        radius_km: float,
        limit: int,
    ) -> list:
        distance_sql = self._get_distance_sql(lat, lng)
        sql = f"""
            SELECT p.id, p.name, p.rating, p.full_address, p.feature_image_url,
                   {distance_sql} AS distance_km,
                   1 - (p.embedding_full <=> '{embedding_str}'::vector) AS similarity
            FROM places p
            WHERE p.embedding_full IS NOT NULL
              AND p.status = 'PUBLISHED'
              AND {distance_sql} < {radius_km}
            ORDER BY similarity DESC
            LIMIT {limit}
        """
        return await self.db.query_raw(sql)
    
    async def search_nearby_by_categories(
        self,
        category_names: List[str],
        lat: float,
        lng: float,
        radius_km: float,
        limit: int,
    ) -> list:
        if not category_names:
            return []
        in_clause = ", ".join(f"'{n.replace(chr(39), chr(39) * 2)}'" for n in category_names)
        distance_sql = self._get_distance_sql(lat, lng)
        sql = f"""
            SELECT DISTINCT p.id, p.name, p.rating, p.full_address, p.feature_image_url,
                   {distance_sql} AS distance_km
            FROM places p
            JOIN place_categories pc ON pc.place_id = p.id
            JOIN categories c ON c.id = pc.category_id
            WHERE c.name IN ({in_clause})
              AND p.status = 'PUBLISHED'
              AND {distance_sql} < {radius_km}
            ORDER BY distance_km ASC
            LIMIT {limit}
        """
        return await self.db.query_raw(sql)

    async def search_nearby_by_text(
        self,
        text: str,
        lat: float,
        lng: float,
        radius_km: float,
        limit: int,
    ) -> list:
        safe_text = text.replace("'", "''")
        distance_sql = self._get_distance_sql(lat, lng)
        sql = f"""
            SELECT p.id, p.name, p.rating, p.full_address, p.feature_image_url,
                   ts_rank(p.fts_search_vector, plainto_tsquery('simple', '{safe_text}')) AS rank,
                   {distance_sql} AS distance_km
            FROM places p
            WHERE p.fts_search_vector @@ plainto_tsquery('simple', '{safe_text}')
              AND p.status = 'PUBLISHED'
              AND {distance_sql} < {radius_km}
            ORDER BY rank DESC, distance_km ASC
            LIMIT {limit}
        """
        return await self.db.query_raw(sql)

    async def search_nearby_by_attributes(
        self,
        attribute_names: List[str],
        lat: float,
        lng: float,
        radius_km: float,
        limit: int,
    ) -> list:
        if not attribute_names:
            return []
        in_clause = ", ".join(f"'{n.replace(chr(39), chr(39) * 2)}'" for n in attribute_names)
        distance_sql = self._get_distance_sql(lat, lng)
        sql = f"""
            SELECT p.id, p.name, p.rating, p.full_address, p.feature_image_url,
                   AVG(pa.score) AS avg_score,
                   {distance_sql} AS distance_km
            FROM places p
            JOIN place_attributes pa ON pa.place_id = p.id
            JOIN attributes a ON a.id = pa.attribute_id
            WHERE a.name IN ({in_clause})
              AND p.status = 'PUBLISHED'
              AND pa.score > 0
              AND {distance_sql} < {radius_km}
            GROUP BY p.id, p.name, p.rating, p.full_address, p.feature_image_url, p.latitude, p.longitude
            ORDER BY avg_score DESC, distance_km ASC
            LIMIT {limit}
        """
        return await self.db.query_raw(sql)

    async def update_attributes(self, place_id: str, attribute_id: str, score: float, review_count: int) -> None:
        await self.db.placeattribute.upsert(
            where={
                'placeId_attributeId': {
                    'placeId': place_id, 
                    'attributeId': attribute_id
                }
            },
            data={
                'create': {
                    'placeId': place_id, 
                    'attributeId': attribute_id, 
                    'score': score,
                    'reviewCount': review_count + 1
                },
                'update': {
                    'score': score,
                    'reviewCount': review_count + 1
                }
            }
        )
