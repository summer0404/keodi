from app.repositories.base_repository import BaseRepository
import json
from typing import Union

class PlaceRepository(BaseRepository):
    SMOOTHING_FACTOR = 5

    def _calculate_score(self, current_score: float, new_score: float, review_count: int) -> float:
        learning_rate = 1 / (self.SMOOTHING_FACTOR + review_count + 1)
        return current_score + learning_rate * (new_score - current_score)

    async def update_attributes(self, place_id: str, sentiment_attributes: Union[dict, str]):
        try:
            if isinstance(sentiment_attributes, str):
                attributes_dict = json.loads(sentiment_attributes)
            else:
                attributes_dict = sentiment_attributes
            
            for attribute_name, score in attributes_dict.items():

                attribute = await self.db.attribute.find_first(
                    where={"name": attribute_name}
                )

                if not attribute:
                    continue
                
                place_attribute = await self.db.placeattribute.find_first(
                    where={
                        "placeId": place_id,
                        "attributeId": attribute.id
                    }
                )
                
                if place_attribute:
                    new_score = self._calculate_score(place_attribute.score, score, place_attribute.reviewCount)
                    
                    await self.db.placeattribute.update(
                        where={
                            "placeId_attributeId": {
                                "placeId": place_id,
                                "attributeId": attribute.id
                            }
                        },
                        data={
                            "score": new_score,
                            "reviewCount": place_attribute.reviewCount + 1
                        }
                    )
                else:
                    review_count = 0
                    new_score = self._calculate_score(0, score, review_count)

                    await self.db.placeattribute.create(
                        data={
                            "placeId": place_id,
                            "attributeId": attribute.id,
                            "score": new_score,
                            "reviewCount": review_count + 1
                        }
                    )
            
            return {"message": "Attributes updated successfully"}
        except json.JSONDecodeError as e:
            raise Exception(f"Invalid JSON format: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to update place attributes: {str(e)}")
        
    