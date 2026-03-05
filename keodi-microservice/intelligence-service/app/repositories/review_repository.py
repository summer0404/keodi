from app.repositories.base_repository import BaseRepository

class ReviewRepository(BaseRepository):
    async def mark_review_as_analyzed(self, review_id: str) -> None:
        await self.db.review.update(
            where={"id": review_id},
            data={"sentimentAnalyzed": True}
        )
    