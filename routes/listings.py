"""API endpoints for food listings."""

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, jsonify, request, session
from pymongo.errors import PyMongoError
from pymongo import ReturnDocument

from config.database import get_collection
from services.lifecycle import (
    _as_utc,
    normalize_datetime,
    refresh_lifecycle,
)


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
    "preparation_time",
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
                    image
                    for image in profile_images
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

        print(
            "MongoDB provider lookup error:",
            error
        )

        return default_provider


def get_provider_pickup_location(owner_id):
    """Return the pickup address stored in the authenticated provider profile."""

    try:

        users_collection = get_collection("users")

        if users_collection is None:
            return None

        provider = users_collection.find_one({
            "_id": owner_id
        })

        if not provider:
            return None

        address = str(
            provider.get("address", "")
        ).strip()

        area = str(
            provider.get("area", "")
        ).strip()

        city = str(
            provider.get("city", "")
        ).strip()

        if not address or not area or not city:
            return None

        return {
    "address": address,
    "area": area,
    "city": city,
}

    except PyMongoError as error:

        print(
            "MongoDB provider pickup lookup error:",
            error
        )

        return None


# ==========================================================
# CREATE LISTING
# POST /api/listings
# ==========================================================

@listings.route(
    "/api/listings",
    methods=["POST"]
)
def create_listing():
    """Create a Sell or Donate food listing."""

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

        owner_id = ObjectId(
            session_user_id
        )

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    # ==========================================================
    # 3. READ JSON PAYLOAD
    # ==========================================================

    payload = request.get_json(
        silent=True
    )

    if not isinstance(payload, dict):

        return jsonify({
            "success": False,
            "message": (
                "A valid JSON request body "
                "is required."
            )
        }), 400

    # ==========================================================
    # 4. GET PROVIDER PICKUP LOCATION
    # ==========================================================

    pickup_location = get_provider_pickup_location(
        owner_id
    )

    if pickup_location is None:

        return jsonify({
            "success": False,
            "message": (
                "Add a complete business address and city "
                "in your provider profile before creating "
                "a listing."
            )
        }), 400

    # The provider profile controls the pickup location.
    payload["address"] = pickup_location["address"]
    payload["city"] = pickup_location["city"]
    payload["landmark"] = ""

    # ==========================================================
    # 5. VALIDATE REQUIRED FIELDS
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
    # 6. VALIDATE LISTING TYPE
    # ==========================================================

    listing_type = str(
        payload.get("listing_type", "")
    ).strip().lower()

    if listing_type not in {
        "sell",
        "donate"
    }:

        return jsonify({
            "success": False,
            "message": (
                "Listing type must be either "
                "'sell' or 'donate'."
            )
        }), 400

    payload["listing_type"] = listing_type

    # ==========================================================
    # 7. VALIDATE QUANTITY
    # ==========================================================

    try:

        quantity = int(
            payload.get("quantity", 0)
        )

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "message": (
                "Quantity must be a whole number."
            )
        }), 400

    if quantity <= 0:

        return jsonify({
            "success": False,
            "message": (
                "Quantity must be greater than zero."
            )
        }), 400

    payload["quantity"] = quantity

    # ==========================================================
    # 8. VALIDATE PICKUP DATES
    # ==========================================================

    pickup_start = _as_utc(
        payload.get("pickup_start")
    )

    pickup_end = _as_utc(
        payload.get("pickup_end")
    )

    if (
        not pickup_start
        or not pickup_end
        or pickup_end <= pickup_start
    ):

        return jsonify({
            "success": False,
            "message": (
                "Provide a valid pickup start "
                "and end time."
            )
        }), 400

    payload["pickup_start"] = normalize_datetime(
        payload["pickup_start"]
    )

    payload["pickup_end"] = normalize_datetime(
        payload["pickup_end"]
    )

    # ==========================================================
    # 9. GET DATABASE COLLECTIONS
    # ==========================================================

    listings_collection = get_collection(
        "food_listings"
    )

    donations_collection = get_collection(
        "donations"
    )

    if listings_collection is None:

        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable. "
                "Please try again later."
            )
        }), 500

    if donations_collection is None:

        return jsonify({
            "success": False,
            "message": (
                "MongoDB donations collection is unavailable."
            )
        }), 500

    # ==========================================================
    # 10. CREATE TIMESTAMP
    # ==========================================================

    timestamp = datetime.now(
        timezone.utc
    )

    # ==========================================================
    # 11. CREATE FOOD LISTING DOCUMENT
    # ==========================================================

    listing_document = {
        field: payload[field]
        for field in REQUIRED_FIELDS
    }

    listing_document.update({

        "address": pickup_location["address"],

        "area": pickup_location["area"],

        "city": pickup_location["city"],

        "landmark": (
            payload.get(
                "landmark",
                ""
            ).strip()
            if isinstance(
                payload.get(
                    "landmark",
                    ""
                ),
                str
            )
            else payload.get(
                "landmark",
                ""
            )
        ),

        "pickup_instructions": (
            payload.get(
                "pickup_instructions",
                ""
            ).strip()
            if isinstance(
                payload.get(
                    "pickup_instructions",
                    ""
                ),
                str
            )
            else payload.get(
                "pickup_instructions",
                ""
            )
        ),

        "preparation_time": (
            payload.get(
                "preparation_time",
                ""
            ).strip()
            if isinstance(
                payload.get(
                    "preparation_time",
                    ""
                ),
                str
            )
            else payload.get(
                "preparation_time",
                ""
            )
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

        # Both Sell and Donate listings start as available.
        "status": "available",

        # Statistics
        "views": 0,
"viewed_by": [],

"reservations": 0,

        "original_quantity": quantity,

        # Timestamps
        "created_at": timestamp,

        "updated_at": timestamp,
    })

    # ==========================================================
    # 12. SAVE FOOD LISTING
    # ==========================================================

    try:

        result = listings_collection.insert_one(
            listing_document
        )

        listing_id = result.inserted_id

    except PyMongoError as error:

        print(
            "MongoDB listing error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "The listing could not be saved. "
                "Please try again later."
            )
        }), 500

    # ==========================================================
    # 13. CREATE DONATION AUTOMATICALLY
    # ==========================================================

    if listing_type == "donate":

        try:

            # --------------------------------------------------
            # Get provider name
            # --------------------------------------------------

            users_collection = get_collection(
                "users"
            )

            provider = None

            if users_collection is not None:

                provider = users_collection.find_one({
                    "_id": owner_id
                })

            provider = provider or {}

            provider_name = (
                provider.get("business_name")
                or provider.get("restaurant_name")
                or provider.get("organization_name")
                or provider.get("full_name")
                or provider.get("name")
                or "Food Provider"
            )

            # --------------------------------------------------
            # Create donation document
            # --------------------------------------------------

            donation_document = {

                # Relationship with food listing
                "listing_id": listing_id,

                # Provider
                "provider_id": owner_id,

                "provider_name": provider_name,

                # No single NGO owns this donation.
                # Multiple NGOs can claim portions.
                "ngo_id": None,

                # Donation quantity
                "surplus_quantity": quantity,

                "available_quantity": quantity,

                # Food information
                "food_title": payload.get(
                    "food_title",
                    ""
                ),

                "category": payload.get(
                    "category",
                    ""
                ),

                "food_type": payload.get(
                    "food_type",
                    ""
                ),

                "unit": payload.get(
                    "unit",
                    ""
                ),

                "description": payload.get(
                    "description",
                    ""
                ),

                "image": payload.get(
                    "image",
                    ""
                ),

                # Pickup information
                "pickup_address": pickup_location[
                    "address"
                ],

                "city": pickup_location[
                    "city"
                ],

                "pickup_instructions": str(
                    payload.get(
                        "pickup_instructions",
                        ""
                    )
                ).strip()[:250],

                "donation_pickup_start": normalize_datetime(
                    payload["pickup_start"]
                ),

                "donation_pickup_end": normalize_datetime(
                    payload["pickup_end"]
                ),

                # Donation status
                "status": "available",

                # Lifecycle timestamps
                "created_at": timestamp,

                "updated_at": timestamp,

                "claimed_at": None,

                "picked_up_at": None,

                "completed_at": None,

                "expired_at": None,
            }

            # --------------------------------------------------
            # Save donation
            # --------------------------------------------------

            donation_result = donations_collection.insert_one(
                donation_document
            )

            # --------------------------------------------------
            # Link donation to food listing
            # --------------------------------------------------

            listings_collection.update_one(
                {
                    "_id": listing_id,
                    "owner_id": owner_id
                },
                {
                    "$set": {
                        "donation_id": (
                            donation_result.inserted_id
                        ),
                        "updated_at": (
                            datetime.now(
                                timezone.utc
                            )
                        ),
                    }
                }
            )

            donation_id = donation_result.inserted_id

        except PyMongoError as error:

            print(
                "MongoDB donation creation error:",
                error
            )

            # Remove the listing if donation creation failed.
            # This prevents a Donate listing from existing
            # without its corresponding donation record.

            try:

                listings_collection.delete_one({
                    "_id": listing_id,
                    "owner_id": owner_id
                })

            except PyMongoError as cleanup_error:

                print(
                    "MongoDB donation cleanup error:",
                    cleanup_error
                )

            return jsonify({
                "success": False,
                "message": (
                    "The donation could not be published. "
                    "Please try again later."
                )
            }), 500

    else:

        donation_id = None

    # ==========================================================
    # 14. SUCCESS RESPONSE
    # ==========================================================

    if listing_type == "donate":

        return jsonify({

            "success": True,

            "message": (
                "Food donation published "
                "successfully for NGOs."
            ),

            "listing_id": str(
                listing_id
            ),

            "donation_id": str(
                donation_id
            ),

            "listing_type": "donate",

        }), 201

    return jsonify({

        "success": True,

        "message": (
            "Food listing created successfully."
        ),

        "listing_id": str(
            listing_id
        ),

        "listing_type": "sell",

    }), 201


# ==========================================================
# GET PUBLIC AVAILABLE SELL LISTINGS
# GET /api/listings
# ==========================================================

@listings.route(
    "/api/listings",
    methods=["GET"]
)
def get_public_listings():
    """
    Return only Sell listings for the User Marketplace.

    Donate listings are handled separately by:
        GET /api/donations/available
    """

    refresh_lifecycle()

    listings_collection = get_collection(
        "food_listings"
    )

    if listings_collection is None:

        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable."
            )
        }), 500

    city = request.args.get(
        "city",
        ""
    ).strip()

    # IMPORTANT:
    # User Marketplace MUST ONLY return Sell listings.
    query = {
        "status": "available",
        "listing_type": "sell"
    }

    if city:

        query["city"] = {
            "$regex": f"^{city}$",
            "$options": "i"
        }

    try:

        food_listings = list(
            listings_collection.find(
                query
            ).sort(
                "created_at",
                -1
            )
        )

        listings_data = []

        for listing in food_listings:

            provider = get_provider_details(
                listing.get("owner_id")
            )

            listings_data.append({

                "id": str(
                    listing["_id"]
                ),

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

                "preparation_time": listing.get(
                    "preparation_time",
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

                "preparation_time": listing.get(
                    "preparation_time",
                    ""
                ),

                "address": listing.get(
                    "address",
                    ""
                ),

                "area": listing.get(
    "area",
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
                "provider_name": provider[
                    "provider_name"
                ],

                "provider_image": provider[
                    "provider_image"
                ],

                "provider_verified": provider[
                    "provider_verified"
                ],

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
                    listing[
                        "created_at"
                    ].isoformat()
                    if listing.get(
                        "created_at"
                    )
                    else None
                )
            })

        return jsonify({

            "success": True,

            "count": len(
                listings_data
            ),

            "listings": listings_data

        }), 200

    except PyMongoError as error:

        print(
            "MongoDB public listings error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load food listings."
            )
        }), 500


# ==========================================================
# GET MY LISTINGS
# GET /api/listings/my
# ==========================================================

@listings.route(
    "/api/listings/my",
    methods=["GET"]
)
def get_my_listings():
    """Return all food listings created by the logged-in user."""

    refresh_lifecycle()

    session_user_id = session.get(
        "user_id"
    )

    if not session_user_id:

        return jsonify({
            "success": False,
            "message": (
                "Authentication is required."
            )
        }), 401

    try:

        owner_id = ObjectId(
            session_user_id
        )

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    listings_collection = get_collection(
        "food_listings"
    )

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

        print(
            "MongoDB get listings error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load your listings. "
                "Please try again later."
            )
        }), 500

    listings_data = []

    for listing in user_listings:

        created_at = listing.get(
            "created_at"
        )

        updated_at = listing.get(
            "updated_at"
        )

        listings_data.append({

            "id": str(
                listing["_id"]
            ),

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

            "preparation_time": listing.get(
                "preparation_time",
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

            "preparation_time": listing.get(
                "preparation_time",
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

            "donation_id": (
                str(
                    listing["donation_id"]
                )
                if listing.get(
                    "donation_id"
                )
                else None
            ),
        })

    return jsonify({

        "success": True,

        "count": len(
            listings_data
        ),

        "listings": listings_data

    }), 200


# ==========================================================
# RECORD CUSTOMER VIEW
# POST /api/listings/<listing_id>/view
# ==========================================================

@listings.route(
    "/api/listings/<listing_id>/view",
    methods=["POST"]
)
def record_listing_view(listing_id):
    """Record one unique customer view for a listing."""

    refresh_lifecycle()

    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({
            "success": False,
            "message": "Authentication is required."
        }), 401

    try:
        user_id = ObjectId(session_user_id)
        listing_object_id = ObjectId(listing_id)
    except (InvalidId, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid user or listing ID."
        }), 400

    listings_collection = get_collection("food_listings")

    if listings_collection is None:
        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable."
        }), 500

    try:
        # $ne + $addToSet makes the view unique per user per listing.
        listing = listings_collection.find_one_and_update(
            {
                "_id": listing_object_id,
                "status": "available",
                "listing_type": "sell",
                "viewed_by": {"$ne": user_id}
            },
            {
                "$inc": {"views": 1},
                "$addToSet": {"viewed_by": user_id}
            },
            return_document=ReturnDocument.AFTER
        )

        if listing is None:
            # Either the listing was already viewed by this user,
            # or it is not an available Sell listing.
            listing = listings_collection.find_one({
                "_id": listing_object_id,
                "status": "available",
                "listing_type": "sell"
            })

    except PyMongoError as error:
        print("MongoDB listing view error:", error)

        return jsonify({
            "success": False,
            "message": "Unable to record listing view."
        }), 500

    if listing is None:
        return jsonify({
            "success": False,
            "message": "Listing not found or is no longer available."
        }), 404

    return jsonify({
        "success": True,
        "views": listing.get("views", 0)
    }), 200


# ==========================================================
# GET SINGLE PUBLIC SELL LISTING
# GET /api/listings/<listing_id>
# ==========================================================

@listings.route(
    "/api/listings/<listing_id>",
    methods=["GET"]
)
def get_listing(listing_id):
    """
    Return one publicly available Sell listing.

    This endpoint is used by the customer's
    Food Details page.
    """

    refresh_lifecycle()

    # ==========================================================
    # 1. VALIDATE LISTING ID
    # ==========================================================

    try:
        listing_object_id = ObjectId(listing_id)

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    # ==========================================================
    # 2. GET DATABASE COLLECTION
    # ==========================================================

    listings_collection = get_collection(
        "food_listings"
    )

    if listings_collection is None:

        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable."
            )
        }), 500

    # ==========================================================
    # 3. FIND PUBLIC AVAILABLE SELL LISTING
    # ==========================================================

    try:

        listing = listings_collection.find_one_and_update(
            {
                "_id": listing_object_id,
                "status": "available",
                "listing_type": "sell"
            },
            {
                "$inc": {
                    "views": 1
                }
            },
            return_document=ReturnDocument.AFTER
        )

    except PyMongoError as error:

        print(
            "MongoDB public single listing error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load listing."
            )
        }), 500

    # ==========================================================
    # 4. LISTING NOT FOUND
    # ==========================================================

    if listing is None:

        return jsonify({
            "success": False,
            "message": (
                "Listing not found or is no "
                "longer available."
            )
        }), 404

    # ==========================================================
    # 5. PROVIDER INFORMATION
    # ==========================================================

    provider = get_provider_details(
        listing.get("owner_id")
    )

    # ==========================================================
    # 6. DATES
    # ==========================================================

    created_at = listing.get(
        "created_at"
    )

    updated_at = listing.get(
        "updated_at"
    )

    # ==========================================================
    # 7. RESPONSE DATA
    # ==========================================================

    listing_data = {

        # ------------------------------------------------------
        # Basic listing information
        # ------------------------------------------------------

        "id": str(
            listing["_id"]
        ),

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

        # ------------------------------------------------------
        # Quantity and price
        # ------------------------------------------------------

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

        # ------------------------------------------------------
        # Expiry
        # ------------------------------------------------------

        "expiry_date": listing.get(
            "expiry_date",
            ""
        ),

        # ------------------------------------------------------
        # Pickup
        # ------------------------------------------------------

        "pickup_start": listing.get(
            "pickup_start",
            ""
        ),

        "pickup_end": listing.get(
            "pickup_end",
            ""
        ),

        "preparation_time": listing.get(
            "preparation_time",
            ""
        ),

        "address": listing.get(
            "address",
            ""
        ),

        # IMPORTANT:
        # Area is included for the new
        # area-based location system.

        "area": listing.get(
            "area",
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

        # ------------------------------------------------------
        # Description and image
        # ------------------------------------------------------

        "description": listing.get(
            "description",
            ""
        ),

        "image": listing.get(
            "image",
            ""
        ),

        # ------------------------------------------------------
        # Provider
        # ------------------------------------------------------

        "provider_name": provider[
            "provider_name"
        ],

        "provider_image": provider[
            "provider_image"
        ],

        "provider_verified": provider[
            "provider_verified"
        ],

        # ------------------------------------------------------
        # AI information
        # ------------------------------------------------------

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

        # ------------------------------------------------------
        # Status / statistics
        # ------------------------------------------------------

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

        # ------------------------------------------------------
        # Timestamps
        # ------------------------------------------------------

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
    # 8. SUCCESS RESPONSE
    # ==========================================================

    return jsonify({
        "success": True,
        "listing": listing_data
    }), 200

# ==========================================================
# UPDATE MY LISTING
# PUT /api/listings/<listing_id>
# ==========================================================

@listings.route(
    "/api/listings/<listing_id>",
    methods=["PUT"]
)
def update_listing(listing_id):
    """
    Update a food listing owned by the logged-in user.

    Listing type cannot be changed after creation.
    """

    refresh_lifecycle()

    session_user_id = session.get(
        "user_id"
    )

    if not session_user_id:

        return jsonify({
            "success": False,
            "message": (
                "Authentication is required."
            )
        }), 401

    try:

        owner_id = ObjectId(
            session_user_id
        )

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    try:

        listing_object_id = ObjectId(
            listing_id
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    payload = request.get_json(
        silent=True
    )

    if not isinstance(
        payload,
        dict
    ):

        return jsonify({
            "success": False,
            "message": (
                "A valid JSON request body "
                "is required."
            )
        }), 400

    listings_collection = get_collection(
        "food_listings"
    )

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
            "message": (
                "Unable to load listing for update."
            )
        }), 500

    if existing_listing is None:

        return jsonify({
            "success": False,
            "message": (
                "Listing not found or you do not "
                "have permission to edit it."
            )
        }), 404

    current_status = str(
        existing_listing.get(
            "status",
            "available"
        )
    ).lower()

    if current_status not in {
        "available",
        "paused"
    }:

        return jsonify({
            "success": False,
            "message": (
                "Only active or paused listings "
                "can be edited."
            )
        }), 409

    # ==========================================================
    # LISTING TYPE CANNOT CHANGE
    # ==========================================================

    existing_type = str(
        existing_listing.get(
            "listing_type",
            ""
        )
    ).strip().lower()

    submitted_type = str(
        payload.get(
            "listing_type",
            existing_type
        )
    ).strip().lower()

    if submitted_type != existing_type:

        return jsonify({
            "success": False,
            "message": (
                "Listing type cannot be changed "
                "after the listing is created."
            )
        }), 409

    # ==========================================================
    # EDITABLE FIELDS
    # ==========================================================

    editable_fields = (
        "food_title",
        "category",
        "food_type",
        "quantity",
        "unit",
        "original_price",
        "discounted_price",
        "expiry_date",
        "preparation_time",
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
                isinstance(
                    payload[field],
                    str
                )
                and not payload[field].strip()
            )
        )
    ]

    if missing_fields:

        return jsonify({
            "success": False,
            "message": (
                "Required fields are missing."
            ),
            "missing_fields": missing_fields
        }), 400

    # ==========================================================
    # GET CURRENT PROVIDER LOCATION
    # ==========================================================

    pickup_location = get_provider_pickup_location(
        owner_id
    )

    if pickup_location is None:

        return jsonify({
            "success": False,
            "message": (
                "Add a complete business address "
                "and city in your provider profile "
                "before updating a listing."
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

        if isinstance(
            value,
            str
        ):

            value = value.strip()

        update_data[field] = value

    # ==========================================================
    # VALIDATE QUANTITY
    # ==========================================================

    try:

        update_quantity = int(
            update_data.get(
                "quantity",
                0
            )
        )

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "message": (
                "Quantity must be a whole number."
            )
        }), 400

    if update_quantity <= 0:

        return jsonify({
            "success": False,
            "message": (
                "Quantity must be greater than zero."
            )
        }), 400

    update_data["quantity"] = update_quantity

    # ==========================================================
# PREPARATION / EXPIRY
# ==========================================================

    if "preparation_time" in payload:

        if payload.get("preparation_time"):
            # Freshly prepared food
            update_data["preparation_time"] = str(
            payload["preparation_time"]
        ).strip()

        # Remove old expiry information
        update_data["expiry_date"] = None

    else:
        # Packaged food
        update_data["preparation_time"] = None

        if payload.get("expiry_date"):
            update_data["expiry_date"] = payload["expiry_date"]

    # ==========================================================
    # VALIDATE PICKUP
    # ==========================================================

    pickup_start = _as_utc(
        update_data.get(
            "pickup_start"
        )
    )

    pickup_end = _as_utc(
        update_data.get(
            "pickup_end"
        )
    )

    if (
        not pickup_start
        or not pickup_end
        or pickup_end <= pickup_start
    ):

        return jsonify({
            "success": False,
            "message": (
                "Provide a valid pickup start "
                "and end time."
            )
        }), 400

    update_data["pickup_start"] = normalize_datetime(
        update_data["pickup_start"]
    )

    update_data["pickup_end"] = normalize_datetime(
        update_data["pickup_end"]
    )

    # ==========================================================
    # PROVIDER LOCATION
    # ==========================================================

    update_data["address"] = pickup_location[
        "address"
    ]

    update_data["area"] = pickup_location[
        "area"
    ]

    update_data["city"] = pickup_location[
        "city"
    ]

    update_data["landmark"] = ""

    update_data["updated_at"] = datetime.now(
        timezone.utc
    )

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
            "message": (
                "Listing could not be updated."
            )
        }), 404

    # ==========================================================
    # IF DONATION, KEEP DONATION IN SYNC
    # ==========================================================

    if existing_type == "donate":

        donations_collection = get_collection(
            "donations"
        )

        if donations_collection is not None:

            try:

                donations_collection.update_one(

                    {
                        "listing_id": listing_object_id
                    },

                    {
                        "$set": {

                            "surplus_quantity": update_quantity,

                            "unit": update_data.get(
                                "unit",
                                existing_listing.get(
                                    "unit",
                                    ""
                                )
                            ),

                            "food_title": update_data.get(
                                "food_title",
                                existing_listing.get(
                                    "food_title",
                                    ""
                                )
                            ),

                            "category": update_data.get(
                                "category",
                                existing_listing.get(
                                    "category",
                                    ""
                                )
                            ),

                            "food_type": update_data.get(
                                "food_type",
                                existing_listing.get(
                                    "food_type",
                                    ""
                                )
                            ),

                            "description": update_data.get(
                                "description",
                                existing_listing.get(
                                    "description",
                                    ""
                                )
                            ),

                            "preparation_time": update_data.get(
                                "preparation_time",
                                existing_listing.get(
                                    "preparation_time",
                                    ""
                                )
                            ),

                            "image": update_data.get(
                                "image",
                                existing_listing.get(
                                    "image",
                                    ""
                                )
                            ),

                            "pickup_address": (
                                pickup_location[
                                    "address"
                                ]
                            ),

                            "city": (
                                pickup_location[
                                    "city"
                                ]
                            ),

                            "pickup_instructions": str(
                                update_data.get(
                                    "pickup_instructions",
                                    ""
                                )
                            ).strip()[:250],

                            "donation_pickup_start": (
                                update_data[
                                    "pickup_start"
                                ]
                            ),

                            "donation_pickup_end": (
                                update_data[
                                    "pickup_end"
                                ]
                            ),

                            "updated_at": datetime.now(
                                timezone.utc
                            ),
                        }
                    }
                )

            except PyMongoError as error:

                print(
                    "MongoDB donation sync error:",
                    error
                )

    return jsonify({

        "success": True,

        "message": (
            "Listing updated successfully."
        ),

        "listing_id": str(
            listing_object_id
        )

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

    refresh_lifecycle()

    session_user_id = session.get(
        "user_id"
    )

    if not session_user_id:

        return jsonify({
            "success": False,
            "message": (
                "Authentication is required."
            )
        }), 401

    try:

        owner_id = ObjectId(
            session_user_id
        )

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    try:

        listing_object_id = ObjectId(
            listing_id
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    listings_collection = get_collection(
        "food_listings"
    )

    if listings_collection is None:

        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable."
            )
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
            "message": (
                "Unable to update listing."
            )
        }), 500

    if listing is None:

        return jsonify({
            "success": False,
            "message": (
                "Listing not found or you do not "
                "have permission to update it."
            )
        }), 404

    current_status = str(
        listing.get(
            "status",
            "available"
        )
    ).strip().lower()

    if current_status not in {
        "available",
        "paused"
    }:

        return jsonify({
            "success": False,
            "message": (
                "This listing can no longer "
                "be paused or resumed."
            )
        }), 409

    if current_status == "paused":

        new_status = "available"

        message = (
            "Listing resumed successfully."
        )

    else:

        new_status = "paused"

        message = (
            "Listing paused successfully."
        )

    try:

        result = listings_collection.update_one(

            {
                "_id": listing_object_id,

                "owner_id": owner_id
            },

            {
                "$set": {

                    "status": new_status,

                    "updated_at": datetime.now(
                        timezone.utc
                    )
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
            "message": (
                "Listing status could not "
                "be updated."
            )
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

    session_user_id = session.get(
        "user_id"
    )

    if not session_user_id:

        return jsonify({
            "success": False,
            "message": (
                "Authentication is required."
            )
        }), 401

    try:

        owner_id = ObjectId(
            session_user_id
        )

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    try:

        listing_object_id = ObjectId(
            listing_id
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    listings_collection = get_collection(
        "food_listings"
    )

    if listings_collection is None:

        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable."
            )
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
            "message": (
                "Unable to load listing "
                "for duplication."
            )
        }), 500

    if original_listing is None:

        return jsonify({
            "success": False,
            "message": (
                "Listing not found or you do not "
                "have permission to duplicate it."
            )
        }), 404

    timestamp = datetime.now(
        timezone.utc
    )

    duplicate = original_listing.copy()

    duplicate.pop(
        "_id",
        None
    )

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

    duplicate["original_quantity"] = (
        duplicate.get(
            "quantity",
            0
        )
    )

    # A duplicate must never inherit
    # the original donation relationship.
    for field in (
        "surplus_quantity",
        "pickup_window_ended_at",
        "surplus_confirmed_at",
        "donation_id",
    ):

        duplicate.pop(
            field,
            None
        )

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

        "message": (
            "Listing duplicated successfully."
        ),

        "listing_id": str(
            result.inserted_id
        )

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

    session_user_id = session.get(
        "user_id"
    )

    if not session_user_id:

        return jsonify({
            "success": False,
            "message": (
                "Authentication is required."
            )
        }), 401

    try:

        owner_id = ObjectId(
            session_user_id
        )

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    try:

        listing_object_id = ObjectId(
            listing_id
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    listings_collection = get_collection(
        "food_listings"
    )

    if listings_collection is None:

        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable."
            )
        }), 500

    try:

        existing = listings_collection.find_one({

            "_id": listing_object_id,

            "owner_id": owner_id

        })

        if existing and existing.get(
            "donation_id"
        ):

            return jsonify({
                "success": False,
                "message": (
                    "Listings with donation history "
                    "cannot be deleted."
                )
            }), 409

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
                "Listing not found or you do not "
                "have permission to delete it."
            )
        }), 404

    return jsonify({

        "success": True,

        "message": (
            "Listing deleted successfully."
        )

    }), 200