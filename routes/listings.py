"""API endpoints for food listings."""

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, jsonify, request, session
from pymongo.errors import PyMongoError

from config.database import get_collection


listings = Blueprint("listings", __name__)


# ==========================================================
# REQUIRED & OPTIONAL FIELDS
# ==========================================================

REQUIRED_FIELDS = (
    "food_title",
    "category",
    "food_type",
    "listing_type",
    "quantity",
    "unit",
    "original_price",
    "discounted_price",
    "expiry_date",
    "pickup_start",
    "pickup_end",
    "address",
    "city",
    "description",
    "image",
)

OPTIONAL_FIELDS = (
    "landmark",
    "pickup_instructions",
    "freshness_score",
    "recovery_probability",
    "carbon_saved",
    "ai_recommendation",
)


# ==========================================================
# CREATE LISTING
# POST /api/listings
# ==========================================================

@listings.route("/api/listings", methods=["POST"])
def create_listing():
    """Create a food listing for the currently logged-in user."""

    # ==========================================================
    # 1. Check authentication
    # ==========================================================

    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    # ==========================================================
    # 2. Validate user ID
    # ==========================================================

    try:
        owner_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):
        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    # ==========================================================
    # 3. Read JSON payload
    # ==========================================================

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "message": "A valid JSON request body is required."
        }), 400

    # ==========================================================
    # 4. Validate required fields
    # ==========================================================

    missing_fields = [
        field
        for field in REQUIRED_FIELDS
        if (
            field not in payload
            or payload[field] is None
            or (
                isinstance(payload[field], str)
                and not payload[field].strip()
            )
        )
    ]

    if missing_fields:
        return jsonify({
            "success": False,
            "message": "Required fields are missing.",
            "missing_fields": missing_fields
        }), 400

    # ==========================================================
    # 5. Get food listings collection
    # ==========================================================

    listings_collection = get_collection("food_listings")

    if listings_collection is None:
        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 6. Create timestamp
    # ==========================================================

    timestamp = datetime.now(timezone.utc)

    # ==========================================================
    # 7. Create listing document
    # ==========================================================

    listing_document = {
        field: payload[field]
        for field in REQUIRED_FIELDS
    }

    # Optional fields
    listing_document.update({

        "landmark": (
            payload.get("landmark", "").strip()
            if isinstance(payload.get("landmark", ""), str)
            else payload.get("landmark", "")
        ),

        "pickup_instructions": (
            payload.get("pickup_instructions", "").strip()
            if isinstance(
                payload.get("pickup_instructions", ""),
                str
            )
            else payload.get("pickup_instructions", "")
        ),

        "freshness_score": payload.get(
            "freshness_score",
            0
        ),

        "recovery_probability": payload.get(
            "recovery_probability",
            0
        ),

        "carbon_saved": payload.get(
            "carbon_saved",
            0
        ),

        "ai_recommendation": payload.get(
            "ai_recommendation",
            "No additional recommendation."
        ) or "No additional recommendation.",

        # Owner
        "owner_id": owner_id,

        # Initial listing status
        "status": "available",

        # Statistics
        "views": 0,
        "reservations": 0,

        # Timestamps
        "created_at": timestamp,
        "updated_at": timestamp,
    })

    # ==========================================================
    # 8. Save listing
    # ==========================================================

    try:

        result = listings_collection.insert_one(
            listing_document
        )

    except PyMongoError as error:

        print("MongoDB listing error:", error)

        return jsonify({
            "success": False,
            "message": (
                "The listing could not be saved. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 9. Success response
    # ==========================================================

    return jsonify({
        "success": True,
        "message": "Listing created successfully.",
        "listing_id": str(result.inserted_id),
    }), 201


# ==========================================================
# GET MY LISTINGS
# GET /api/listings/my
# ==========================================================

@listings.route("/api/listings/my", methods=["GET"])
def get_my_listings():
    """Return all food listings created by the logged-in user."""

    # ==========================================================
    # 1. Check authentication
    # ==========================================================

    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    # ==========================================================
    # 2. Validate user ID
    # ==========================================================

    try:
        owner_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    # ==========================================================
    # 3. Get collection
    # ==========================================================

    listings_collection = get_collection("food_listings")

    if listings_collection is None:
        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 4. Fetch user's listings
    # ==========================================================

    try:

        user_listings = list(
            listings_collection.find(
                {
                    "owner_id": owner_id
                }
            ).sort(
                "created_at",
                -1
            )
        )

    except PyMongoError as error:

        print("MongoDB get listings error:", error)

        return jsonify({
            "success": False,
            "message": (
                "Unable to load your listings. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 5. Convert MongoDB documents
    # ==========================================================

    listings_data = []

    for listing in user_listings:

        created_at = listing.get("created_at")
        updated_at = listing.get("updated_at")

        listings_data.append({

            "id": str(listing["_id"]),

            "food_title": listing.get(
                "food_title",
                ""
            ),

            "category": listing.get(
                "category",
                ""
            ),

            "food_type": listing.get(
                "food_type",
                ""
            ),

            "listing_type": listing.get(
                "listing_type",
                ""
            ),

            "quantity": listing.get(
                "quantity",
                0
            ),

            "unit": listing.get(
                "unit",
                ""
            ),

            "original_price": listing.get(
                "original_price",
                0
            ),

            "discounted_price": listing.get(
                "discounted_price",
                0
            ),

            "expiry_date": listing.get(
                "expiry_date",
                ""
            ),

            "pickup_start": listing.get(
                "pickup_start",
                ""
            ),

            "pickup_end": listing.get(
                "pickup_end",
                ""
            ),

            "address": listing.get(
                "address",
                ""
            ),

            "city": listing.get(
                "city",
                ""
            ),

            "landmark": listing.get(
                "landmark",
                ""
            ),

            "pickup_instructions": listing.get(
                "pickup_instructions",
                ""
            ),

            "description": listing.get(
                "description",
                ""
            ),

            "image": listing.get(
                "image",
                ""
            ),

            "freshness_score": listing.get(
                "freshness_score",
                0
            ),

            "recovery_probability": listing.get(
                "recovery_probability",
                0
            ),

            "carbon_saved": listing.get(
                "carbon_saved",
                0
            ),

            "ai_recommendation": listing.get(
                "ai_recommendation",
                ""
            ),

            "status": listing.get(
                "status",
                "available"
            ),

            "views": listing.get(
                "views",
                0
            ),

            "reservations": listing.get(
                "reservations",
                0
            ),

            "created_at": (
                created_at.isoformat()
                if created_at
                else None
            ),

            "updated_at": (
                updated_at.isoformat()
                if updated_at
                else None
            ),
        })

    # ==========================================================
    # 6. Success response
    # ==========================================================

    return jsonify({
        "success": True,
        "count": len(listings_data),
        "listings": listings_data
    }), 200

# ==========================================================
# GET SINGLE LISTING
# GET /api/listings/<listing_id>
# ==========================================================

@listings.route("/api/listings/<listing_id>", methods=["GET"])
def get_listing(listing_id):
    """Return one listing owned by the currently logged-in user."""

    # ==========================================================
    # 1. Check authentication
    # ==========================================================

    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    # ==========================================================
    # 2. Validate owner ID
    # ==========================================================

    try:
        owner_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):
        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    # ==========================================================
    # 3. Validate listing ID
    # ==========================================================

    try:
        listing_object_id = ObjectId(listing_id)

    except (InvalidId, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    # ==========================================================
    # 4. Get collection
    # ==========================================================

    listings_collection = get_collection("food_listings")

    if listings_collection is None:
        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable."
        }), 500

    # ==========================================================
    # 5. Find listing
    # ==========================================================

    try:
        listing = listings_collection.find_one({
            "_id": listing_object_id,
            "owner_id": owner_id
        })

    except PyMongoError as error:

        print("MongoDB get single listing error:", error)

        return jsonify({
            "success": False,
            "message": "Unable to load listing."
        }), 500

    # ==========================================================
    # 6. Listing not found
    # ==========================================================

    if listing is None:
        return jsonify({
            "success": False,
            "message": "Listing not found."
        }), 404

    # ==========================================================
    # 7. Convert MongoDB document
    # ==========================================================

    created_at = listing.get("created_at")
    updated_at = listing.get("updated_at")

    listing_data = {

        "id": str(listing["_id"]),

        "food_title": listing.get("food_title", ""),
        "category": listing.get("category", ""),
        "food_type": listing.get("food_type", ""),
        "listing_type": listing.get("listing_type", ""),

        "quantity": listing.get("quantity", 0),
        "unit": listing.get("unit", ""),

        "original_price": listing.get("original_price", 0),
        "discounted_price": listing.get("discounted_price", 0),

        "expiry_date": listing.get("expiry_date", ""),

        "pickup_start": listing.get("pickup_start", ""),
        "pickup_end": listing.get("pickup_end", ""),

        "address": listing.get("address", ""),
        "city": listing.get("city", ""),
        "landmark": listing.get("landmark", ""),

        "description": listing.get("description", ""),

        "pickup_instructions": listing.get(
            "pickup_instructions",
            ""
        ),

        "image": listing.get("image", ""),

        # AI
        "freshness_score": listing.get(
            "freshness_score",
            0
        ),

        "recovery_probability": listing.get(
            "recovery_probability",
            0
        ),

        "carbon_saved": listing.get(
            "carbon_saved",
            0
        ),

        "ai_recommendation": listing.get(
            "ai_recommendation",
            ""
        ),

        # Status
        "status": listing.get(
            "status",
            "available"
        ),

        # Statistics
        "views": listing.get(
            "views",
            0
        ),

        "reservations": listing.get(
            "reservations",
            0
        ),

        # Dates
        "created_at": (
            created_at.isoformat()
            if created_at
            else None
        ),

        "updated_at": (
            updated_at.isoformat()
            if updated_at
            else None
        ),
    }

    # ==========================================================
    # 8. Success
    # ==========================================================

    return jsonify({
        "success": True,
        "listing": listing_data
    }), 200

# ==========================================================
# UPDATE MY LISTING
# PUT /api/listings/<listing_id>
# ==========================================================

@listings.route("/api/listings/<listing_id>", methods=["PUT"])
def update_listing(listing_id):
    """Update a food listing owned by the currently logged-in user."""

    # ==========================================================
    # 1. Check authentication
    # ==========================================================

    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    # ==========================================================
    # 2. Validate owner ID
    # ==========================================================

    try:
        owner_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):
        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    # ==========================================================
    # 3. Validate listing ID
    # ==========================================================

    try:
        listing_object_id = ObjectId(listing_id)

    except (InvalidId, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    # ==========================================================
    # 4. Read JSON payload
    # ==========================================================

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "message": "A valid JSON request body is required."
        }), 400

    # ==========================================================
    # 5. Get collection
    # ==========================================================

    listings_collection = get_collection("food_listings")

    if listings_collection is None:
        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 6. Find owner's listing
    # ==========================================================

    try:
        existing_listing = listings_collection.find_one({
            "_id": listing_object_id,
            "owner_id": owner_id
        })

    except PyMongoError as error:

        print("MongoDB find listing for update error:", error)

        return jsonify({
            "success": False,
            "message": "Unable to load listing for update."
        }), 500

    # ==========================================================
    # 7. Listing not found
    # ==========================================================

    if existing_listing is None:
        return jsonify({
            "success": False,
            "message": (
                "Listing not found or you do not have "
                "permission to edit it."
            )
        }), 404

    # ==========================================================
    # 8. Validate editable fields
    # ==========================================================

    editable_fields = (
        "food_title",
        "category",
        "food_type",
        "listing_type",
        "quantity",
        "unit",
        "original_price",
        "discounted_price",
        "expiry_date",
        "pickup_start",
        "pickup_end",
        "address",
        "city",
        "landmark",
        "pickup_instructions",
        "description",
        "image",
        "freshness_score",
        "recovery_probability",
        "carbon_saved",
        "ai_recommendation",
    )

    missing_fields = [
        field
        for field in (
            "food_title",
            "category",
            "food_type",
            "listing_type",
            "quantity",
            "unit",
            "original_price",
            "discounted_price",
            "expiry_date",
            "pickup_start",
            "pickup_end",
            "address",
            "city",
            "description",
            "image",
        )
        if (
            field not in payload
            or payload[field] is None
            or (
                isinstance(payload[field], str)
                and not payload[field].strip()
            )
        )
    ]

    if missing_fields:
        return jsonify({
            "success": False,
            "message": "Required fields are missing.",
            "missing_fields": missing_fields
        }), 400

    # ==========================================================
    # 9. Build update data
    # ==========================================================

    update_data = {}

    for field in editable_fields:

        if field not in payload:
            continue

        value = payload[field]

        if isinstance(value, str):
            value = value.strip()

        update_data[field] = value

    # ==========================================================
    # 10. Never allow protected fields to be changed
    # ==========================================================

    update_data.pop("owner_id", None)
    update_data.pop("status", None)
    update_data.pop("views", None)
    update_data.pop("reservations", None)
    update_data.pop("created_at", None)
    update_data.pop("updated_at", None)

    # ==========================================================
    # 11. Update timestamp
    # ==========================================================

    update_data["updated_at"] = datetime.now(timezone.utc)

    # ==========================================================
    # 12. Update MongoDB
    # ==========================================================

    try:

        result = listings_collection.update_one(
            {
                "_id": listing_object_id,
                "owner_id": owner_id
            },
            {
                "$set": update_data
            }
        )

    except PyMongoError as error:

        print("MongoDB update listing error:", error)

        return jsonify({
            "success": False,
            "message": (
                "The listing could not be updated. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 13. Success
    # ==========================================================

    if result.matched_count == 0:
        return jsonify({
            "success": False,
            "message": "Listing could not be updated."
        }), 404

    return jsonify({
        "success": True,
        "message": "Listing updated successfully.",
        "listing_id": str(listing_object_id)
    }), 200

# ==========================================================
# PAUSE / RESUME MY LISTING
# PATCH /api/listings/<listing_id>/pause
# ==========================================================

@listings.route("/api/listings/<listing_id>/pause", methods=["PATCH"])
def toggle_pause_listing(listing_id):
    """Pause or resume a food listing owned by the logged-in user."""

    # ==========================================================
    # 1. Check authentication
    # ==========================================================

    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    # ==========================================================
    # 2. Validate owner ID
    # ==========================================================

    try:
        owner_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):
        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    # ==========================================================
    # 3. Validate listing ID
    # ==========================================================

    try:
        listing_object_id = ObjectId(listing_id)

    except (InvalidId, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    # ==========================================================
    # 4. Get collection
    # ==========================================================

    listings_collection = get_collection("food_listings")

    if listings_collection is None:
        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 5. Find owner's listing
    # ==========================================================

    try:
        listing = listings_collection.find_one({
            "_id": listing_object_id,
            "owner_id": owner_id
        })

    except PyMongoError as error:
        print("MongoDB pause listing error:", error)

        return jsonify({
            "success": False,
            "message": "Unable to update listing."
        }), 500

    # ==========================================================
    # 6. Listing not found
    # ==========================================================

    if listing is None:
        return jsonify({
            "success": False,
            "message": (
                "Listing not found or you do not have "
                "permission to update it."
            )
        }), 404

    # ==========================================================
    # 7. Toggle status
    # ==========================================================

    current_status = str(
        listing.get("status", "available")
    ).strip().lower()

    if current_status == "paused":
        new_status = "available"
        message = "Listing resumed successfully."

    else:
        new_status = "paused"
        message = "Listing paused successfully."

    # ==========================================================
    # 8. Update listing
    # ==========================================================

    try:
        result = listings_collection.update_one(
            {
                "_id": listing_object_id,
                "owner_id": owner_id
            },
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )

    except PyMongoError as error:
        print("MongoDB update listing status error:", error)

        return jsonify({
            "success": False,
            "message": (
                "The listing could not be updated. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 9. Verify update
    # ==========================================================

    if result.matched_count == 0:
        return jsonify({
            "success": False,
            "message": "Listing status could not be updated."
        }), 404

    # ==========================================================
    # 10. Success
    # ==========================================================

    return jsonify({
        "success": True,
        "message": message,
        "status": new_status
    }), 200

# ==========================================================
# DUPLICATE MY LISTING
# POST /api/listings/<listing_id>/duplicate
# ==========================================================

@listings.route(
    "/api/listings/<listing_id>/duplicate",
    methods=["POST"]
)
def duplicate_listing(listing_id):
    """Create a duplicate of a food listing owned by the logged-in user."""

    # ==========================================================
    # 1. Check authentication
    # ==========================================================

    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    # ==========================================================
    # 2. Validate owner ID
    # ==========================================================

    try:
        owner_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):
        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    # ==========================================================
    # 3. Validate listing ID
    # ==========================================================

    try:
        listing_object_id = ObjectId(listing_id)

    except (InvalidId, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    # ==========================================================
    # 4. Get collection
    # ==========================================================

    listings_collection = get_collection("food_listings")

    if listings_collection is None:
        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 5. Find owner's original listing
    # ==========================================================

    try:
        original_listing = listings_collection.find_one({
            "_id": listing_object_id,
            "owner_id": owner_id
        })

    except PyMongoError as error:

        print("MongoDB duplicate listing find error:", error)

        return jsonify({
            "success": False,
            "message": "Unable to load listing for duplication."
        }), 500

    # ==========================================================
    # 6. Listing not found
    # ==========================================================

    if original_listing is None:
        return jsonify({
            "success": False,
            "message": (
                "Listing not found or you do not have "
                "permission to duplicate it."
            )
        }), 404

    # ==========================================================
    # 7. Create duplicate
    # ==========================================================

    timestamp = datetime.now(timezone.utc)

    duplicate = original_listing.copy()

    # Remove MongoDB ID
    duplicate.pop("_id", None)

    # New title
    original_title = str(
        original_listing.get(
            "food_title",
            "Food Listing"
        )
    ).strip()

    duplicate["food_title"] = f"{original_title} (Copy)"

    # Keep same owner
    duplicate["owner_id"] = owner_id

    # New listing starts as available
    duplicate["status"] = "available"

    # Reset statistics
    duplicate["views"] = 0
    duplicate["reservations"] = 0

    # New timestamps
    duplicate["created_at"] = timestamp
    duplicate["updated_at"] = timestamp

    # ==========================================================
    # 8. Insert duplicate
    # ==========================================================

    try:

        result = listings_collection.insert_one(
            duplicate
        )

    except PyMongoError as error:

        print("MongoDB duplicate listing error:", error)

        return jsonify({
            "success": False,
            "message": (
                "The listing could not be duplicated. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 9. Success
    # ==========================================================

    return jsonify({
        "success": True,
        "message": "Listing duplicated successfully.",
        "listing_id": str(result.inserted_id)
    }), 201

# ==========================================================
# DELETE MY LISTING
# DELETE /api/listings/<listing_id>
# ==========================================================

@listings.route("/api/listings/<listing_id>", methods=["DELETE"])
def delete_listing(listing_id):
    """Delete a food listing owned by the currently logged-in user."""

    # ==========================================================
    # 1. Check authentication
    # ==========================================================

    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    # ==========================================================
    # 2. Validate owner ID
    # ==========================================================

    try:
        owner_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):
        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    # ==========================================================
    # 3. Validate listing ID
    # ==========================================================

    try:
        listing_object_id = ObjectId(listing_id)

    except (InvalidId, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    # ==========================================================
    # 4. Get collection
    # ==========================================================

    listings_collection = get_collection("food_listings")

    if listings_collection is None:
        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 5. Delete only the owner's listing
    # ==========================================================

    try:
        result = listings_collection.delete_one({
            "_id": listing_object_id,
            "owner_id": owner_id
        })

    except PyMongoError as error:
        print("MongoDB delete listing error:", error)

        return jsonify({
            "success": False,
            "message": (
                "The listing could not be deleted. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 6. Listing not found
    # ==========================================================

    if result.deleted_count == 0:
        return jsonify({
            "success": False,
            "message": (
                "Listing not found or you do not have "
                "permission to delete it."
            )
        }), 404

    # ==========================================================
    # 7. Success
    # ==========================================================

    return jsonify({
        "success": True,
        "message": "Listing deleted successfully."
    }), 200

