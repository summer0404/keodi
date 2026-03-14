from app.repositories.base_repository import BaseRepository
class PlaceCategoryRepository (BaseRepository):
    async def get_place_categories_by_place_id(self, place_id: str):
        return await self.db.placecategory.find_many(
            where={
                "placeId": place_id
            }
        )
