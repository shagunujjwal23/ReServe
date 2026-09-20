"""API endpoints for food reservation requests."""

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, jsonify, request, session
from pymongo import ReturnDocument
from pymongo.errors import PyMongoError

from config.database import get_collection
from services.lifecycle import refresh_lifecycle


orders = Blueprint("orders", __name__)

# Reservation pricing rules used by both the frontend and backend.
PLATFORM_FEE_RATE = 0.05
MAX_PLATFORM_FEE = 20.0


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
    The food listing quantity is reserved immediately when
    the customer places the reservation.

    The quantity is restored if the reservation is rejected
    or cancelled while pending.
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
    # VALIDATE PICKUP DATE
    # ======================================================

    pickup_date_text = str(
        pickup_date
    ).strip()

    try:
        selected_pickup_date = datetime.strptime(
            pickup_date_text,
            "%Y-%m-%d"
        ).date()

    except ValueError:
        return jsonify({
            "success": False,
            "message": "Invalid pickup date."
        }), 400

    # ======================================================
    # GET LISTING PICKUP WINDOW
    # ======================================================

    pickup_start_value = listing.get(
        "pickup_start"
    )

    pickup_end_value = listing.get(
        "pickup_end"
    )

    if (
        not pickup_start_value
        or not pickup_end_value
    ):
        return jsonify({
            "success": False,
            "message": "Pickup schedule is unavailable."
        }), 400

    # ======================================================
    # NORMALIZE PICKUP DATETIME
    # ======================================================

    def normalize_pickup_datetime(value):

        if isinstance(value, datetime):
            return value

        try:
            return datetime.fromisoformat(
                str(value).replace(
                    "Z",
                    "+00:00"
                )
            )

        except (ValueError, TypeError):
            return None

    pickup_start_datetime = normalize_pickup_datetime(
        pickup_start_value
    )

    pickup_end_datetime = normalize_pickup_datetime(
        pickup_end_value
    )

    if (
        pickup_start_datetime is None
        or pickup_end_datetime is None
    ):
        return jsonify({
            "success": False,
            "message": (
                "Invalid pickup schedule for this listing."
            )
        }), 400

    if pickup_end_datetime <= pickup_start_datetime:
        return jsonify({
            "success": False,
            "message": (
                "Invalid pickup time window for this listing."
            )
        }), 400

    # ======================================================
    # CHECK DATE IS WITHIN LISTING WINDOW
    # ======================================================

    pickup_start_date = (
        pickup_start_datetime.date()
    )

    pickup_end_date = (
        pickup_end_datetime.date()
    )

    if (
        selected_pickup_date < pickup_start_date
        or selected_pickup_date > pickup_end_date
    ):
        return jsonify({
            "success": False,
            "message": (
                "The selected pickup date is not "
                "available for this listing."
            )
        }), 400

    # ======================================================
    # PREVENT PAST PICKUP DATE
    # ======================================================

    today = datetime.now(
        timezone.utc
    ).date()

    if selected_pickup_date < today:
        return jsonify({
            "success": False,
            "message": (
                "Past pickup dates cannot be selected."
            )
        }), 400

    # ======================================================
    # GET LISTING OWNER
    #
    # listings.py stores the provider as:
    #
    # "owner_id": owner_id
    # ======================================================

    listing_provider_id = listing.get(
        "owner_id"
    )

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
            "message": (
                "Invalid listing provider information."
            )
        }), 400

    # ======================================================
    # GET PROVIDER INFORMATION
    # ======================================================

    try:

        provider = users_collection.find_one({
            "_id": listing_provider_id
        })

    except PyMongoError as error:

        print(
            "MongoDB provider lookup error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load food provider information."
            )
        }), 500

    if provider is None:
        return jsonify({
            "success": False,
            "message": (
                "Food provider account not found."
            )
        }), 404

    provider_name = (
        provider.get("restaurant_name")
        or provider.get("business_name")
        or provider.get("organization_name")
        or provider.get("name")
        or provider.get("fullName")
        or provider.get("full_name")
        or provider.get("username")
        or "Food Provider"
    )

    provider_verified = bool(
        provider.get(
            "verified",
            provider.get(
                "is_verified",
                True
            )
        )
    )

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
    # RESERVE AVAILABLE QUANTITY AT THE TIME OF BOOKING
    #
    # MongoDB performs this atomically so two customers
    # cannot reserve the same remaining quantity.
    # ======================================================

    try:

        reserved_listing = listings_collection.find_one_and_update(
            {
                "_id": listing_object_id,
                "owner_id": listing_provider_id,
                "status": "available",
                "quantity": {
                    "$gte": quantity
                }
            },
            {
                "$inc": {
                    "quantity": -quantity,
                    "reservations": quantity
                },
                "$set": {
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            return_document=ReturnDocument.AFTER
        )

    except PyMongoError as error:

        print(
            "MongoDB reservation quantity update error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to reserve the selected quantity."
        }), 500

    if reserved_listing is None:

        try:
            latest_listing = listings_collection.find_one({
                "_id": listing_object_id
            })

            available_quantity = int(
                latest_listing.get("quantity", 0)
                if latest_listing
                else 0
            )

        except (TypeError, ValueError, PyMongoError):

            available_quantity = 0

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

    requester_name = (
        requester.get("full_name")
        or requester.get("fullName")
        or requester.get("name")
        or requester.get("username")
        or "User"
    )

    requester_type = requester.get(
        "role",
        "individual"
    )

    phone = requester.get(
        "phone",
        ""
    )

    email = requester.get(
        "email",
        ""
    )

    # ======================================================
    # CALCULATE RESERVATION PRICE
    # ======================================================

    try:

        unit_price = float(
            listing.get(
                "discounted_price",
                0
            ) or 0
        )

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "message": (
                "Invalid food price for this listing."
            )
        }), 500

    if unit_price < 0:
        return jsonify({
            "success": False,
            "message": (
                "Invalid food price for this listing."
            )
        }), 500

    amount = (
        unit_price * quantity
    )

    platform_fee = min(
        amount * PLATFORM_FEE_RATE,
        MAX_PLATFORM_FEE
    )

    total_amount = (
        amount
        + platform_fee
        + community_support
    )

    # ======================================================
    # CREATE REQUEST DOCUMENT
    # ======================================================

    timestamp = datetime.now(
        timezone.utc
    )

    request_document = {

        # --------------------------------------------------
        # IDENTIFICATION
        # --------------------------------------------------

        "listing_id": listing_object_id,

        "requester_id": user_id,

        "provider_id": listing_provider_id,

        "provider_name": provider_name,

        "provider_verified": provider_verified,

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

        "category": listing.get(
            "category",
            ""
        ),

        "food_type": listing.get(
            "food_type",
            ""
        ),

        "quantity": quantity,

        "unit": unit,

        "serves": serves,

        # --------------------------------------------------
        # PRICE
        # --------------------------------------------------

        "unit_price": unit_price,

        # Food subtotal before platform fee
        # and community support.
        "amount": amount,

        "platform_fee": platform_fee,

        "community_support": community_support,

        "total_amount": total_amount,

        # --------------------------------------------------
        # REQUESTER INFORMATION
        # --------------------------------------------------

        "requester_name": requester_name,

        "requester_type": requester_type,

        "phone": phone,

        "email": email,

        # --------------------------------------------------
        # PICKUP
        # --------------------------------------------------

        "pickup_date": pickup_date_text,

        "pickup_time": str(
            pickup_time
        ).strip(),

        # --------------------------------------------------
        # ADDITIONAL INFORMATION
        # --------------------------------------------------

        "instructions": instructions,

        "purpose": "Food reservation",

        # --------------------------------------------------
        # DEFAULT REQUEST INFORMATION
        # --------------------------------------------------

        "distance": "Not available",

        "priority": "normal",

        # --------------------------------------------------
        # LISTING LOCATION
        # --------------------------------------------------

        "listing_area": listing.get(
            "area",
            ""
        ),

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

        # Quantity was already reserved above. Restore it if
        # the reservation document cannot be created.
        try:
            listings_collection.update_one(
                {
                    "_id": listing_object_id,
                    "owner_id": listing_provider_id
                },
                {
                    "$inc": {
                        "quantity": quantity,
                        "reservations": -quantity
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        except PyMongoError as rollback_error:
            print(
                "MongoDB reservation quantity rollback error:",
                rollback_error
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

        # Request was already created.
        # GET endpoint has a fallback request ID.

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
        "order_id": str(
            result.inserted_id
        ),
        "status": "pending"
    }), 201


# ==========================================================
# GET REQUESTS FOR CURRENT PROVIDER
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
    users_collection = get_collection("users")

    if (
        orders_collection is None
        or users_collection is None
    ):
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

                "category": item.get(
                    "category",
                    ""
                ),

                "food_type": item.get(
                    "food_type",
                    ""
                ),

                "quantity": item.get(
                    "quantity",
                    0
                ),

                "unit": item.get(
                    "unit",
                    "Unit"
                ),

                "unit_price": item.get(
                    "unit_price",
                    0
                ),

                "amount": item.get(
                    "amount",
                    0
                ),

                "platform_fee": item.get(
                    "platform_fee",
                    0
                ),

                "community_support": item.get(
                    "community_support",
                    0
                ),

                "total_amount": item.get(
                    "total_amount",
                    item.get("amount", 0)
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

                "email": item.get(
                    "email",
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

                "listing_area": item.get(
                    "listing_area",
                    ""
                ),

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
                    (
                        created_at.replace(
                            tzinfo=timezone.utc
                        )
                        if created_at.tzinfo is None
                        else created_at
                    ).isoformat()
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

    The quantity was already reserved when the customer
    placed the reservation, so acceptance does not change
    the listing quantity.
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
            "message": (
                "Listing owner information is invalid."
            )
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
            order.get(
                "quantity",
                0
            )
        )

    except (TypeError, ValueError):

        requested_quantity = 0

    if requested_quantity < 1:
        return jsonify({
            "success": False,
            "message": "Invalid requested quantity."
        }), 400

    # ======================================================
    # QUANTITY WAS ALREADY RESERVED
    #
    # The customer reduced the listing quantity when placing
    # the reservation. Accepting the request must NOT reduce
    # the quantity again.
    # ======================================================

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

    try:
        remaining_listing = listings_collection.find_one(
            {"_id": listing_id},
            {"quantity": 1}
        )
        remaining_quantity = (
            remaining_listing.get("quantity", 0)
            if remaining_listing
            else 0
        )
    except PyMongoError:
        remaining_quantity = 0

    return jsonify({
        "success": True,
        "message": "Request accepted successfully.",
        "status": "accepted",
        "request_id": str(order_id),
        "remaining_quantity": remaining_quantity
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

    The customer's reserved quantity is restored to the listing.
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
            "message": (
                "Listing owner information is invalid."
            )
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
    # RESTORE RESERVED QUANTITY
    # ======================================================

    try:

        listing_result = listings_collection.update_one(
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
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )

    except PyMongoError as error:

        print(
            "MongoDB reject quantity restoration error:",
            error
        )

        # Roll the request back to pending because the food
        # quantity could not be restored safely.
        try:
            orders_collection.update_one(
                {
                    "_id": order_id,
                    "provider_id": provider_id,
                    "status": "rejected"
                },
                {
                    "$set": {
                        "status": "pending",
                        "updated_at": datetime.now(timezone.utc)
                    },
                    "$unset": {
                        "rejected_at": ""
                    }
                }
            )
        except PyMongoError as rollback_error:
            print(
                "MongoDB reject status rollback error:",
                rollback_error
            )

        return jsonify({
            "success": False,
            "message": (
                "Unable to restore the reserved food quantity."
            )
        }), 500

    if listing_result.modified_count == 0:

        try:
            orders_collection.update_one(
                {
                    "_id": order_id,
                    "provider_id": provider_id,
                    "status": "rejected"
                },
                {
                    "$set": {
                        "status": "pending",
                        "updated_at": datetime.now(timezone.utc)
                    },
                    "$unset": {
                        "rejected_at": ""
                    }
                }
            )
        except PyMongoError as rollback_error:
            print(
                "MongoDB reject status rollback error:",
                rollback_error
            )

        return jsonify({
            "success": False,
            "message": (
                "Unable to restore the reserved food quantity."
            )
        }), 500

    # ======================================================
    # SUCCESS
    # ======================================================

    return jsonify({
        "success": True,
        "message": "Request rejected successfully.",
        "status": "rejected",
        "request_id": str(order_id)
    }), 200


# ==========================================================
# GET RESERVATIONS FOR CURRENT CUSTOMER
# GET /api/user/reservations
# ==========================================================

@orders.route(
    "/api/user/reservations",
    methods=["GET"]
)
def get_user_reservations():
    """
    Return reservation requests belonging only to
    the currently logged-in customer.
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
    # DATABASE
    # ======================================================

    orders_collection = get_collection("orders")
    users_collection = get_collection("users")

    if (
        orders_collection is None
        or users_collection is None
    ):
        return jsonify({
            "success": False,
            "message": "Database is currently unavailable."
        }), 503

    # ======================================================
    # GET CUSTOMER RESERVATIONS
    # ======================================================

    try:

        reservations_cursor = orders_collection.find({
            "requester_id": user_id
        }).sort(
            "created_at",
            -1
        )

        reservations = []

        for item in reservations_cursor:

            created_at = item.get(
                "created_at"
            )

            updated_at = item.get(
                "updated_at"
            )

            # --------------------------------------------------
            # REQUEST ID
            # --------------------------------------------------

            request_id = item.get(
                "request_id"
            )

            if not request_id:
                request_id = (
                    f"REQ-{str(item['_id'])[-8:].upper()}"
                )

            # --------------------------------------------------
            # FOOD INFORMATION
            # --------------------------------------------------

            food_name = item.get(
                "food_name",
                "Food Item"
            )

            image = item.get(
                "image",
                "/static/images/food-placeholder.jpg"
            )

            category = item.get(
                "category",
                ""
            )

            food_type = item.get(
                "food_type",
                ""
            )

            quantity = item.get(
                "quantity",
                0
            )

            unit = item.get(
                "unit",
                "Unit"
            )

            # --------------------------------------------------
            # PRICE
            # --------------------------------------------------

            unit_price = item.get(
                "unit_price",
                0
            )

            amount = item.get(
                "amount",
                0
            )

            community_support = item.get(
                "community_support",
                0
            )

            platform_fee = item.get(
                "platform_fee",
                0
            )

            try:
                platform_fee = float(
                    platform_fee or 0
                )

            except (TypeError, ValueError):
                platform_fee = 0

            try:
                community_support = float(
                    community_support or 0
                )

            except (TypeError, ValueError):
                community_support = 0

            try:
                amount = float(
                    amount or 0
                )

            except (TypeError, ValueError):
                amount = 0

            # --------------------------------------------------
            # PROVIDER INFORMATION
            #
            # IMPORTANT:
            # Existing reservations may not contain
            # provider_name because they were created
            # before provider_name was added.
            #
            # Therefore we fetch the current provider
            # profile using provider_id.
            # --------------------------------------------------

            provider_id = item.get(
                "provider_id"
            )

            provider_name = item.get(
                "provider_name",
                ""
            )

            provider_verified = item.get(
                "provider_verified",
                False
            )

            if provider_id:

                try:

                    provider_object_id = ObjectId(
                        str(provider_id)
                    )

                    provider = users_collection.find_one({
                        "_id": provider_object_id
                    })

                    if provider:

                        provider_name = (
                            provider.get("restaurant_name")
                            or provider.get("business_name")
                            or provider.get("organization_name")
                            or provider.get("name")
                            or provider.get("fullName")
                            or provider.get("full_name")
                            or provider.get("username")
                            or provider_name
                            or "Food Provider"
                        )

                        provider_verified = bool(
                            provider.get(
                                "verified",
                                provider.get(
                                    "is_verified",
                                    True
                                )
                            )
                        )

                except (
                    InvalidId,
                    TypeError,
                    PyMongoError
                ) as error:

                    print(
                        "MongoDB provider lookup error:",
                        error
                    )

            # --------------------------------------------------
            # PICKUP INFORMATION
            # --------------------------------------------------

            pickup_date = item.get(
                "pickup_date",
                ""
            )

            pickup_time = item.get(
                "pickup_time",
                ""
            )

            instructions = item.get(
                "instructions",
                ""
            )

            # --------------------------------------------------
            # LOCATION
            # --------------------------------------------------

            listing_area = item.get(
                "listing_area",
                ""
            )

            listing_address = item.get(
                "listing_address",
                ""
            )

            listing_city = item.get(
                "listing_city",
                ""
            )

            # --------------------------------------------------
            # TOTAL AMOUNT
            # --------------------------------------------------

            stored_total = item.get(
                "total_amount"
            )

            if stored_total is not None:

                try:
                    total_amount = float(
                        stored_total
                    )

                except (TypeError, ValueError):
                    total_amount = (
                        amount
                        + platform_fee
                        + community_support
                    )

            else:

                total_amount = (
                    amount
                    + platform_fee
                    + community_support
                )

            # --------------------------------------------------
            # BUILD RESERVATION
            # --------------------------------------------------

            reservations.append({

                "_id": str(
                    item["_id"]
                ),

                "request_id": request_id,

                "listing_id": (
                    str(item["listing_id"])
                    if item.get("listing_id")
                    else ""
                ),

                # --------------------------------------------------
                # PROVIDER
                # --------------------------------------------------

                "provider_id": (
                    str(provider_id)
                    if provider_id
                    else ""
                ),

                "provider_name": provider_name,

                "provider_verified": provider_verified,

                # --------------------------------------------------
                # FOOD
                # --------------------------------------------------

                "food_name": food_name,

                "image": image,

                "category": category,

                "food_type": food_type,

                "quantity": quantity,

                "unit": unit,

                # --------------------------------------------------
                # PRICE
                # --------------------------------------------------

                "unit_price": unit_price,

                "amount": amount,

                "platform_fee": platform_fee,

                "community_support": community_support,

                "total_amount": total_amount,

                # --------------------------------------------------
                # STATUS
                # --------------------------------------------------

                "status": item.get(
                    "status",
                    "pending"
                ),

                # --------------------------------------------------
                # PICKUP
                # --------------------------------------------------

                "pickup_date": pickup_date,

                "pickup_time": pickup_time,

                "instructions": instructions,

                # --------------------------------------------------
                # LOCATION
                # --------------------------------------------------

                "listing_area": listing_area,

                "listing_address": listing_address,

                "listing_city": listing_city,

                # --------------------------------------------------
                # DATE
                # --------------------------------------------------

                "created_at": (
                    (
                        created_at.replace(
                            tzinfo=timezone.utc
                        )
                        if created_at.tzinfo is None
                        else created_at
                    ).isoformat()
                    if created_at
                    else None
                ),

                "updated_at": (
                    (
                        updated_at.replace(
                            tzinfo=timezone.utc
                        )
                        if updated_at.tzinfo is None
                        else updated_at
                    ).isoformat()
                    if updated_at
                    else None
                ),
            })

        # ==================================================
        # SUCCESS
        # ==================================================

        return jsonify({
            "success": True,
            "reservations": reservations,
            "count": len(reservations)
        }), 200

    except PyMongoError as error:

        print(
            "MongoDB user reservations error:",
            error
        )

        return jsonify({
            "success": False,
            "message": (
                "Unable to load your reservations."
            )
        }), 500


# ==========================================================
# CANCEL RESERVATION
# POST /api/user/reservations/<reservation_id>/cancel
# ==========================================================

@orders.route(
    "/api/user/reservations/<reservation_id>/cancel",
    methods=["POST"]
)
def cancel_user_reservation(reservation_id):
    """
    Allow the logged-in customer to cancel their own
    reservation.

    Pending:
        Restore the reserved quantity back to the listing.

    Accepted:
        Restore the reserved quantity back to the listing.

    Rejected / Cancelled / Completed:
        Cannot be cancelled.
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
    # CONVERT RESERVATION ID
    # ======================================================

    try:

        order_id = ObjectId(
            reservation_id
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid reservation ID."
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
            "message": "Database is currently unavailable."
        }), 503

    # ======================================================
    # GET CUSTOMER'S RESERVATION
    #
    # IMPORTANT:
    # requester_id makes sure a customer can only cancel
    # their own reservation.
    # ======================================================

    try:

        order = orders_collection.find_one({
            "_id": order_id,
            "requester_id": user_id
        })

    except PyMongoError as error:

        print(
            "MongoDB reservation lookup error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load reservation."
        }), 500

    if order is None:

        return jsonify({
            "success": False,
            "message": "Reservation not found."
        }), 404

    # ======================================================
    # CURRENT STATUS
    # ======================================================

    current_status = str(
        order.get(
            "status",
            ""
        )
    ).strip().lower()

    # ======================================================
    # CHECK WHETHER CANCELLATION IS ALLOWED
    # ======================================================

    if current_status not in (
        "pending",
        "accepted"
    ):

        if current_status in (
            "cancelled",
            "canceled"
        ):
            message = (
                "This reservation has already been cancelled."
            )

        elif current_status == "rejected":
            message = (
                "This reservation was rejected by the provider."
            )

        elif current_status == "completed":
            message = (
                "Completed reservations cannot be cancelled."
            )

        else:
            message = (
                "This reservation cannot be cancelled."
            )

        return jsonify({
            "success": False,
            "message": message
        }), 409

    # ======================================================
    # LISTING INFORMATION
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

        listing_object_id = ObjectId(
            str(listing_id)
        )

    except (InvalidId, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid listing information."
        }), 400

    # ======================================================
    # REQUESTED QUANTITY
    # ======================================================

    try:

        requested_quantity = int(
            order.get(
                "quantity",
                0
            )
        )

    except (TypeError, ValueError):

        requested_quantity = 0

    if requested_quantity < 1:

        return jsonify({
            "success": False,
            "message": "Invalid reservation quantity."
        }), 400

    # ======================================================
    # PENDING RESERVATION
    #
    # The quantity was already reduced when the reservation
    # was created, so cancellation must restore it.
    # ======================================================

    if current_status == "pending":

        now = datetime.now(
            timezone.utc
        )

        # First change pending -> cancelled so the same
        # reservation cannot restore quantity twice.
        try:

            result = orders_collection.update_one(
                {
                    "_id": order_id,
                    "requester_id": user_id,
                    "status": "pending"
                },
                {
                    "$set": {
                        "status": "cancelled",
                        "cancelled_at": now,
                        "updated_at": now
                    }
                }
            )

        except PyMongoError as error:

            print(
                "MongoDB pending cancellation error:",
                error
            )

            return jsonify({
                "success": False,
                "message": (
                    "Unable to cancel the reservation."
                )
            }), 500

        if result.modified_count == 0:

            return jsonify({
                "success": False,
                "message": (
                    "This reservation has already been processed."
                )
            }), 409

        # Restore the quantity reserved by this pending request.
        try:

            listing_result = listings_collection.update_one(
                {
                    "_id": listing_object_id
                },
                {
                    "$inc": {
                        "quantity": requested_quantity,
                        "reservations": -requested_quantity
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )

        except PyMongoError as error:

            print(
                "MongoDB pending cancellation quantity "
                "restoration error:",
                error
            )

            # Roll the reservation back to pending because the
            # quantity could not be restored safely.
            try:
                orders_collection.update_one(
                    {
                        "_id": order_id,
                        "requester_id": user_id,
                        "status": "cancelled"
                    },
                    {
                        "$set": {
                            "status": "pending",
                            "updated_at": datetime.now(timezone.utc)
                        },
                        "$unset": {
                            "cancelled_at": ""
                        }
                    }
                )
            except PyMongoError as rollback_error:
                print(
                    "MongoDB pending cancellation rollback error:",
                    rollback_error
                )

            return jsonify({
                "success": False,
                "message": (
                    "Unable to restore the reserved food quantity."
                )
            }), 500

        if listing_result.modified_count == 0:

            try:
                orders_collection.update_one(
                    {
                        "_id": order_id,
                        "requester_id": user_id,
                        "status": "cancelled"
                    },
                    {
                        "$set": {
                            "status": "pending",
                            "updated_at": datetime.now(timezone.utc)
                        },
                        "$unset": {
                            "cancelled_at": ""
                        }
                    }
                )
            except PyMongoError as rollback_error:
                print(
                    "MongoDB pending cancellation status rollback error:",
                    rollback_error
                )

            return jsonify({
                "success": False,
                "message": (
                    "Unable to restore the reserved food quantity."
                )
            }), 500

        return jsonify({
            "success": True,
            "message": (
                "Reservation cancelled successfully. "
                "The reserved quantity is available again."
            ),
            "status": "cancelled",
            "request_id": str(order_id)
        }), 200

    # ======================================================
    # ACCEPTED RESERVATION
    #
    # The listing quantity was already reserved when the
    # customer placed the reservation.
    #
    # Therefore:
    #
    # 1. Cancel the reservation
    # 2. Restore the food quantity
    # ======================================================

    if current_status == "accepted":

        now = datetime.now(
            timezone.utc
        )

        # --------------------------------------------------
        # FIRST: change accepted -> cancelled
        #
        # This prevents the same reservation from being
        # cancelled twice and restoring quantity twice.
        # --------------------------------------------------

        try:

            result = orders_collection.update_one(
                {
                    "_id": order_id,

                    "requester_id": user_id,

                    "status": "accepted"
                },

                {
                    "$set": {
                        "status": "cancelled",

                        "cancelled_at": now,

                        "updated_at": now
                    }
                }
            )

        except PyMongoError as error:

            print(
                "MongoDB accepted cancellation error:",
                error
            )

            return jsonify({
                "success": False,
                "message": (
                    "Unable to cancel the reservation."
                )
            }), 500

        # --------------------------------------------------
        # RESERVATION WAS ALREADY PROCESSED
        # --------------------------------------------------

        if result.modified_count == 0:

            return jsonify({
                "success": False,
                "message": (
                    "This reservation has already been processed."
                )
            }), 409

        # --------------------------------------------------
        # RESTORE LISTING QUANTITY
        # --------------------------------------------------

        try:

            listing_result = listings_collection.update_one(
                {
                    "_id": listing_object_id
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

        except PyMongoError as error:

            print(
                "MongoDB listing quantity restoration error:",
                error
            )

            # ----------------------------------------------
            # ROLLBACK RESERVATION STATUS
            # ----------------------------------------------

            try:

                orders_collection.update_one(
                    {
                        "_id": order_id,

                        "requester_id": user_id,

                        "status": "cancelled"
                    },

                    {
                        "$set": {
                            "status": "accepted",

                            "updated_at": (
                                datetime.now(
                                    timezone.utc
                                )
                            )
                        },

                        "$unset": {
                            "cancelled_at": ""
                        }
                    }
                )

            except PyMongoError as rollback_error:

                print(
                    "MongoDB cancellation rollback error:",
                    rollback_error
                )

            return jsonify({
                "success": False,
                "message": (
                    "Unable to restore the food quantity. "
                    "Reservation was not cancelled."
                )
            }), 500

        # --------------------------------------------------
        # LISTING DID NOT UPDATE
        # --------------------------------------------------

        if listing_result.modified_count == 0:

            try:

                orders_collection.update_one(
                    {
                        "_id": order_id,

                        "requester_id": user_id,

                        "status": "cancelled"
                    },

                    {
                        "$set": {
                            "status": "accepted",

                            "updated_at": (
                                datetime.now(
                                    timezone.utc
                                )
                            )
                        },

                        "$unset": {
                            "cancelled_at": ""
                        }
                    }
                )

            except PyMongoError as rollback_error:

                print(
                    "MongoDB status rollback error:",
                    rollback_error
                )

            return jsonify({
                "success": False,
                "message": (
                    "Unable to restore the food listing."
                )
            }), 500

        # --------------------------------------------------
        # SUCCESS
        # --------------------------------------------------

        return jsonify({
            "success": True,
            "message": (
                "Reservation cancelled successfully. "
                "The reserved quantity is available again."
            ),
            "status": "cancelled",
            "request_id": str(order_id)
        }), 200

# ==========================================================
# CONFIRM PICKUP
# POST /api/user/reservations/<reservation_id>/confirm-pickup
# ==========================================================

@orders.route(
    "/api/user/reservations/<reservation_id>/confirm-pickup",
    methods=["POST"]
)
def confirm_pickup(reservation_id):
    """
    Allow the logged-in customer to confirm that
    they have picked up their reserved food.

    Lifecycle:
        ready_for_pickup -> completed

    The listing quantity is NOT changed here because
    the quantity was already reduced when the reservation
    was created.
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
    # CONVERT RESERVATION ID
    # ======================================================

    try:
        order_id = ObjectId(reservation_id)

    except (InvalidId, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid reservation ID."
        }), 400

    # ======================================================
    # DATABASE
    # ======================================================

    orders_collection = get_collection("orders")

    if orders_collection is None:
        return jsonify({
            "success": False,
            "message": "Database is currently unavailable."
        }), 503

    # ======================================================
    # FIND CUSTOMER'S RESERVATION
    #
    # requester_id ensures that a user cannot confirm
    # somebody else's reservation.
    # ======================================================

    try:

        order = orders_collection.find_one({
            "_id": order_id,
            "requester_id": user_id
        })

    except PyMongoError as error:

        print(
            "MongoDB pickup confirmation lookup error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to load reservation."
        }), 500

    if order is None:
        return jsonify({
            "success": False,
            "message": "Reservation not found."
        }), 404

    # ======================================================
    # CHECK CURRENT STATUS
    # ======================================================

    current_status = str(
        order.get(
            "status",
            ""
        )
    ).strip().lower()

    if current_status != "ready_for_pickup":

        if current_status == "completed":
            message = "This pickup has already been completed."

        elif current_status == "accepted":
            message = (
                "The food is accepted but not ready for pickup yet."
            )

        elif current_status == "pending":
            message = (
                "The provider has not accepted this reservation yet."
            )

        elif current_status in (
            "cancelled",
            "canceled"
        ):
            message = "This reservation has been cancelled."

        elif current_status == "rejected":
            message = "This reservation was rejected by the provider."

        else:
            message = (
                "This reservation is not ready for pickup."
            )

        return jsonify({
            "success": False,
            "message": message
        }), 409

    # ======================================================
    # MARK PICKUP AS COMPLETED
    # ======================================================

    now = datetime.now(timezone.utc)

    try:

        result = orders_collection.update_one(
            {
                "_id": order_id,
                "requester_id": user_id,
                "status": "ready_for_pickup"
            },
            {
                "$set": {
                    "status": "completed",
                    "completed_at": now,
                    "updated_at": now
                }
            }
        )

    except PyMongoError as error:

        print(
            "MongoDB pickup confirmation update error:",
            error
        )

        return jsonify({
            "success": False,
            "message": "Unable to confirm pickup."
        }), 500

    # ======================================================
    # ALREADY PROCESSED / RACE CONDITION
    # ======================================================

    if result.modified_count == 0:

        return jsonify({
            "success": False,
            "message": (
                "This pickup has already been processed "
                "or is no longer ready for pickup."
            )
        }), 409

    # ======================================================
    # SUCCESS
    # ======================================================

    return jsonify({
        "success": True,
        "message": "Pickup confirmed successfully.",
        "status": "completed",
        "request_id": str(order_id)
    }), 200