import asyncio
import json
import logging
from typing import List

from langchain_core.tools import tool

from app.repositories.place_repository import PlaceRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.user_attribute_repository import UserAttributeRepository
from app.repositories.user_category_repository import UserCategoryRepository

logger = logging.getLogger(__name__)


def create_tools(
    place_repository: PlaceRepository,
    user_attribute_repository: UserAttributeRepository,
    user_category_repository: UserCategoryRepository,
    review_repository: ReviewRepository,
    embedding_service,
    lat: float,
    lng: float,
) -> list:
    @tool
    async def search_places(query: str, radius_km: float = 5.0, limit: int = 5) -> str:
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
    async def search_places_by_category(
        category_names: List[str], radius_km: float = 5.0, limit: int = 5
    ) -> str:
        try:
            results = await place_repository.search_nearby_by_categories(
                category_names, lat, lng, radius_km, limit
            )
        except Exception as e:
            logger.exception("search_places_by_category failed: %s", e)
            return "Error searching places by category."

        if not results:
            return "No places found for those categories nearby."

        lines = []
        for r in results:
            lines.append(
                f"- ID: {r['id']}, Name: {r['name']}, Rating: {r.get('rating', 'N/A')}, "
                f"Address: {r.get('full_address', 'N/A')}, "
                f"Distance: {round(r.get('distance_km', 0), 2)} km"
            )
        return "\n".join(lines)

    @tool
    async def search_places_by_text(
        text: str, radius_km: float = 5.0, limit: int = 5
    ) -> str:
        try:
            results = await place_repository.search_nearby_by_text(
                text, lat, lng, radius_km, limit
            )
        except Exception as e:
            logger.exception("search_places_by_text failed: %s", e)
            return "Error searching places by text."

        if not results:
            return f"No places found matching '{text}' nearby."

        lines = []
        for r in results:
            lines.append(
                f"- ID: {r['id']}, Name: {r['name']}, Rating: {r.get('rating', 'N/A')}, "
                f"Address: {r.get('full_address', 'N/A')}, "
                f"Distance: {round(r.get('distance_km', 0), 2)} km"
            )
        return "\n".join(lines)

    @tool
    async def search_places_by_attributes(
        attribute_names: List[str], radius_km: float = 5.0, limit: int = 5
    ) -> str:
        try:
            results = await place_repository.search_nearby_by_attributes(
                attribute_names, lat, lng, radius_km, limit
            )
        except Exception as e:
            logger.exception("search_places_by_attributes failed: %s", e)
            return "Error searching places by attributes."

        if not results:
            return "No places found with those attributes nearby."

        lines = []
        for r in results:
            lines.append(
                f"- ID: {r['id']}, Name: {r['name']}, Rating: {r.get('rating', 'N/A')}, "
                f"Address: {r.get('full_address', 'N/A')}, "
                f"Distance: {round(r.get('distance_km', 0), 2)} km, "
                f"Avg Attribute Score: {round(r.get('avg_score', 0), 4)}"
            )
        return "\n".join(lines)

    @tool
    async def get_user_profile(user_id: str) -> str:
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
    async def get_user_onboarded_categories(user_id: str) -> str:
        try:
            entries = await user_category_repository.get_onboarded_categories(user_id)
        except Exception as e:
            logger.exception("get_user_onboarded_categories failed: %s", e)
            return f"Could not retrieve onboarded categories for user {user_id}."

        if not entries:
            return "User has not selected any categories during onboarding."

        names = [e.category.name for e in entries if e.category]
        return "Onboarded categories: " + ", ".join(names)

    @tool
    async def get_place_details(place_id: str) -> str:
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
    async def get_place_reviews(place_id: str, limit: int = 5) -> str:
        try:
            reviews = await review_repository.get_place_reviews(place_id, limit)
        except Exception as e:
            logger.exception("get_place_reviews failed for %s: %s", place_id, e)
            return f"Could not retrieve reviews for place {place_id}."

        if not reviews:
            return f"No reviews found for place {place_id}."

        lines = []
        for rv in reviews:
            comment = rv.text or "(no comment)"
            lines.append(
                f"- Rating: {rv.rating}/5, Reviewer: {rv.reviewerName}, Comment: {comment}"
            )
        return f"Reviews for place {place_id}:\n" + "\n".join(lines)

    @tool
    def submit_answer(message: str, place_ids: List[str]) -> str:
        return json.dumps({"message": message, "placeIds": place_ids})

    return [
        search_places,
        search_places_by_category,
        search_places_by_text,
        search_places_by_attributes,
        get_user_profile,
        get_user_onboarded_categories,
        get_place_details,
        get_place_reviews,
        submit_answer,
    ]
