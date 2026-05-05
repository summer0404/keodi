import asyncio
import json
import logging
from typing import List

from langchain_core.tools import tool

from app.repositories.place_repository import PlaceRepository
from app.repositories.user_attribute_repository import UserAttributeRepository
from app.repositories.user_category_repository import UserCategoryRepository

logger = logging.getLogger(__name__)


def create_tools(
    place_repository: PlaceRepository,
    user_attribute_repository: UserAttributeRepository,
    user_category_repository: UserCategoryRepository,
    embedding_service,
    lat: float,
    lng: float,
) -> list:
    @tool
    async def search_places(query: str, radius_km: float = 5.0, limit: int = 5) -> str:
        """Search for places near the user's location based on a semantic query."""
        embedding = await asyncio.to_thread(embedding_service.get_embedding, query)
        if not embedding:
            return "No places found."

        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

        try:
            results = await place_repository.search_nearby_by_embedding(
                embedding_str, lat, lng, radius_km, limit
            )
        except Exception as e:
            logger.exception("search_places failed: %s", e)
            return "Error searching places."

        if not results:
            return "No places found nearby."

        lines = []
        for r in results:
            lines.append(
                f"- ID: {r['id']}, Name: {r['name']}, Rating: {r.get('rating', 'N/A')}, "
                f"Address: {r.get('full_address', 'N/A')}, "
                f"Distance: {round(r.get('distance_km', 0), 2)} km, "
                f"Similarity: {round(r.get('similarity', 0), 4)}"
            )
        return "\n".join(lines)

    @tool
    async def get_user_profile(user_id: str) -> str:
        """Get the user's preference profile including top attributes and categories."""
        try:
            user_attributes = await user_attribute_repository.get_top_user_attributes(user_id)
            user_categories = await user_category_repository.get_top_user_categories(user_id)
        except Exception as e:
            logger.exception("get_user_profile failed: %s", e)
            return f"Could not retrieve profile for user {user_id}."

        attr_lines = [
            f"  - Attribute ID: {ua.attributeId}, Score: {round(ua.score, 4)}"
            for ua in user_attributes
        ]
        cat_lines = [
            f"  - Category ID: {uc.categoryId}"
            for uc in user_categories
        ]

        profile = "User profile:\n"
        profile += "Top attributes:\n" + ("\n".join(attr_lines) if attr_lines else "  None") + "\n"
        profile += "Preferred categories:\n" + ("\n".join(cat_lines) if cat_lines else "  None")
        return profile

    @tool
    async def get_place_details(place_id: str) -> str:
        """Get detailed information about a place including its categories and attributes."""
        try:
            place = await place_repository.get_by_id_with_details(place_id)
        except Exception as e:
            logger.exception("get_place_details failed for %s: %s", place_id, e)
            return f"Could not retrieve details for place {place_id}."

        if not place:
            return f"Place {place_id} not found."

        categories = [
            pc.category.name
            for pc in (place.placeCategories or [])
            if pc.category
        ]
        attributes = [
            f"Attribute ID: {pa.attributeId}, Score: {round(pa.score, 4)}"
            for pa in (place.placeAttributes or [])
        ]

        return (
            f"Place: {place.name}\n"
            f"Rating: {place.rating}\n"
            f"Address: {place.fullAddress}\n"
            f"Categories: {', '.join(categories) if categories else 'None'}\n"
            f"Attributes: {', '.join(attributes) if attributes else 'None'}"
        )

    @tool
    def submit_answer(message: str, place_ids: List[str]) -> str:
        """Submit the final answer with a personalized Vietnamese message and recommended place IDs."""
        return json.dumps({"message": message, "placeIds": place_ids})

    return [search_places, get_user_profile, get_place_details, submit_answer]
