from app.database.prisma_service import get_prisma_client

class AttributeRepository:
    async def __init__(self):
        self.db = await get_prisma_client()

    async def get_all_attributes(self):
        return await self.db.attribute.find_many()