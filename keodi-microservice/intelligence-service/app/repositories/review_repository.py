from app.repositories.base_repository import BaseRepository

class ReviewRepository(BaseRepository):
    async def mark_review_as_analyzed(self, review_id: str) -> None:
        await self.db.review.update(
            where={"id": review_id},
            data={"sentimentAnalyzed": True}
        )

    async def get_place_reviews(self, place_id: str, limit: int = 5) -> list:
        return await self.db.review.find_many(
            where={"placeId": place_id},
            order={"createdAt": "desc"},
            take=limit,
        )
    