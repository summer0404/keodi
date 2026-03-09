from app.repositories.base_repository import BaseRepository
class UserActionRepository (BaseRepository):
    def create_user_action (self, user_id: str, place_id: str, action: str):
        return self.db.useraction.create(
            data={
                "userId": user_id,
                "placeId": place_id,
                "action": action
            }
        )