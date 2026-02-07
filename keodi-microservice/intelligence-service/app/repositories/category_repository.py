from app.database.prisma_service import get_prisma_client

class CategoryRepository:
    async def __init__(self):
        self.db = await get_prisma_client()
    
    async def get_all_categories(self):
        return await self.db.category.find_many()