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
    