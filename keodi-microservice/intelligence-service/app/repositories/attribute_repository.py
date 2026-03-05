from app.repositories.base_repository import BaseRepository
class AttributeRepository (BaseRepository):
    async def get_all_attributes(self):
        return await self.db.attribute.find_many()

    async def get_attribute_by_name(self, name: str):
        return await self.db.attribute.find_unique(where={"name": name})