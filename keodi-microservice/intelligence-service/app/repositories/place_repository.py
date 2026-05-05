from app.repositories.base_repository import BaseRepository
import json
from typing import Union

class PlaceRepository(BaseRepository):
    async def get_by_id(self, place_id: str):
        return await self.db.place.find_unique(
            where={
                "id": place_id
            }
        )

    async def get_by_id_with_details(self, place_id: str):
        return await self.db.place.find_unique(
            where={"id": place_id},
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
        sql = f"""
            SELECT p.id, p.name, p.rating, p.full_address, p.feature_image_url,
                   (6371 * acos(LEAST(1.0,
                       cos(radians({lat})) * cos(radians(p.latitude))
                       * cos(radians(p.longitude) - radians({lng}))
                       + sin(radians({lat})) * sin(radians(p.latitude))
                   ))) AS distance_km,
                   1 - (p.embedding_full <=> '{embedding_str}'::vector) AS similarity
            FROM places p
            WHERE p.embedding_full IS NOT NULL
              AND (6371 * acos(LEAST(1.0,
                      cos(radians({lat})) * cos(radians(p.latitude))
                      * cos(radians(p.longitude) - radians({lng}))
                      + sin(radians({lat})) * sin(radians(p.latitude))
                  ))) < {radius_km}
            ORDER BY similarity DESC
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
    