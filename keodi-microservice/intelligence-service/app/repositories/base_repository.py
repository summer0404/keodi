from app.database.prisma_service import get_prisma_client
from prisma import Prisma
class BaseRepository:
    def __init__(self, db):
        self.db : Prisma = db

    @classmethod
    async def start(cls):
        db = await get_prisma_client()
        return cls(db)