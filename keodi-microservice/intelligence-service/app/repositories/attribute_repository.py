from app.repositories.base_repository import BaseRepository
class AttributeRepository (BaseRepository):
    async def get_all_attributes(self):
        return await self.db.attribute.find_many()