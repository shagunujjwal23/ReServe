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
# PROVIDER HELPER
# ==========================================================

def get_provider_details(owner_id):
    """
    Get provider/owner information for public listing pages.

    Returns:
        provider_name
        provider_image
        provider_verified
    """

    default_provider = {
        "provider_name": "Local Food Provider",
        "provider_image": "",
        "provider_verified": True,
    }

    if not owner_id:
        return default_provider

    try:
        users_collection = get_collection("users")

        if users_collection is None:
            return default_provider

        owner = users_collection.find_one({
            "_id": owner_id
        })

        if not owner:
            return default_provider

        provider_name = (
            owner.get("restaurant_name")
            or owner.get("business_name")
            or owner.get("organization_name")
            or owner.get("name")
            or owner.get("fullName")
            or owner.get("full_name")
            or owner.get("username")
            or "Local Food Provider"
        )

        profile_images = owner.get("profile_images", [])
        provider_image = (
            next(
                (
                    image for image in profile_images
                    if isinstance(image, str) and image.strip()
                ),
                "",
            )
            if isinstance(profile_images, list)
            else ""
        ) or (
            owner.get("profileImage")
            or owner.get("profile_image")
            or owner.get("image")
            or ""
        )

        provider_verified = owner.get(
            "verified",
            owner.get("is_verified", True)
        )

        return {
            "provider_name": provider_name,
            "provider_image": provider_image,
            "provider_verified": bool(provider_verified),
        }

    except PyMongoError as error:

        print("MongoDB provider lookup error:", error)

        return default_provider


def get_provider_pickup_location(owner_id):
    """Return the pickup address stored in the authenticated provider profile."""

    try:
        users_collection = get_collection("users")

        if users_collection is None:
            return None

        provider = users_collection.find_one({"_id": owner_id})

        if not provider:
            return None

        address = str(provider.get("address", "")).strip()
        city = str(provider.get("city", "")).strip()

        if not address or not city:
            return None

        return {
            "address": address,
            "city": city,
        }

    except PyMongoError as error:
        print("MongoDB provider pickup lookup error:", error)
        return None


# ==========================================================
# CREATE LISTING
# POST /api/listings
# ==========================================================

@listings.route("/api/listings", methods=["POST"])
def create_listing():
    """Create a food listing for the currently logged-in user."""

    # ==========================================================
    # 1. CHECK AUTHENTICATION
    # ==========================================================

    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    # ==========================================================
    # 2. VALIDATE USER ID
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
    # 3. READ JSON PAYLOAD
    # ==========================================================

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "message": "A valid JSON request body is required."
        }), 400

    # Pickup fields are managed by the provider profile. Do not rely on values
    # from the listing form, which no longer exposes editable location inputs.
    pickup_location = get_provider_pickup_location(owner_id)

    if pickup_location is None:
        return jsonify({
            "success": False,
            "message": (
                "Add a complete business address and city in your "
                "provider profile before creating a listing."
            )
        }), 400

    payload["address"] = pickup_location["address"]
    payload["city"] = pickup_location["city"]
    payload["landmark"] = ""

    # ==========================================================
    # 4. VALIDATE REQUIRED FIELDS
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
    # 5. GET FOOD LISTINGS COLLECTION
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
    # 6. CREATE TIMESTAMP
    # ==========================================================

    timestamp = datetime.now(timezone.utc)

    # ==========================================================
    # 7. CREATE LISTING DOCUMENT
    # ==========================================================

    listing_document = {
        field: payload[field]
        for field in REQUIRED_FIELDS
    }

    listing_document.update({
        "address": pickup_location["address"],
        "city": pickup_location["city"],
    })

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
    # 8. SAVE LISTING
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
    # 9. SUCCESS RESPONSE
    # ==========================================================

    return jsonify({
        "success": True,
        "message": "Listing created successfully.",
        "listing_id": str(result.inserted_id),
    }), 201


# ==========================================================
# GET PUBLIC AVAILABLE LISTINGS
# GET /api/listings
# ==========================================================

@listings.route("/api/listings", methods=["GET"])
def get_public_listings():
    """Return all currently available public food listings."""

    listings_collection = get_collection("food_listings")

    if listings_collection is None:
        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable."
        }), 500

    city = request.args.get("city", "").strip()
    listing_type = request.args.get("type", "").strip()

    query = {
        "status": "available"
    }

    if city:
        query["city"] = {
            "$regex": f"^{city}$",
            "$options": "i"
        }

    if listing_type:
        query["listing_type"] = listing_type

    try:

        food_listings = list(
            listings_collection.find(query)
            .sort("created_at", -1)
        )

        listings_data = []

        for listing in food_listings:

            provider = get_provider_details(
                listing.get("owner_id")
            )

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

                "description": listing.get(
                    "description",
                    ""
                ),

                "pickup_instructions": listing.get(
                    "pickup_instructions",
                    ""
                ),

                "image": listing.get(
                    "image",
                    ""
                ),

                # Provider
                "provider_name": provider["provider_name"],

                "provider_image": provider["provider_image"],

                "provider_verified": provider["provider_verified"],

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

                # Date
                "created_at": (
                    listing["created_at"].isoformat()
                    if listing.get("created_at")
                    else None
                )
            })

        return jsonify({
            "success": True,
            "count": len(listings_data),
            "listings": listings_data
        }), 200

    except PyMongoError as error:

        print(
            "MongoDB public listings error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load food listings."
        }), 500


# ==========================================================
# GET MY LISTINGS
# GET /api/listings/my
# ==========================================================

@listings.route("/api/listings/my", methods=["GET"])
def get_my_listings():
    """Return all food listings created by the logged-in user."""

    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    try:
        owner_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    listings_collection = get_collection("food_listings")

    if listings_collection is None:
        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable. "
                "Please try again later."
            )
        }), 500

    try:

        user_listings = list(
            listings_collection.find({
                "owner_id": owner_id
            }).sort(
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

    return jsonify({
        "success": True,
        "count": len(listings_data),
        "listings": listings_data
    }), 200


# ==========================================================
# GET SINGLE PUBLIC LISTING
# GET /api/listings/<listing_id>
# ==========================================================

@listings.route("/api/listings/<listing_id>", methods=["GET"])
def get_listing(listing_id):
    """
    Return one available food listing for individual users.

    Used by:
        /listing/<listing_id>

    This endpoint provides all information required by
    the individual user's listing-details page.
    """

    # ==========================================================
    # VALIDATE LISTING ID
    # ==========================================================

    try:

        listing_object_id = ObjectId(listing_id)

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    # ==========================================================
    # GET COLLECTION
    # ==========================================================

    listings_collection = get_collection("food_listings")

    if listings_collection is None:

        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable."
        }), 500

    # ==========================================================
    # FIND AVAILABLE LISTING
    # ==========================================================

    try:

        listing = listings_collection.find_one({
            "_id": listing_object_id,
            "status": "available"
        })

    except PyMongoError as error:

        print(
            "MongoDB public single listing error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load listing."
        }), 500

    # ==========================================================
    # LISTING NOT FOUND
    # ==========================================================

    if listing is None:

        return jsonify({
            "success": False,
            "message": (
                "Listing not found or is no longer available."
            )
        }), 404

    # ==========================================================
    # PROVIDER DETAILS
    # ==========================================================

    provider = get_provider_details(
        listing.get("owner_id")
    )

    # ==========================================================
    # DATES
    # ==========================================================

    created_at = listing.get("created_at")
    updated_at = listing.get("updated_at")

    # ==========================================================
    # LISTING RESPONSE
    # ==========================================================

    listing_data = {

        "id": str(listing["_id"]),

        # ======================================================
        # FOOD
        # ======================================================

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

        # ======================================================
        # QUANTITY & PRICE
        # ======================================================

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

        # ======================================================
        # EXPIRY
        # ======================================================

        "expiry_date": listing.get(
            "expiry_date",
            ""
        ),

        # ======================================================
        # PICKUP
        # ======================================================

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

        # ======================================================
        # DESCRIPTION & IMAGE
        # ======================================================

        "description": listing.get(
            "description",
            ""
        ),

        "image": listing.get(
            "image",
            ""
        ),

        # ======================================================
        # PROVIDER
        # ======================================================

        "provider_name": provider["provider_name"],

        "provider_image": provider["provider_image"],

        "provider_verified": provider["provider_verified"],

        # ======================================================
        # AI DATA
        # ======================================================

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

        # ======================================================
        # STATUS
        # ======================================================

        "status": listing.get(
            "status",
            "available"
        ),

        # ======================================================
        # STATISTICS
        # ======================================================

        "views": listing.get(
            "views",
            0
        ),

        "reservations": listing.get(
            "reservations",
            0
        ),

        # ======================================================
        # DATES
        # ======================================================

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

    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    try:

        owner_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    try:

        listing_object_id = ObjectId(listing_id)

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):

        return jsonify({
            "success": False,
            "message": "A valid JSON request body is required."
        }), 400

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
    # FIND EXISTING LISTING
    # ==========================================================

    try:

        existing_listing = listings_collection.find_one({
            "_id": listing_object_id,
            "owner_id": owner_id
        })

    except PyMongoError as error:

        print(
            "MongoDB find listing for update error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load listing for update."
        }), 500

    if existing_listing is None:

        return jsonify({
            "success": False,
            "message": (
                "Listing not found or you do not have "
                "permission to edit it."
            )
        }), 404

    # ==========================================================
    # EDITABLE FIELDS
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

    # ==========================================================
    # REQUIRED UPDATE FIELDS
    # ==========================================================

    required_update_fields = (
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
        "description",
        "image",
    )

    missing_fields = [
        field
        for field in required_update_fields
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

    # Keep edited listings in sync with the provider profile's pickup
    # location, rather than accepting client-supplied address fields.
    pickup_location = get_provider_pickup_location(owner_id)

    if pickup_location is None:
        return jsonify({
            "success": False,
            "message": (
                "Add a complete business address and city in your "
                "provider profile before updating a listing."
            )
        }), 400

    # ==========================================================
    # BUILD UPDATE DATA
    # ==========================================================

    update_data = {}

    for field in editable_fields:

        if field not in payload:
            continue

        value = payload[field]

        if isinstance(value, str):
            value = value.strip()

        update_data[field] = value

    update_data["address"] = pickup_location["address"]
    update_data["city"] = pickup_location["city"]
    update_data["landmark"] = ""

    update_data["updated_at"] = datetime.now(timezone.utc)

    # ==========================================================
    # UPDATE DATABASE
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

        print(
            "MongoDB update listing error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "The listing could not be updated. "
                "Please try again later."
            )
        }), 500

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

@listings.route(
    "/api/listings/<listing_id>/pause",
    methods=["PATCH"]
)
def toggle_pause_listing(listing_id):
    """Pause or resume a food listing."""

    session_user_id = session.get("user_id")

    if not session_user_id:

        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    try:

        owner_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    try:

        listing_object_id = ObjectId(listing_id)

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    listings_collection = get_collection("food_listings")

    if listings_collection is None:

        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable."
        }), 500

    try:

        listing = listings_collection.find_one({
            "_id": listing_object_id,
            "owner_id": owner_id
        })

    except PyMongoError as error:

        print(
            "MongoDB pause listing error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to update listing."
        }), 500

    if listing is None:

        return jsonify({
            "success": False,
            "message": (
                "Listing not found or you do not have "
                "permission to update it."
            )
        }), 404

    current_status = str(
        listing.get("status", "available")
    ).strip().lower()

    if current_status == "paused":

        new_status = "available"
        message = "Listing resumed successfully."

    else:

        new_status = "paused"
        message = "Listing paused successfully."

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

        print(
            "MongoDB update listing status error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "The listing could not be updated. "
                "Please try again later."
            )
        }), 500

    if result.matched_count == 0:

        return jsonify({
            "success": False,
            "message": "Listing status could not be updated."
        }), 404

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
    """Create a duplicate of a food listing."""

    session_user_id = session.get("user_id")

    if not session_user_id:

        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    try:

        owner_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    try:

        listing_object_id = ObjectId(listing_id)

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    listings_collection = get_collection("food_listings")

    if listings_collection is None:

        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable."
        }), 500

    try:

        original_listing = listings_collection.find_one({
            "_id": listing_object_id,
            "owner_id": owner_id
        })

    except PyMongoError as error:

        print(
            "MongoDB duplicate listing find error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load listing for duplication."
        }), 500

    if original_listing is None:

        return jsonify({
            "success": False,
            "message": (
                "Listing not found or you do not have "
                "permission to duplicate it."
            )
        }), 404

    timestamp = datetime.now(timezone.utc)

    duplicate = original_listing.copy()

    duplicate.pop("_id", None)

    original_title = str(
        original_listing.get(
            "food_title",
            "Food Listing"
        )
    ).strip()

    duplicate["food_title"] = (
        f"{original_title} (Copy)"
    )

    duplicate["owner_id"] = owner_id

    duplicate["status"] = "available"

    duplicate["views"] = 0

    duplicate["reservations"] = 0

    duplicate["created_at"] = timestamp

    duplicate["updated_at"] = timestamp

    try:

        result = listings_collection.insert_one(
            duplicate
        )

    except PyMongoError as error:

        print(
            "MongoDB duplicate listing error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "The listing could not be duplicated. "
                "Please try again later."
            )
        }), 500

    return jsonify({
        "success": True,
        "message": "Listing duplicated successfully.",
        "listing_id": str(result.inserted_id)
    }), 201


# ==========================================================
# DELETE MY LISTING
# DELETE /api/listings/<listing_id>
# ==========================================================

@listings.route(
    "/api/listings/<listing_id>",
    methods=["DELETE"]
)
def delete_listing(listing_id):
    """Delete a food listing owned by the logged-in user."""

    session_user_id = session.get("user_id")

    if not session_user_id:

        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    try:

        owner_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    try:

        listing_object_id = ObjectId(listing_id)

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    listings_collection = get_collection("food_listings")

    if listings_collection is None:

        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable."
        }), 500

    try:

        result = listings_collection.delete_one({
            "_id": listing_object_id,
            "owner_id": owner_id
        })

    except PyMongoError as error:

        print(
            "MongoDB delete listing error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "The listing could not be deleted. "
                "Please try again later."
            )
        }), 500

    if result.deleted_count == 0:

        return jsonify({
            "success": False,
            "message": (
                "Listing not found or you do not have "
                "permission to delete it."
            )
        }), 404

    return jsonify({
        "success": True,
        "message": "Listing deleted successfully."
    }), 200

