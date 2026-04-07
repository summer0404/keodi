from app.repositories.base_repository import BaseRepository

class CategoryRepository(BaseRepository):
    async def get_all_categories(self):
        return await self.db.category.find_many()
    
