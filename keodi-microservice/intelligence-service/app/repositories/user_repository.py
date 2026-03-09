from app.repositories.base_repository import BaseRepository
class UserRepository (BaseRepository):
    def get_by_id(self, user_id: str):
        return self.db.user.find_unique(
            where={
                "id": user_id
            }
        )