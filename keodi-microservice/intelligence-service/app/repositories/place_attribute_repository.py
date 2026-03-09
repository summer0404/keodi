from app.repositories.base_repository import BaseRepository
class PlaceAttributeRepository (BaseRepository):
    async def get_place_attiributes_by_place_id_and_threshold(self, place_id: str, threshold: float):
        return await self.db.placeattribute.find_many(
            where={
                "placeId": place_id,
                "OR": [
                    {"score": {"gte": threshold}},
                    {"score": {"lte": -threshold}}
                ]
            }
        )

    async def get_place_attribute_by_id(self, place_id: str, attribute_id: str):
        return await self.db.placeattribute.find_unique(
            where={
                "placeId_attributeId": {
                    "placeId": place_id,
                    "attributeId": attribute_id
                }
            }
        )