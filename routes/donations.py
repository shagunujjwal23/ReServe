"""Provider surplus and NGO donation APIs."""

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, jsonify, request, session
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError, PyMongoError

from config.database import get_collection
from routes.ngo import ngo_required
from services.lifecycle import _as_utc, normalize_datetime, refresh_lifecycle


donations = Blueprint("donations", __name__)

PROVIDER_ROLES = {
    "provider",
    "food_provider",
    "food provider",
    "donor",
    "restaurant",
}


# ============================================================
# COMMON HELPERS
# ============================================================

def _session_user(required_role=None):
    try:
        user_id = ObjectId(session.get("user_id", ""))
    except (InvalidId, TypeError):
        return None, (
            jsonify(
                success=False,
                message="Authentication is required."
            ),
            401,
        )

    users = get_collection("users")

    if users is None:
        return None, (
            jsonify(
                success=False,
                message="MongoDB is currently unavailable."
            ),
            503,
        )

    user = users.find_one({"_id": user_id})

    if not user:
        return None, (
            jsonify(
                success=False,
                message="User account not found."
            ),
            404,
        )

    role = str(user.get("role", "")).strip().lower()

    if required_role == "provider" and role not in PROVIDER_ROLES:
        return None, (
            jsonify(
                success=False,
                message="Provider access required."
            ),
            403,
        )

    if required_role == "ngo" and role != "ngo":
        return None, (
            jsonify(
                success=False,
                message="NGO access required."
            ),
            403,
        )

    return user, None


def _object_id(value, label="ID"):
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


def _quantity(value):
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _serialize_datetime(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _serialize(donation):
    """
    Serialize a donation document for API responses.
    """
    if donation is None:
        return None

    result = {
        key: value
        for key, value in donation.items()
        if key != "_id"
    }

    result["id"] = str(donation["_id"])

    for key in (
        "listing_id",
        "provider_id",
        "ngo_id",
    ):
        if result.get(key) is not None:
            result[key] = str(result[key])

    for key in (
        "created_at",
        "updated_at",
        "claimed_at",
        "picked_up_at",
        "completed_at",
        "expired_at",
    ):
        result[key] = _serialize_datetime(result.get(key))

    return result


def _serialize_claim(claim, donation=None, ngo=None):
    """
    Serialize a donation_claim document.

    The optional donation and ngo documents are used to provide
    useful display information to the My Claims page.
    """
    if claim is None:
        return None

    result = {
        key: value
        for key, value in claim.items()
        if key != "_id"
    }

    result["id"] = str(claim["_id"])

    for key in ("donation_id", "ngo_id"):
        if result.get(key) is not None:
            result[key] = str(result[key])

    for key in (
        "claimed_at",
        "picked_up_at",
        "completed_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    ):
        result[key] = _serialize_datetime(result.get(key))

    # --------------------------------------------------------
    # Donation information
    # --------------------------------------------------------
    if donation:
        result["donation"] = _serialize(donation)

        # Convenient top-level fields for frontend cards
        result["food_title"] = donation.get("food_title", "")
        result["category"] = donation.get("category", "")
        result["food_type"] = donation.get("food_type", "")
        result["unit"] = claim.get(
            "unit",
            donation.get("unit", "")
        )
        result["provider_name"] = donation.get(
            "provider_name",
            "Food Provider"
        )
        result["pickup_address"] = donation.get(
            "pickup_address",
            ""
        )
        result["city"] = donation.get("city", "")
        result["image"] = donation.get("image", "")
        result["description"] = donation.get(
            "description",
            ""
        )

        result["pickup_start"] = donation.get(
            "donation_pickup_start"
        )
        result["pickup_end"] = donation.get(
            "donation_pickup_end"
        )

        result["donation_status"] = donation.get(
            "status",
            ""
        )

    # --------------------------------------------------------
    # NGO information
    # --------------------------------------------------------
    if ngo:
        result["ngo_name"] = (
            ngo.get("organization_name")
            or ngo.get("business_name")
            or ngo.get("full_name")
            or ngo.get("name")
            or "NGO"
        )

    return result


def _ensure_donation_claim_indexes():
    """
    Create indexes used by the NGO claim system.

    This is safe to call repeatedly.
    """
    claims = get_collection("donation_claims")

    if claims is None:
        return

    try:
        claims.create_index(
            [("ngo_id", 1), ("created_at", -1)]
        )

        claims.create_index(
            [("donation_id", 1), ("created_at", -1)]
        )

        claims.create_index(
            [("ngo_id", 1), ("status", 1)]
        )

    except PyMongoError:
        pass


def _ensure_available_quantity():
    """
    Backward compatibility for donations created before
    available_quantity was introduced.

    Existing available donations get:

        available_quantity = surplus_quantity

    Only records missing available_quantity are updated.
    """
    collection = get_collection("donations")

    if collection is None:
        return

    try:
        collection.update_many(
            {
                "status": "available",
                "available_quantity": {
                    "$exists": False
                },
            },
            [
                {
                    "$set": {
                        "available_quantity": {
                            "$ifNull": [
                                "$surplus_quantity",
                                0
                            ]
                        }
                    }
                }
            ],
        )
    except PyMongoError:
        pass


# ============================================================
# PROVIDER — SURPLUS
# ============================================================

@donations.route(
    "/api/provider/surplus",
    methods=["GET"]
)
def provider_surplus():

    refresh_lifecycle()

    user, error = _session_user("provider")

    if error:
        return error

    listings = get_collection("food_listings")

    records = list(
        listings.find(
            {
                "owner_id": user["_id"],
                "status": "surplus_pending",
            }
        ).sort(
            "updated_at",
            -1
        )
    )

    surplus = []

    for item in records:
        surplus.append(
            {
                "id": str(item["_id"]),

                "food_title": item.get(
                    "food_title",
                    ""
                ),

                "quantity": _quantity(
                    item.get("quantity")
                ),

                "original_quantity": item.get(
                    "original_quantity",
                    _quantity(
                        item.get("quantity")
                    )
                    + _quantity(
                        item.get("reservations")
                    ),
                ),

                "surplus_quantity": item.get(
                    "surplus_quantity"
                ),

                "unit": item.get(
                    "unit",
                    ""
                ),

                "donation_id": (
                    str(item["donation_id"])
                    if item.get("donation_id")
                    else None
                ),

                "pickup_end": item.get(
                    "pickup_end",
                    ""
                ),

                "image": item.get(
                    "image",
                    ""
                ),
            }
        )

    return jsonify(
        success=True,
        surplus=surplus
    ), 200


# ============================================================
# PROVIDER — CONFIRM SURPLUS
# ============================================================

@donations.route(
    "/api/listings/<listing_id>/confirm-surplus",
    methods=["POST"]
)
def confirm_surplus(listing_id):

    refresh_lifecycle()

    user, error = _session_user("provider")

    if error:
        return error

    object_id = _object_id(listing_id)

    payload = request.get_json(
        silent=True
    ) or {}

    if not object_id or "surplus_quantity" not in payload:
        return jsonify(
            success=False,
            message=(
                "A valid listing ID and "
                "surplus quantity are required."
            ),
        ), 400

    try:
        surplus_quantity = int(
            payload["surplus_quantity"]
        )
    except (TypeError, ValueError):
        return jsonify(
            success=False,
            message=(
                "Surplus quantity must be "
                "a whole number."
            ),
        ), 400

    listings = get_collection(
        "food_listings"
    )

    listing = listings.find_one(
        {
            "_id": object_id,
            "owner_id": user["_id"],
            "status": "surplus_pending",
        }
    )

    if listing is None:
        return jsonify(
            success=False,
            message=(
                "Surplus listing not found "
                "or cannot be updated."
            ),
        ), 404

    if listing.get("donation_id"):
        return jsonify(
            success=False,
            message=(
                "Surplus cannot be changed "
                "after donation publishing."
            ),
        ), 409

    available = _quantity(
        listing.get("quantity")
    )

    if (
        surplus_quantity < 0
        or surplus_quantity > available
    ):
        return jsonify(
            success=False,
            message=(
                f"Surplus quantity must be "
                f"between 0 and {available}."
            ),
        ), 400

    now = datetime.now(timezone.utc)

    status = (
        "completed"
        if surplus_quantity == 0
        else "surplus_pending"
    )

    listings.update_one(
        {
            "_id": object_id,
            "owner_id": user["_id"],
            "status": "surplus_pending",
        },
        {
            "$set": {
                "surplus_quantity": surplus_quantity,
                "surplus_confirmed_at": now,
                "status": status,
                "updated_at": now,
            }
        },
    )

    # Legacy records
    if "original_quantity" not in listing:
        listings.update_one(
            {
                "_id": object_id,
                "owner_id": user["_id"],
            },
            {
                "$set": {
                    "original_quantity": (
                        available
                        + _quantity(
                            listing.get(
                                "reservations"
                            )
                        )
                    )
                }
            },
        )

    return jsonify(
        success=True,
        listing_id=str(object_id),
        status=status,
        surplus_quantity=surplus_quantity,
    ), 200


# ============================================================
# PROVIDER — PUBLISH DONATION
# ============================================================

@donations.route(
    "/api/listings/<listing_id>/donate",
    methods=["POST"]
)
def publish_donation(listing_id):

    refresh_lifecycle()

    user, error = _session_user("provider")

    if error:
        return error

    object_id = _object_id(listing_id)

    payload = request.get_json(
        silent=True
    ) or {}

    if not object_id:
        return jsonify(
            success=False,
            message="Invalid listing ID."
        ), 400

    start = _as_utc(
        payload.get(
            "donation_pickup_start"
        )
    )

    end = _as_utc(
        payload.get(
            "donation_pickup_end"
        )
    )

    if (
        not start
        or not end
        or end <= start
    ):
        return jsonify(
            success=False,
            message=(
                "Provide a valid donation "
                "pickup window."
            ),
        ), 400

    now = datetime.now(timezone.utc)

    if start < now:
        return jsonify(
            success=False,
            message=(
                "Donation pickup must "
                "start in the future."
            ),
        ), 400

    listings = get_collection(
        "food_listings"
    )

    donation_records = get_collection(
        "donations"
    )

    listing = listings.find_one(
        {
            "_id": object_id,
            "owner_id": user["_id"],
            "status": "surplus_pending",
        }
    )

    if listing is None:
        return jsonify(
            success=False,
            message=(
                "Surplus listing not found "
                "or cannot be donated."
            ),
        ), 404

    surplus = listing.get(
        "surplus_quantity"
    )

    if not isinstance(
        surplus,
        int
    ) or surplus <= 0:
        return jsonify(
            success=False,
            message=(
                "Confirm a positive surplus "
                "quantity before publishing."
            ),
        ), 409

    if (
        listing.get("donation_id")
        or donation_records.find_one(
            {
                "listing_id": object_id
            }
        )
    ):
        return jsonify(
            success=False,
            message=(
                "A donation already exists "
                "for this listing."
            ),
        ), 409

    provider_name = (
        user.get("business_name")
        or user.get("full_name")
        or "Food Provider"
    )

    donation = {
        "listing_id": object_id,

        "provider_id": user["_id"],

        # Kept for compatibility with old records.
        # New claims are stored separately.
        "ngo_id": None,

        # Total donated quantity
        "surplus_quantity": surplus,

        # Quantity still available to NGOs
        "available_quantity": surplus,

        "unit": listing.get(
            "unit",
            ""
        ),

        "status": "available",

        "donation_pickup_start": normalize_datetime(
            payload["donation_pickup_start"]
        ),

        "donation_pickup_end": normalize_datetime(
            payload["donation_pickup_end"]
        ),

        "donation_instructions": str(
            payload.get(
                "donation_instructions",
                ""
            )
        ).strip()[:250],

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

        "expiry_date": listing.get(
            "expiry_date",
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

        "provider_name": provider_name,

        "pickup_address": listing.get(
            "address",
            ""
        ),

        "city": listing.get(
            "city",
            ""
        ),

        "pickup_instructions": listing.get(
            "pickup_instructions",
            ""
        ),

        "created_at": now,
        "updated_at": now,

        "claimed_at": None,
        "picked_up_at": None,
        "completed_at": None,
        "expired_at": None,
    }

    try:

        # One donation per listing
        donation_records.create_index(
            "listing_id",
            unique=True
        )

        result = donation_records.insert_one(
            donation
        )

        listings.update_one(
            {
                "_id": object_id,
                "owner_id": user["_id"],
                "donation_id": {
                    "$exists": False
                },
            },
            {
                "$set": {
                    "donation_id": result.inserted_id,
                    "updated_at": now,
                }
            },
        )

    except DuplicateKeyError:
        return jsonify(
            success=False,
            message=(
                "A donation already exists "
                "for this listing."
            ),
        ), 409

    except PyMongoError:
        return jsonify(
            success=False,
            message=(
                "Unable to publish "
                "the donation."
            ),
        ), 500

    return jsonify(
        success=True,
        message=(
            "Donation published for NGOs."
        ),
        donation_id=str(
            result.inserted_id
        ),
    ), 201


# ============================================================
# PROVIDER — DONATION HISTORY
# ============================================================

@donations.route(
    "/api/provider/donations",
    methods=["GET"]
)
def provider_donations():

    refresh_lifecycle()

    user, error = _session_user(
        "provider"
    )

    if error:
        return error

    collection = get_collection(
        "donations"
    )

    records = [
        _serialize(item)
        for item in collection.find(
            {
                "provider_id": user["_id"]
            }
        ).sort(
            "created_at",
            -1
        )
    ]

    return jsonify(
        success=True,
        donations=records
    ), 200


# ============================================================
# NGO — AVAILABLE DONATIONS
# ============================================================

@donations.route(
    "/api/donations/available",
    methods=["GET"]
)
@ngo_required
def available_donations():

    refresh_lifecycle()

    _ensure_available_quantity()

    collection = get_collection(
        "donations"
    )

    records = [
        _serialize(item)
        for item in collection.find(
            {
                "status": "available",
                "available_quantity": {
                    "$gt": 0
                },
            }
        ).sort(
            "created_at",
            -1
        )
    ]

    return jsonify(
        success=True,
        donations=records
    ), 200


# ============================================================
# NGO — DONATION DETAILS
# ============================================================

@donations.route(
    "/api/donations/<donation_id>",
    methods=["GET"]
)
@ngo_required
def donation_details(donation_id):

    refresh_lifecycle()

    object_id = _object_id(
        donation_id
    )

    if not object_id:
        return jsonify(
            success=False,
            message="Invalid donation ID."
        ), 400

    record = get_collection(
        "donations"
    ).find_one(
        {
            "_id": object_id
        }
    )

    if record is None:
        return jsonify(
            success=False,
            message="Donation not found."
        ), 404

    return jsonify(
        success=True,
        donation=_serialize(record)
    ), 200


# ============================================================
# NGO — CLAIM DONATION
# ============================================================

@donations.route(
    "/api/donations/<donation_id>/claim",
    methods=["POST"]
)
@ngo_required
def claim_donation(donation_id):

    refresh_lifecycle()

    user, error = _session_user(
        "ngo"
    )

    if error:
        return error

    object_id = _object_id(
        donation_id
    )

    if not object_id:
        return jsonify(
            success=False,
            message="Invalid donation ID."
        ), 400

    payload = request.get_json(
        silent=True
    ) or {}

    # --------------------------------------------------------
    # Quantity
    # --------------------------------------------------------

    requested_quantity = payload.get(
        "quantity"
    )

    if requested_quantity is None:
        return jsonify(
            success=False,
            message=(
                "Please provide the "
                "quantity to claim."
            ),
        ), 400

    try:
        requested_quantity = int(
            requested_quantity
        )
    except (TypeError, ValueError):
        return jsonify(
            success=False,
            message=(
                "Claim quantity must "
                "be a whole number."
            ),
        ), 400

    if requested_quantity <= 0:
        return jsonify(
            success=False,
            message=(
                "Claim quantity must "
                "be greater than zero."
            ),
        ), 400

    donations_collection = get_collection(
        "donations"
    )

    claims_collection = get_collection(
        "donation_claims"
    )

    if (
        donations_collection is None
        or claims_collection is None
    ):
        return jsonify(
            success=False,
            message=(
                "MongoDB is currently "
                "unavailable."
            ),
        ), 503

    _ensure_available_quantity()
    _ensure_donation_claim_indexes()

    now = datetime.now(timezone.utc)

    # --------------------------------------------------------
    # Atomically reserve the requested quantity.
    #
    # This prevents two NGOs from claiming more food than
    # actually exists.
    # --------------------------------------------------------

    donation = donations_collection.find_one_and_update(
        {
            "_id": object_id,

            "status": "available",

            "available_quantity": {
                "$gte": requested_quantity
            },
        },
        {
            "$inc": {
                "available_quantity": -requested_quantity
            },

            "$set": {
                "updated_at": now
            },
        },

        return_document=ReturnDocument.AFTER,
    )

    if donation is None:

        current = donations_collection.find_one(
            {
                "_id": object_id
            }
        )

        if current is None:
            return jsonify(
                success=False,
                message="Donation not found."
            ), 404

        available = _quantity(
            current.get(
                "available_quantity",
                current.get(
                    "surplus_quantity",
                    0
                )
            )
        )

        if available <= 0:
            return jsonify(
                success=False,
                message=(
                    "This donation is "
                    "no longer available."
                ),
            ), 409

        return jsonify(
            success=False,
            message=(
                f"Only {available} "
                f"{current.get('unit', '')} "
                "are available."
            ),
        ), 409

    # --------------------------------------------------------
    # Update donation status if all quantity is claimed.
    # --------------------------------------------------------

    remaining = _quantity(
        donation.get(
            "available_quantity"
        )
    )

    if remaining <= 0:

        donations_collection.update_one(
            {
                "_id": object_id
            },
            {
                "$set": {
                    "status": "claimed",
                    "updated_at": now,
                }
            },
        )

        donation["status"] = "claimed"

    # --------------------------------------------------------
    # Create separate claim record.
    # --------------------------------------------------------

    claim = {
        "donation_id": donation["_id"],

        "ngo_id": user["_id"],

        "quantity": requested_quantity,

        "unit": donation.get(
            "unit",
            ""
        ),

        # Direct claims are immediately confirmed.
        "status": "confirmed",

        "claimed_at": now,

        "picked_up_at": None,

        "completed_at": None,

        "cancelled_at": None,

        "created_at": now,

        "updated_at": now,
    }

    try:

        result = claims_collection.insert_one(
            claim
        )

    except PyMongoError:

        # Roll the quantity back if claim creation fails.
        donations_collection.update_one(
            {
                "_id": object_id
            },
            {
                "$inc": {
                    "available_quantity":
                        requested_quantity
                },

                "$set": {
                    "status": "available",
                    "updated_at": now,
                },
            },
        )

        return jsonify(
            success=False,
            message=(
                "Unable to create the "
                "donation claim."
            ),
        ), 500

    claim["_id"] = result.inserted_id

    return jsonify(
        success=True,
        message=(
            "Donation claimed successfully."
        ),
        claim=_serialize_claim(
            claim,
            donation=donation
        ),
    ), 201


# ============================================================
# NGO — MY CLAIMS
# ============================================================

@donations.route(
    "/api/ngo/claims",
    methods=["GET"]
)
@ngo_required
def ngo_claims():

    refresh_lifecycle()

    user, error = _session_user(
        "ngo"
    )

    if error:
        return error

    claims_collection = get_collection(
        "donation_claims"
    )

    donations_collection = get_collection(
        "donations"
    )

    if (
        claims_collection is None
        or donations_collection is None
    ):
        return jsonify(
            success=False,
            message=(
                "MongoDB is currently "
                "unavailable."
            ),
        ), 503

    _ensure_donation_claim_indexes()

    claim_records = list(
        claims_collection.find(
            {
                "ngo_id": user["_id"]
            }
        ).sort(
            "created_at",
            -1
        )
    )

    claims = []

    for claim in claim_records:

        donation = donations_collection.find_one(
            {
                "_id": claim.get(
                    "donation_id"
                )
            }
        )

        claims.append(
            _serialize_claim(
                claim,
                donation=donation
            )
        )

    return jsonify(
        success=True,
        claims=claims
    ), 200


# ============================================================
# NGO — SINGLE CLAIM DETAILS
# ============================================================

@donations.route(
    "/api/donation-claims/<claim_id>",
    methods=["GET"]
)
@ngo_required
def donation_claim_details(claim_id):

    user, error = _session_user(
        "ngo"
    )

    if error:
        return error

    object_id = _object_id(
        claim_id
    )

    if not object_id:
        return jsonify(
            success=False,
            message="Invalid claim ID."
        ), 400

    claims_collection = get_collection(
        "donation_claims"
    )

    donations_collection = get_collection(
        "donations"
    )

    claim = claims_collection.find_one(
        {
            "_id": object_id,
            "ngo_id": user["_id"],
        }
    )

    if claim is None:
        return jsonify(
            success=False,
            message="Claim not found."
        ), 404

    donation = donations_collection.find_one(
        {
            "_id": claim["donation_id"]
        }
    )

    return jsonify(
        success=True,
        claim=_serialize_claim(
            claim,
            donation=donation
        )
    ), 200


# ============================================================
# NGO — PICKUP
# ============================================================

@donations.route(
    "/api/donation-claims/<claim_id>/pickup",
    methods=["POST"]
)
@ngo_required
def pickup_claim(claim_id):

    refresh_lifecycle()

    user, error = _session_user(
        "ngo"
    )

    if error:
        return error

    object_id = _object_id(
        claim_id
    )

    if not object_id:
        return jsonify(
            success=False,
            message="Invalid claim ID."
        ), 400

    claims_collection = get_collection(
        "donation_claims"
    )

    donations_collection = get_collection(
        "donations"
    )

    now = datetime.now(timezone.utc)

    claim = claims_collection.find_one_and_update(
        {
            "_id": object_id,

            "ngo_id": user["_id"],

            "status": "confirmed",
        },
        {
            "$set": {
                "status": "picked_up",
                "picked_up_at": now,
                "updated_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )

    if claim is None:
        return jsonify(
            success=False,
            message=(
                "Claim is not confirmed "
                "or does not belong to you."
            ),
        ), 409

    # Keep donation-level timestamp only as
    # informational data. The actual claim lifecycle
    # is stored in donation_claims.
    donations_collection.update_one(
        {
            "_id": claim["donation_id"]
        },
        {
            "$set": {
                "updated_at": now
            }
        },
    )

    donation = donations_collection.find_one(
        {
            "_id": claim["donation_id"]
        }
    )

    return jsonify(
        success=True,
        message="Pickup marked successfully.",
        claim=_serialize_claim(
            claim,
            donation=donation
        ),
    ), 200


# ============================================================
# NGO — COMPLETE CLAIM
# ============================================================

@donations.route(
    "/api/donation-claims/<claim_id>/complete",
    methods=["POST"]
)
@ngo_required
def complete_claim(claim_id):

    refresh_lifecycle()

    user, error = _session_user(
        "ngo"
    )

    if error:
        return error

    object_id = _object_id(
        claim_id
    )

    if not object_id:
        return jsonify(
            success=False,
            message="Invalid claim ID."
        ), 400

    claims_collection = get_collection(
        "donation_claims"
    )

    donations_collection = get_collection(
        "donations"
    )

    now = datetime.now(timezone.utc)

    claim = claims_collection.find_one_and_update(
        {
            "_id": object_id,

            "ngo_id": user["_id"],

            "status": "picked_up",
        },
        {
            "$set": {
                "status": "completed",
                "completed_at": now,
                "updated_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )

    if claim is None:
        return jsonify(
            success=False,
            message=(
                "Claim must be picked up "
                "before it can be completed."
            ),
        ), 409

    donation = donations_collection.find_one(
        {
            "_id": claim["donation_id"]
        }
    )

    # If all donated food has now been handled,
    # complete the original food listing.
    if donation:

        listing_id = donation.get(
            "listing_id"
        )

        if listing_id:

            remaining = _quantity(
                donation.get(
                    "available_quantity",
                    0
                )
            )

            active_claims = claims_collection.count_documents(
                {
                    "donation_id": donation["_id"],
                    "status": {
                        "$in": [
                            "confirmed",
                            "picked_up",
                        ]
                    },
                }
            )

            if (
                remaining == 0
                and active_claims == 0
            ):

                get_collection(
                    "food_listings"
                ).update_one(
                    {
                        "_id": listing_id,
                        "status": "surplus_pending",
                    },
                    {
                        "$set": {
                            "status": "completed",
                            "updated_at": now,
                        }
                    },
                )

    donations_collection.update_one(
        {
            "_id": claim["donation_id"]
        },
        {
            "$set": {
                "updated_at": now
            }
        },
    )

    donation = donations_collection.find_one(
        {
            "_id": claim["donation_id"]
        }
    )

    return jsonify(
        success=True,
        message=(
            "Claim completed successfully."
        ),
        claim=_serialize_claim(
            claim,
            donation=donation
        ),
    ), 200


# ============================================================
# NGO — CANCEL CLAIM
# ============================================================

@donations.route(
    "/api/donation-claims/<claim_id>/cancel",
    methods=["POST"]
)
@ngo_required
def cancel_claim(claim_id):

    refresh_lifecycle()

    user, error = _session_user(
        "ngo"
    )

    if error:
        return error

    object_id = _object_id(
        claim_id
    )

    if not object_id:
        return jsonify(
            success=False,
            message="Invalid claim ID."
        ), 400

    claims_collection = get_collection(
        "donation_claims"
    )

    donations_collection = get_collection(
        "donations"
    )

    claim = claims_collection.find_one(
        {
            "_id": object_id,
            "ngo_id": user["_id"],
            "status": {
                "$in": [
                    "confirmed",
                    "pending",
                ]
            },
        }
    )

    if claim is None:
        return jsonify(
            success=False,
            message=(
                "Only pending or confirmed "
                "claims can be cancelled."
            ),
        ), 409

    now = datetime.now(timezone.utc)

    donation = donations_collection.find_one(
        {
            "_id": claim["donation_id"]
        }
    )

    # --------------------------------------------------------
    # Determine whether food can be returned to availability.
    # --------------------------------------------------------

    can_restore = False

    if donation:

        pickup_end = _as_utc(
            donation.get(
                "donation_pickup_end"
            )
        )

        if pickup_end is None:
            can_restore = True
        elif now < pickup_end:
            can_restore = True

    # --------------------------------------------------------
    # Cancel claim
    # --------------------------------------------------------

    updated_claim = claims_collection.find_one_and_update(
        {
            "_id": object_id,
            "ngo_id": user["_id"],
            "status": {
                "$in": [
                    "confirmed",
                    "pending",
                ]
            },
        },
        {
            "$set": {
                "status": "cancelled",
                "cancelled_at": now,
                "updated_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )

    if updated_claim is None:
        return jsonify(
            success=False,
            message=(
                "Claim could not be cancelled."
            ),
        ), 409

    # --------------------------------------------------------
    # Return quantity to donation if pickup window is still
    # active.
    # --------------------------------------------------------

    if (
        donation
        and can_restore
    ):

        donations_collection.update_one(
            {
                "_id": donation["_id"]
            },
            {
                "$inc": {
                    "available_quantity":
                        _quantity(
                            claim.get(
                                "quantity"
                            )
                        )
                },

                "$set": {
                    "status": "available",
                    "updated_at": now,
                },
            },
        )

    donation = donations_collection.find_one(
        {
            "_id": claim["donation_id"]
        }
    )

    return jsonify(
        success=True,
        message="Claim cancelled successfully.",
        claim=_serialize_claim(
            updated_claim,
            donation=donation
        ),
    ), 200


# ============================================================
# LEGACY NGO DONATIONS ENDPOINT
# ============================================================

@donations.route(
    "/api/ngo/donations",
    methods=["GET"]
)
@ngo_required
def ngo_donations():

    """
    Legacy endpoint.

    New frontend should use:
        GET /api/ngo/claims

    This endpoint is retained so older frontend code
    does not immediately break.
    """

    user, error = _session_user(
        "ngo"
    )

    if error:
        return error

    claims_collection = get_collection(
        "donation_claims"
    )

    donations_collection = get_collection(
        "donations"
    )

    if (
        claims_collection is None
        or donations_collection is None
    ):
        return jsonify(
            success=False,
            message=(
                "MongoDB is currently "
                "unavailable."
            ),
        ), 503

    claim_records = list(
        claims_collection.find(
            {
                "ngo_id": user["_id"]
            }
        ).sort(
            "created_at",
            -1
        )
    )

    records = []

    for claim in claim_records:

        donation = donations_collection.find_one(
            {
                "_id": claim.get(
                    "donation_id"
                )
            }
        )

        if donation:
            item = _serialize(
                donation
            )

            item["claim_id"] = str(
                claim["_id"]
            )

            item["claim_quantity"] = (
                claim.get(
                    "quantity",
                    0
                )
            )

            item["claim_status"] = (
                claim.get(
                    "status",
                    ""
                )
            )

            records.append(item)

    return jsonify(
        success=True,
        donations=records
    ), 200


# ============================================================
# NGO — DASHBOARD
# ============================================================

@donations.route(
    "/api/ngo/dashboard",
    methods=["GET"]
)
@ngo_required
def ngo_dashboard_data():

    refresh_lifecycle()

    user, error = _session_user(
        "ngo"
    )

    if error:
        return error

    donations_collection = get_collection(
        "donations"
    )

    claims_collection = get_collection(
        "donation_claims"
    )

    if (
        donations_collection is None
        or claims_collection is None
    ):
        return jsonify(
            success=False,
            message=(
                "MongoDB is currently "
                "unavailable."
            ),
        ), 503

    _ensure_available_quantity()
    _ensure_donation_claim_indexes()

    # --------------------------------------------------------
    # Available donations
    # --------------------------------------------------------

    available_count = donations_collection.count_documents(
        {
            "status": "available",
            "available_quantity": {
                "$gt": 0
            },
        }
    )

    # --------------------------------------------------------
    # Active claims
    # --------------------------------------------------------

    active_statuses = [
        "confirmed",
        "picked_up",
    ]

    active_claims = claims_collection.count_documents(
        {
            "ngo_id": user["_id"],
            "status": {
                "$in": active_statuses
            },
        }
    )

    # --------------------------------------------------------
    # Completed claims
    # --------------------------------------------------------

    completed_claims = list(
        claims_collection.find(
            {
                "ngo_id": user["_id"],
                "status": "completed",
            }
        )
    )

    food_rescued = sum(
        _quantity(
            claim.get(
                "quantity"
            )
        )
        for claim in completed_claims
    )

    completed_count = len(
        completed_claims
    )

    # --------------------------------------------------------
    # Recent available donations
    # --------------------------------------------------------

    recent_donations = [
        _serialize(item)
        for item in donations_collection.find(
            {
                "status": "available",
                "available_quantity": {
                    "$gt": 0
                },
            }
        ).sort(
            "created_at",
            -1
        ).limit(5)
    ]

    # --------------------------------------------------------
    # Recent NGO claims
    # --------------------------------------------------------

    recent_claim_records = list(
        claims_collection.find(
            {
                "ngo_id": user["_id"]
            }
        ).sort(
            "updated_at",
            -1
        ).limit(5)
    )

    recent_claims = []

    for claim in recent_claim_records:

        donation = donations_collection.find_one(
            {
                "_id": claim.get(
                    "donation_id"
                )
            }
        )

        recent_claims.append(
            _serialize_claim(
                claim,
                donation=donation
            )
        )

    return jsonify(
        success=True,
        dashboard={
            "available_count": available_count,

            "active_claims": active_claims,

            "food_rescued": food_rescued,

            "completed_donations": completed_count,

            "completed_claims": completed_count,

            "recent_donations": recent_donations,

            "recent_claims": recent_claims,

            # Kept for older dashboard JS
            "my_donations": recent_claims,
        },
    ), 200


# ============================================================
# NGO — IMPACT / ANALYTICS
# ============================================================

@donations.route(
    "/api/ngo/impact",
    methods=["GET"]
)
@ngo_required
def ngo_impact():

    refresh_lifecycle()

    user, error = _session_user(
        "ngo"
    )

    if error:
        return error

    claims_collection = get_collection(
        "donation_claims"
    )

    donations_collection = get_collection(
        "donations"
    )

    if (
        claims_collection is None
        or donations_collection is None
    ):
        return jsonify(
            success=False,
            message=(
                "MongoDB is currently "
                "unavailable."
            ),
        ), 503

    completed = list(
        claims_collection.find(
            {
                "ngo_id": user["_id"],
                "status": "completed",
            }
        )
    )

    # --------------------------------------------------------
    # Total food collected
    # --------------------------------------------------------

    food_collected = sum(
        _quantity(
            claim.get(
                "quantity"
            )
        )
        for claim in completed
    )

    # --------------------------------------------------------
    # Successful pickups
    # --------------------------------------------------------

    successful_pickups = len(
        completed
    )

    # --------------------------------------------------------
    # People served
    #
    # Simple project-level estimation:
    # 1 claimed food unit = 1 beneficiary unit.
    #
    # This can later be changed to a configurable
    # conversion factor.
    # --------------------------------------------------------

    people_served = food_collected

    # --------------------------------------------------------
    # Communities supported
    #
    # Count distinct cities/areas from completed donations.
    # --------------------------------------------------------

    areas = set()

    category_totals = {}

    monthly_totals = {}

    source_totals = {}

    for claim in completed:

        donation = donations_collection.find_one(
            {
                "_id": claim.get(
                    "donation_id"
                )
            }
        )

        if not donation:
            continue

        quantity = _quantity(
            claim.get(
                "quantity"
            )
        )

        # ------------------------------
        # Areas
        # ------------------------------

        city = str(
            donation.get(
                "city",
                ""
            )
        ).strip()

        if city:
            areas.add(city)

        # ------------------------------
        # Category
        # ------------------------------

        category = (
            str(
                donation.get(
                    "category",
                    "Others"
                )
            ).strip()
            or "Others"
        )

        category_totals[category] = (
            category_totals.get(
                category,
                0
            )
            + quantity
        )

        # ------------------------------
        # Provider/source
        # ------------------------------

        provider = (
            donation.get(
                "provider_name"
            )
            or "Other"
        )

        source_totals[provider] = (
            source_totals.get(
                provider,
                0
            )
            + quantity
        )

        # ------------------------------
        # Monthly trend
        # ------------------------------

        completed_at = claim.get(
            "completed_at"
        )

        if isinstance(
            completed_at,
            datetime
        ):
            month_key = completed_at.strftime(
                "%Y-%m"
            )

            monthly_totals[month_key] = (
                monthly_totals.get(
                    month_key,
                    0
                )
                + quantity
            )

    # --------------------------------------------------------
    # Food waste prevented
    #
    # For this project we use rescued food quantity as the
    # prevented-waste quantity.
    # --------------------------------------------------------

    food_waste_prevented = food_collected

    # --------------------------------------------------------
    # Convert analytics to frontend-friendly arrays
    # --------------------------------------------------------

    category_breakdown = [
        {
            "category": category,
            "quantity": quantity,
        }
        for category, quantity
        in sorted(
            category_totals.items(),
            key=lambda item: item[1],
            reverse=True,
        )
    ]

    source_breakdown = [
        {
            "provider": provider,
            "quantity": quantity,
        }
        for provider, quantity
        in sorted(
            source_totals.items(),
            key=lambda item: item[1],
            reverse=True,
        )
    ]

    trend = [
        {
            "month": month,
            "quantity": quantity,
        }
        for month, quantity
        in sorted(
            monthly_totals.items()
        )
    ]

    area_breakdown = [
        {
            "area": area,
            "quantity": sum(
                _quantity(
                    claim.get(
                        "quantity"
                    )
                )
                for claim in completed
                if (
                    (
                        donations_collection.find_one(
                            {
                                "_id": claim.get(
                                    "donation_id"
                                )
                            }
                        )
                        or {}
                    ).get(
                        "city",
                        ""
                    ).strip()
                    == area
                )
            ),
        }
        for area in sorted(
            areas
        )
    ]

    return jsonify(
        success=True,

        summary={
            "food_collected": food_collected,

            "people_served": people_served,

            "communities_supported": len(
                areas
            ),

            "food_waste_prevented": (
                food_waste_prevented
            ),

            "successful_pickups": (
                successful_pickups
            ),
        },

        trend=trend,

        categories=category_breakdown,

        sources=source_breakdown,

        areas=area_breakdown,

        # Useful for cards/charts
        category_breakdown=category_breakdown,

        source_breakdown=source_breakdown,

        area_breakdown=area_breakdown,
    ), 200