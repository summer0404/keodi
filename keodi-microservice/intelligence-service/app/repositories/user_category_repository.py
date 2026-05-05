from app.repositories.base_repository import BaseRepository
import datetime

class UserCategoryRepository (BaseRepository):
    async def get_top_user_categories(self, user_id: str, limit: int = 3) -> list:
        return await self.db.usercategory.find_many(
            where={"userId": user_id},
            order={"lastInteractedAt": "desc"},
            take=limit,
        )

    async def get_user_categories_by_user_id(self, user_id: str):
        return await self.db.usercategory.find_many(
            where={
                "userId": user_id
            }
        )
    
    async def update_user_category(self, user_id: str, category_id: str):
        return await self.db.usercategory.upsert(
            where={
                "userId_categoryId": {
                    "userId": user_id,
                    "categoryId": category_id
                }
            },
            data={
                "create": {
                    "userId": user_id,
                    "categoryId": category_id,
                },
                "update": {
                    "lastInteractedAt": datetime.datetime.now(datetime.timezone.utc)
                }
            }
        )