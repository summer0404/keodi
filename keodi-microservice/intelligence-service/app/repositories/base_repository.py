from app.database.prisma_service import get_prisma_client

class BaseRepository:
    def __init__(self, db):
        self.db = db

    @classmethod
    async def start(cls):
        db = await get_prisma_client()
        return cls(db)