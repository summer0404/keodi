from app.repositories.base_repository import BaseRepository
import json
from typing import Union

class PlaceRepository(BaseRepository):
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
                
                await self.db.placeattribute.upsert(
                    where={
                        "placeId_attributeId": {
                            "placeId": place_id,
                            "attributeId": attribute.id
                        }
                    },
                    data={
                        "create": {
                            "placeId": place_id,
                            "attributeId": attribute.id,
                            "score": score
                        },
                        "update": {
                            "score": score
                        }
                    }
                )
            
            return {"message": "Attributes updated successfully"}
        except json.JSONDecodeError as e:
            raise Exception(f"Invalid JSON format: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to update place attributes: {str(e)}")
        
    