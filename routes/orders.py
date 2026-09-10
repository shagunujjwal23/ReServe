"""API endpoints for food reservation requests."""

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, jsonify, request, session
from pymongo.errors import PyMongoError

from config.database import get_collection
from services.lifecycle import refresh_lifecycle


orders = Blueprint("orders", __name__)


# ==========================================================
# HELPER
# ==========================================================

def get_logged_in_user_id():
    """Return the MongoDB ObjectId of the logged-in user."""

    user_id = session.get("user_id")

    if not user_id:
        return None

    try:
        return ObjectId(user_id)

    except (InvalidId, TypeError):
        return None


# ==========================================================
# PLACE ORDER / CREATE PENDING REQUEST
# POST /api/orders/place
# ==========================================================

@orders.route("/api/orders/place", methods=["POST"])
def place_order():
    """
    Create a pending reservation request.

    IMPORTANT:
    The food listing quantity is NOT reduced here.

    Quantity is reduced only after the donor/provider
    accepts the request.
    """

    refresh_lifecycle()

    # ======================================================
    # CHECK LOGIN
    # ======================================================

    user_id = get_logged_in_user_id()

    if user_id is None:
        return jsonify({
            "success": False,
            "message": "Please log in first."
        }), 401

    # ======================================================
    # REQUEST DATA
    # ======================================================

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "message": "Valid JSON request body is required."
        }), 400

    listing_id = payload.get("listing_id")
    quantity = payload.get("quantity")
    pickup_date = payload.get("pickup_date")
    pickup_time = payload.get("pickup_time")

    instructions = str(
        payload.get("instructions", "")
    ).strip()[:200]

    community_support = payload.get(
        "community_support",
        0
    )

    # ======================================================
    # REQUIRED FIELDS
    # ======================================================

    if not listing_id:
        return jsonify({
            "success": False,
            "message": "Listing ID is required."
        }), 400

    if not pickup_date:
        return jsonify({
            "success": False,
            "message": "Pickup date is required."
        }), 400

    if not pickup_time:
        return jsonify({
            "success": False,
            "message": "Pickup time is required."
        }), 400

    # ======================================================
    # LISTING OBJECT ID
    # ======================================================

    try:
        listing_object_id = ObjectId(listing_id)

    except (InvalidId, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid listing ID."
        }), 400

    # ======================================================
    # QUANTITY
    # ======================================================

    try:
        quantity = int(quantity)

    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Invalid quantity."
        }), 400

    if quantity < 1:
        return jsonify({
            "success": False,
            "message": "Quantity must be at least 1."
        }), 400

    # ======================================================
    # COMMUNITY SUPPORT
    # ======================================================

    try:
        community_support = int(
            community_support or 0
        )

    except (TypeError, ValueError):
        community_support = 0

    if community_support < 0:
        community_support = 0

    if community_support > 500:
        return jsonify({
            "success": False,
            "message": (
                "Community support cannot exceed ₹500."
            )
        }), 400

    # ======================================================
    # DATABASE COLLECTIONS
    # ======================================================

    users_collection = get_collection("users")
    listings_collection = get_collection("food_listings")
    orders_collection = get_collection("orders")

    if (
        users_collection is None
        or listings_collection is None
        or orders_collection is None
    ):
        return jsonify({
            "success": False,
            "message": "Database is currently unavailable."
        }), 503

    # ======================================================
    # GET REQUESTER
    # ======================================================

    try:
        requester = users_collection.find_one({
            "_id": user_id
        })

    except PyMongoError as error:

        print(
            "MongoDB requester lookup error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load user information."
        }), 500

    if requester is None:
        return jsonify({
            "success": False,
            "message": "User account not found."
        }), 404

    # ======================================================
    # GET LISTING
    # ======================================================

    try:

        listing = listings_collection.find_one({
            "_id": listing_object_id,
            "status": "available"
        })

    except PyMongoError as error:

        print(
            "MongoDB listing lookup error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load food listing."
        }), 500

    if listing is None:
        return jsonify({
            "success": False,
            "message": (
                "Food listing not found or is no longer available."
            )
        }), 404

    # ======================================================
    # GET LISTING OWNER
    #
    # listings.py stores the provider as:
    #
    # "owner_id": owner_id
    # ======================================================

    listing_provider_id = listing.get("owner_id")

    if listing_provider_id is None:
        return jsonify({
            "success": False,
            "message": (
                "This food listing does not have "
                "a valid provider."
            )
        }), 400

    # ======================================================
    # NORMALIZE OWNER ID
    # ======================================================

    try:

        listing_provider_id = ObjectId(
            str(listing_provider_id)
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing provider information."
        }), 400

    # ======================================================
    # DO NOT ALLOW PROVIDER TO RESERVE OWN FOOD
    # ======================================================

    if listing_provider_id == user_id:
        return jsonify({
            "success": False,
            "message": (
                "You cannot reserve your own food listing."
            )
        }), 400

    # ======================================================
    # CHECK AVAILABLE QUANTITY
    #
    # IMPORTANT:
    # We ONLY CHECK quantity here.
    #
    # We DO NOT reduce it.
    # ======================================================

    try:
        available_quantity = int(
            listing.get("quantity", 0) or 0
        )

    except (TypeError, ValueError):
        available_quantity = 0

    if quantity > available_quantity:
        return jsonify({
            "success": False,
            "message": (
                f"Only {available_quantity} "
                f"{listing.get('unit', 'units')} "
                "are currently available."
            )
        }), 409

    # ======================================================
    # FOOD INFORMATION
    # ======================================================

    food_name = (
        listing.get("food_title")
        or listing.get("food_name")
        or listing.get("title")
        or "Food Item"
    )

    image = listing.get(
        "image",
        "/static/images/food-placeholder.jpg"
    )

    unit = listing.get(
        "unit",
        "Unit"
    )

    serves = listing.get(
        "serves",
        listing.get(
            "people_served",
            ""
        )
    )

    # ======================================================
    # REQUESTER INFORMATION
    # ======================================================

    requester_name = requester.get(
        "full_name",
        "User"
    )

    requester_type = requester.get(
        "role",
        "individual"
    )

    phone = requester.get(
        "phone",
        ""
    )

    # ======================================================
    # CREATE REQUEST DOCUMENT
    # ======================================================

    timestamp = datetime.now(timezone.utc)

    request_document = {

        # --------------------------------------------------
        # IDENTIFICATION
        # --------------------------------------------------

        "listing_id": listing_object_id,

        "requester_id": user_id,

        "provider_id": listing_provider_id,

        # --------------------------------------------------
        # REQUEST INFORMATION
        # --------------------------------------------------

        "request_id": None,

        "status": "pending",

        "created_at": timestamp,

        "updated_at": timestamp,

        # --------------------------------------------------
        # FOOD INFORMATION
        # --------------------------------------------------

        "food_name": food_name,

        "image": image,

        "quantity": quantity,

        "unit": unit,

        "serves": serves,

        # --------------------------------------------------
        # REQUESTER INFORMATION
        # --------------------------------------------------

        "requester_name": requester_name,

        "requester_type": requester_type,

        "phone": phone,

        # --------------------------------------------------
        # PICKUP
        # --------------------------------------------------

        "pickup_date": str(
            pickup_date
        ).strip(),

        "pickup_time": str(
            pickup_time
        ).strip(),

        # --------------------------------------------------
        # ADDITIONAL INFORMATION
        # --------------------------------------------------

        "instructions": instructions,

        "community_support": community_support,

        "purpose": "Food reservation",

        # --------------------------------------------------
        # DEFAULT REQUEST INFORMATION
        # --------------------------------------------------

        "distance": "Not available",

        "priority": "normal",

        # --------------------------------------------------
        # LISTING LOCATION
        # --------------------------------------------------

        "listing_address": listing.get(
            "address",
            ""
        ),

        "listing_city": listing.get(
            "city",
            ""
        ),
    }

    # ======================================================
    # SAVE REQUEST
    # ======================================================

    try:

        result = orders_collection.insert_one(
            request_document
        )

    except PyMongoError as error:

        print(
            "MongoDB request creation error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to create the reservation request."
            )
        }), 500

    # ======================================================
    # GENERATE REQUEST ID
    # ======================================================

    request_id = (
        f"REQ-{str(result.inserted_id)[-8:].upper()}"
    )

    try:

        orders_collection.update_one(
            {
                "_id": result.inserted_id
            },
            {
                "$set": {
                    "request_id": request_id
                }
            }
        )

    except PyMongoError as error:

        print(
            "MongoDB request ID update error:",
            error
        )

        # The request was already created, so don't
        # report a complete failure to the user.
        # The GET endpoint has a fallback request ID.

    # ======================================================
    # SUCCESS
    # ======================================================

    return jsonify({
        "success": True,
        "message": (
            "Reservation request sent successfully. "
            "Please wait for the provider to accept it."
        ),
        "request_id": request_id,
        "order_id": str(result.inserted_id),
        "status": "pending"
    }), 201


# ==========================================================
# GET REQUESTS FOR CURRENT DONOR / PROVIDER
# GET /api/requests
# ==========================================================

@orders.route("/api/requests", methods=["GET"])
def get_requests():
    """Return reservation requests for the logged-in provider."""

    provider_id = get_logged_in_user_id()

    if provider_id is None:
        return jsonify({
            "success": False,
            "message": "Please log in first."
        }), 401

    orders_collection = get_collection("orders")

    if orders_collection is None:
        return jsonify({
            "success": False,
            "message": "Database is currently unavailable."
        }), 503

    try:

        requests_cursor = orders_collection.find({
            "provider_id": provider_id
        }).sort(
            "created_at",
            -1
        )

        requests_list = []

        for item in requests_cursor:

            created_at = item.get(
                "created_at"
            )

            requests_list.append({

                "_id": str(
                    item["_id"]
                ),

                "request_id": item.get(
                    "request_id",
                    f"REQ-{str(item['_id'])[-8:].upper()}"
                ),

                "status": item.get(
                    "status",
                    "pending"
                ),

                # --------------------------------------------------
                # FOOD
                # --------------------------------------------------

                "food_name": item.get(
                    "food_name",
                    "Food Item"
                ),

                "image": item.get(
                    "image",
                    "/static/images/food-placeholder.jpg"
                ),

                "quantity": item.get(
                    "quantity",
                    0
                ),

                "unit": item.get(
                    "unit",
                    "Unit"
                ),

                "serves": item.get(
                    "serves",
                    "-"
                ),

                # --------------------------------------------------
                # REQUESTER
                # --------------------------------------------------

                "requester_name": item.get(
                    "requester_name",
                    "User"
                ),

                "requester_type": item.get(
                    "requester_type",
                    "individual"
                ),

                "phone": item.get(
                    "phone",
                    ""
                ),

                # --------------------------------------------------
                # PICKUP
                # --------------------------------------------------

                "pickup_date": item.get(
                    "pickup_date",
                    ""
                ),

                "pickup_time": item.get(
                    "pickup_time",
                    ""
                ),

                # --------------------------------------------------
                # ADDITIONAL
                # --------------------------------------------------

                "instructions": item.get(
                    "instructions",
                    ""
                ),

                "community_support": item.get(
                    "community_support",
                    0
                ),

                "purpose": item.get(
                    "purpose",
                    "Food reservation"
                ),

                "distance": item.get(
                    "distance",
                    "Not available"
                ),

                "priority": item.get(
                    "priority",
                    "normal"
                ),

                # --------------------------------------------------
                # LOCATION
                # --------------------------------------------------

                "listing_address": item.get(
                    "listing_address",
                    ""
                ),

                "listing_city": item.get(
                    "listing_city",
                    ""
                ),

                # --------------------------------------------------
                # DATE
                # --------------------------------------------------

                "created_at": (
                    created_at.isoformat()
                    if created_at
                    else None
                ),
            })

        return jsonify({
            "success": True,
            "requests": requests_list
        }), 200

    except PyMongoError as error:

        print(
            "MongoDB requests error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load requests."
        }), 500


# ==========================================================
# ACCEPT REQUEST
# POST /api/requests/<request_id>/accept
# ==========================================================

@orders.route(
    "/api/requests/<request_id>/accept",
    methods=["POST"]
)
def accept_request(request_id):
    """
    Provider accepts a pending reservation request.

    Quantity is reduced ONLY here.
    """

    refresh_lifecycle()

    provider_id = get_logged_in_user_id()

    if provider_id is None:
        return jsonify({
            "success": False,
            "message": "Please log in first."
        }), 401

    # ======================================================
    # REQUEST ID
    # ======================================================

    try:

        order_id = ObjectId(
            request_id
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid request ID."
        }), 400

    # ======================================================
    # COLLECTIONS
    # ======================================================

    orders_collection = get_collection("orders")
    listings_collection = get_collection("food_listings")

    if (
        orders_collection is None
        or listings_collection is None
    ):
        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable."
        }), 503

    # ======================================================
    # GET PENDING REQUEST
    # ======================================================

    try:

        order = orders_collection.find_one({
            "_id": order_id,
            "status": "pending"
        })

    except PyMongoError as error:

        print(
            "MongoDB accept request lookup error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load request."
        }), 500

    if order is None:
        return jsonify({
            "success": False,
            "message": (
                "Request not found or it has already "
                "been processed."
            )
        }), 404

    # ======================================================
    # GET LISTING
    # ======================================================

    listing_id = order.get(
        "listing_id"
    )

    if not listing_id:
        return jsonify({
            "success": False,
            "message": "Listing information is missing."
        }), 400

    # Make sure listing_id is an ObjectId.
    try:

        listing_id = ObjectId(
            str(listing_id)
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing information."
        }), 400

    try:

        listing = listings_collection.find_one({
            "_id": listing_id
        })

    except PyMongoError as error:

        print(
            "MongoDB listing lookup error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load food listing."
        }), 500

    if listing is None:
        return jsonify({
            "success": False,
            "message": "Food listing no longer exists."
        }), 404

    # ======================================================
    # VERIFY PROVIDER OWNS LISTING
    #
    # listings.py uses:
    #
    # "owner_id": owner_id
    # ======================================================

    listing_owner_id = listing.get(
        "owner_id"
    )

    try:

        listing_owner_id = ObjectId(
            str(listing_owner_id)
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Listing owner information is invalid."
        }), 400

    if listing_owner_id != provider_id:
        return jsonify({
            "success": False,
            "message": (
                "You are not authorized to accept "
                "this request."
            )
        }), 403

    # ======================================================
    # REQUEST QUANTITY
    # ======================================================

    try:

        requested_quantity = int(
            order.get("quantity", 0)
        )

    except (TypeError, ValueError):

        requested_quantity = 0

    if requested_quantity < 1:
        return jsonify({
            "success": False,
            "message": "Invalid requested quantity."
        }), 400

    # ======================================================
    # ATOMICALLY REDUCE LISTING QUANTITY
    #
    # This prevents accepting a request when the required
    # quantity is no longer available.
    # ======================================================

    try:

        updated_listing = (
            listings_collection.find_one_and_update(

                {
                    "_id": listing_id,

                    "owner_id": provider_id,

                    "status": "available",

                    "quantity": {
                        "$gte": requested_quantity
                    }
                },

                {
                    "$inc": {
                        "quantity": -requested_quantity,

                        "reservations": requested_quantity
                    },

                    "$set": {
                        "updated_at": (
                            datetime.now(
                                timezone.utc
                            )
                        )
                    }
                },

                return_document=True
            )
        )

    except PyMongoError as error:

        print(
            "MongoDB accept quantity update error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to accept the request."
            )
        }), 500

    # ======================================================
    # QUANTITY NO LONGER AVAILABLE
    # ======================================================

    if updated_listing is None:

        return jsonify({
            "success": False,
            "message": (
                "This request cannot be accepted because "
                "the requested quantity is no longer available."
            )
        }), 409

    # ======================================================
    # UPDATE REQUEST STATUS
    # ======================================================

    now = datetime.now(
        timezone.utc
    )

    try:

        result = orders_collection.update_one(
            {
                "_id": order_id,

                "status": "pending",

                "provider_id": provider_id
            },

            {
                "$set": {
                    "status": "accepted",

                    "accepted_at": now,

                    "updated_at": now
                }
            }
        )

    except PyMongoError as error:

        print(
            "MongoDB accept request update error:",
            error
        )

        # --------------------------------------------------
        # ROLLBACK LISTING QUANTITY
        # --------------------------------------------------

        try:

            listings_collection.update_one(
                {
                    "_id": listing_id,

                    "owner_id": provider_id
                },

                {
                    "$inc": {
                        "quantity": requested_quantity,

                        "reservations": -requested_quantity
                    },

                    "$set": {
                        "updated_at": (
                            datetime.now(
                                timezone.utc
                            )
                        )
                    }
                }
            )

        except PyMongoError as rollback_error:

            print(
                "MongoDB quantity rollback error:",
                rollback_error
            )

        return jsonify({
            "success": False,
            "message": (
                "Unable to accept the request."
            )
        }), 500

    # ======================================================
    # REQUEST WAS ALREADY PROCESSED
    # ======================================================

    if result.modified_count == 0:

        # Roll back quantity because the request was
        # no longer pending.

        try:

            listings_collection.update_one(
                {
                    "_id": listing_id,

                    "owner_id": provider_id
                },

                {
                    "$inc": {
                        "quantity": requested_quantity,

                        "reservations": -requested_quantity
                    },

                    "$set": {
                        "updated_at": (
                            datetime.now(
                                timezone.utc
                            )
                        )
                    }
                }
            )

        except PyMongoError as rollback_error:

            print(
                "MongoDB quantity rollback error:",
                rollback_error
            )

        return jsonify({
            "success": False,
            "message": (
                "This request has already been processed."
            )
        }), 409

    # ======================================================
    # SUCCESS
    # ======================================================

    return jsonify({
        "success": True,
        "message": "Request accepted successfully.",
        "status": "accepted",
        "request_id": str(order_id),
        "remaining_quantity": updated_listing.get(
            "quantity",
            0
        )
    }), 200


# ==========================================================
# REJECT REQUEST
# POST /api/requests/<request_id>/reject
# ==========================================================

@orders.route(
    "/api/requests/<request_id>/reject",
    methods=["POST"]
)
def reject_request(request_id):
    """
    Provider rejects a pending reservation request.

    Listing quantity is NOT changed.
    """

    provider_id = get_logged_in_user_id()

    if provider_id is None:
        return jsonify({
            "success": False,
            "message": "Please log in first."
        }), 401

    # ======================================================
    # REQUEST ID
    # ======================================================

    try:

        order_id = ObjectId(
            request_id
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid request ID."
        }), 400

    # ======================================================
    # COLLECTIONS
    # ======================================================

    orders_collection = get_collection("orders")
    listings_collection = get_collection("food_listings")

    if (
        orders_collection is None
        or listings_collection is None
    ):
        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable."
        }), 503

    # ======================================================
    # GET PENDING REQUEST
    # ======================================================

    try:

        order = orders_collection.find_one({
            "_id": order_id,
            "status": "pending"
        })

    except PyMongoError as error:

        print(
            "MongoDB reject request lookup error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load request."
        }), 500

    if order is None:
        return jsonify({
            "success": False,
            "message": (
                "Request not found or it has already "
                "been processed."
            )
        }), 404

    # ======================================================
    # GET LISTING
    # ======================================================

    listing_id = order.get(
        "listing_id"
    )

    if not listing_id:
        return jsonify({
            "success": False,
            "message": "Listing information is missing."
        }), 400

    try:

        listing_id = ObjectId(
            str(listing_id)
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing information."
        }), 400

    try:

        listing = listings_collection.find_one({
            "_id": listing_id
        })

    except PyMongoError as error:

        print(
            "MongoDB reject listing lookup error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load food listing."
        }), 500

    if listing is None:
        return jsonify({
            "success": False,
            "message": "Food listing no longer exists."
        }), 404

    # ======================================================
    # VERIFY PROVIDER OWNS LISTING
    # ======================================================

    listing_owner_id = listing.get(
        "owner_id"
    )

    try:

        listing_owner_id = ObjectId(
            str(listing_owner_id)
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Listing owner information is invalid."
        }), 400

    if listing_owner_id != provider_id:
        return jsonify({
            "success": False,
            "message": (
                "You are not authorized to reject "
                "this request."
            )
        }), 403

    # ======================================================
    # REJECT REQUEST
    # ======================================================

    now = datetime.now(
        timezone.utc
    )

    try:

        result = orders_collection.update_one(
            {
                "_id": order_id,

                "provider_id": provider_id,

                "status": "pending"
            },

            {
                "$set": {
                    "status": "rejected",

                    "rejected_at": now,

                    "updated_at": now
                }
            }
        )

    except PyMongoError as error:

        print(
            "MongoDB reject request update error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to reject the request."
            )
        }), 500

    if result.modified_count == 0:
        return jsonify({
            "success": False,
            "message": (
                "This request has already been processed."
            )
        }), 409

    # ======================================================
    # SUCCESS
    # ======================================================

    return jsonify({
        "success": True,
        "message": "Request rejected successfully.",
        "status": "rejected",
        "request_id": str(order_id)
    }), 200
