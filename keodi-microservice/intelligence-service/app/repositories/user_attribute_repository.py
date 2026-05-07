from app.repositories.base_repository import BaseRepository
class UserAttributeRepository (BaseRepository):
    async def get_top_user_attributes(self, user_id: str, limit: int = 5) -> list:
        return await self.db.userattribute.find_many(
            where={"userId": user_id},
            order={"score": "desc"},
            take=limit,
        )

    async def get_user_attribute_by_id(self, user_id: str, attribute_id: str):
        return await self.db.userattribute.find_unique(
            where={
                "userId_attributeId": {
                    "userId": user_id,
                    "attributeId": attribute_id
                }
            }
        )
    
    async def update_user_attribute(self, user_id: str, attribute_id: str, score: float):
        return await self.db.userattribute.upsert(
            where={
                "userId_attributeId": {
                    "userId": user_id,
                    "attributeId": attribute_id
                }
            },
            data={
                "create": {
                    "userId": user_id,
                    "attributeId": attribute_id,
                    "score": score
                },
                "update": {
                    "score": score
                }
            }
        )