"""API endpoints for food listings."""

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from pymongo.errors import PyMongoError

from config.database import get_collection


listings = Blueprint("listings", __name__)

REQUIRED_FIELDS = (
    "food_title",
    "category",
    "quantity",
    "unit",
    "original_price",
    "discounted_price",
    "expiry_date",
    "pickup_start",
    "pickup_end",
    "address",
    "description",
    "image",
    "freshness_score",
    "recovery_probability",
    "carbon_saved",
    "ai_recommendation",
)


@listings.route("/api/listings", methods=["POST"])
def create_listing():
    """Create a food listing from a JSON request payload."""
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "message": "A valid JSON request body is required."
        }), 400

    # Empty strings are considered missing for required text-based fields.
    missing_fields = [
        field for field in REQUIRED_FIELDS
        if field not in payload
        or payload[field] is None
        or (isinstance(payload[field], str) and not payload[field].strip())
    ]
    if missing_fields:
        return jsonify({
            "success": False,
            "message": "Required fields are missing.",
            "missing_fields": missing_fields
        }), 400

    listings_collection = get_collection("food_listings")
    if listings_collection is None:
        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable. Please try again later."
        }), 500

    timestamp = datetime.now(timezone.utc)
    listing_document = {
        field: payload[field]
        for field in REQUIRED_FIELDS
    }
    listing_document.update({
        "created_at": timestamp,
        "updated_at": timestamp,
        "status": "available",
    })

    try:
        result = listings_collection.insert_one(listing_document)
    except PyMongoError:
        return jsonify({
            "success": False,
            "message": "The listing could not be saved. Please try again later."
        }), 500

    return jsonify({
        "success": True,
        "message": "Listing created successfully",
        "listing_id": str(result.inserted_id),
    }), 201
