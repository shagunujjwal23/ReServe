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
PROVIDER_ROLES = {"provider", "food_provider", "food provider", "donor", "restaurant"}


def _session_user(required_role=None):
    try:
        user_id = ObjectId(session.get("user_id", ""))
    except (InvalidId, TypeError):
        return None, (jsonify(success=False, message="Authentication is required."), 401)
    users = get_collection("users")
    if users is None:
        return None, (jsonify(success=False, message="MongoDB is currently unavailable."), 503)
    user = users.find_one({"_id": user_id})
    if not user:
        return None, (jsonify(success=False, message="User account not found."), 404)
    role = str(user.get("role", "")).strip().lower()
    if required_role == "provider" and role not in PROVIDER_ROLES:
        return None, (jsonify(success=False, message="Provider access required."), 403)
    if required_role == "ngo" and role != "ngo":
        return None, (jsonify(success=False, message="NGO access required."), 403)
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


def _serialize(donation):
    if donation is None:
        return None
    result = {key: value for key, value in donation.items() if key != "_id"}
    result["id"] = str(donation["_id"])
    for key in ("listing_id", "provider_id", "ngo_id"):
        if result.get(key) is not None:
            result[key] = str(result[key])
    for key in ("created_at", "updated_at", "claimed_at", "picked_up_at", "completed_at", "expired_at"):
        if isinstance(result.get(key), datetime):
            result[key] = result[key].isoformat()
    return result


@donations.route("/api/provider/surplus", methods=["GET"])
def provider_surplus():
    refresh_lifecycle()
    user, error = _session_user("provider")
    if error:
        return error
    listings = get_collection("food_listings")
    records = list(listings.find({"owner_id": user["_id"], "status": "surplus_pending"}).sort("updated_at", -1))
    return jsonify(success=True, surplus=[{
        "id": str(item["_id"]), "food_title": item.get("food_title", ""),
        "quantity": _quantity(item.get("quantity")),
        "original_quantity": item.get("original_quantity", _quantity(item.get("quantity")) + _quantity(item.get("reservations"))),
        "surplus_quantity": item.get("surplus_quantity"),
        "unit": item.get("unit", ""), "donation_id": str(item["donation_id"]) if item.get("donation_id") else None,
        "pickup_end": item.get("pickup_end", ""), "image": item.get("image", ""),
    } for item in records]), 200


@donations.route("/api/listings/<listing_id>/confirm-surplus", methods=["POST"])
def confirm_surplus(listing_id):
    refresh_lifecycle()
    user, error = _session_user("provider")
    if error:
        return error
    object_id = _object_id(listing_id)
    payload = request.get_json(silent=True) or {}
    if not object_id or "surplus_quantity" not in payload:
        return jsonify(success=False, message="A valid listing ID and surplus quantity are required."), 400
    try:
        surplus_quantity = int(payload["surplus_quantity"])
    except (TypeError, ValueError):
        return jsonify(success=False, message="Surplus quantity must be a whole number."), 400
    listings = get_collection("food_listings")
    listing = listings.find_one({"_id": object_id, "owner_id": user["_id"], "status": "surplus_pending"})
    if listing is None:
        return jsonify(success=False, message="Surplus listing not found or cannot be updated."), 404
    if listing.get("donation_id"):
        return jsonify(success=False, message="Surplus cannot be changed after donation publishing."), 409
    available = _quantity(listing.get("quantity"))
    if surplus_quantity < 0 or surplus_quantity > available:
        return jsonify(success=False, message=f"Surplus quantity must be between 0 and {available}."), 400
    now = datetime.now(timezone.utc)
    status = "completed" if surplus_quantity == 0 else "surplus_pending"
    listings.update_one({"_id": object_id, "owner_id": user["_id"], "status": "surplus_pending"}, {"$set": {
        "surplus_quantity": surplus_quantity, "surplus_confirmed_at": now, "status": status, "updated_at": now,
    }})
    # Legacy records predate original_quantity. Record the compatible value on
    # first surplus confirmation without modifying their live quantity logic.
    if "original_quantity" not in listing:
        listings.update_one({"_id": object_id, "owner_id": user["_id"]}, {"$set": {
            "original_quantity": available + _quantity(listing.get("reservations"))
        }})
    return jsonify(success=True, listing_id=str(object_id), status=status, surplus_quantity=surplus_quantity), 200


@donations.route("/api/listings/<listing_id>/donate", methods=["POST"])
def publish_donation(listing_id):
    refresh_lifecycle()
    user, error = _session_user("provider")
    if error:
        return error
    object_id = _object_id(listing_id)
    payload = request.get_json(silent=True) or {}
    if not object_id:
        return jsonify(success=False, message="Invalid listing ID."), 400
    start = _as_utc(payload.get("donation_pickup_start"))
    end = _as_utc(payload.get("donation_pickup_end"))
    if not start or not end or end <= start:
        return jsonify(success=False, message="Provide a valid donation pickup window."), 400
    now = datetime.now(timezone.utc)
    if start < now:
        return jsonify(success=False, message="Donation pickup must start in the future."), 400
    listings = get_collection("food_listings")
    donation_records = get_collection("donations")
    listing = listings.find_one({"_id": object_id, "owner_id": user["_id"], "status": "surplus_pending"})
    if listing is None:
        return jsonify(success=False, message="Surplus listing not found or cannot be donated."), 404
    surplus = listing.get("surplus_quantity")
    if not isinstance(surplus, int) or surplus <= 0:
        return jsonify(success=False, message="Confirm a positive surplus quantity before publishing."), 409
    if listing.get("donation_id") or donation_records.find_one({"listing_id": object_id}):
        return jsonify(success=False, message="A donation already exists for this listing."), 409
    provider_name = user.get("business_name") or user.get("full_name") or "Food Provider"
    donation = {
        "listing_id": object_id, "provider_id": user["_id"], "ngo_id": None,
        "surplus_quantity": surplus, "unit": listing.get("unit", ""), "status": "available",
        "donation_pickup_start": normalize_datetime(payload["donation_pickup_start"]),
        "donation_pickup_end": normalize_datetime(payload["donation_pickup_end"]),
        "donation_instructions": str(payload.get("donation_instructions", "")).strip()[:250],
        "food_title": listing.get("food_title", ""), "category": listing.get("category", ""),
        "food_type": listing.get("food_type", ""), "expiry_date": listing.get("expiry_date", ""),
        "description": listing.get("description", ""), "image": listing.get("image", ""),
        "provider_name": provider_name, "pickup_address": listing.get("address", ""), "city": listing.get("city", ""),
        "pickup_instructions": listing.get("pickup_instructions", ""), "created_at": now, "updated_at": now,
        "claimed_at": None, "picked_up_at": None, "completed_at": None, "expired_at": None,
    }
    try:
        # The index makes the one-donation-per-listing rule durable even if
        # two provider browser requests arrive at the same time.
        donation_records.create_index("listing_id", unique=True)
        result = donation_records.insert_one(donation)
        listings.update_one({"_id": object_id, "owner_id": user["_id"], "donation_id": {"$exists": False}}, {"$set": {"donation_id": result.inserted_id, "updated_at": now}})
    except DuplicateKeyError:
        return jsonify(success=False, message="A donation already exists for this listing."), 409
    except PyMongoError:
        return jsonify(success=False, message="Unable to publish the donation."), 500
    return jsonify(success=True, message="Donation published for NGOs.", donation_id=str(result.inserted_id)), 201


@donations.route("/api/provider/donations", methods=["GET"])
def provider_donations():
    refresh_lifecycle()
    user, error = _session_user("provider")
    if error:
        return error
    collection = get_collection("donations")
    records = [_serialize(item) for item in collection.find({"provider_id": user["_id"]}).sort("created_at", -1)]
    return jsonify(success=True, donations=records), 200


@donations.route("/api/donations/available", methods=["GET"])
@ngo_required
def available_donations():
    refresh_lifecycle()
    collection = get_collection("donations")
    records = [_serialize(item) for item in collection.find({"status": "available"}).sort("created_at", -1)]
    return jsonify(success=True, donations=records), 200


@donations.route("/api/donations/<donation_id>", methods=["GET"])
@ngo_required
def donation_details(donation_id):
    refresh_lifecycle()
    object_id = _object_id(donation_id)
    if not object_id:
        return jsonify(success=False, message="Invalid donation ID."), 400
    record = get_collection("donations").find_one({"_id": object_id})
    if record is None:
        return jsonify(success=False, message="Donation not found."), 404
    return jsonify(success=True, donation=_serialize(record)), 200


@donations.route("/api/donations/<donation_id>/claim", methods=["POST"])
@ngo_required
def claim_donation(donation_id):
    refresh_lifecycle()
    user, error = _session_user("ngo")
    if error:
        return error
    object_id = _object_id(donation_id)
    if not object_id:
        return jsonify(success=False, message="Invalid donation ID."), 400
    now = datetime.now(timezone.utc)
    record = get_collection("donations").find_one_and_update(
        {"_id": object_id, "status": "available"},
        {"$set": {"status": "claimed", "ngo_id": user["_id"], "claimed_at": now, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if record is None:
        return jsonify(success=False, message="This donation has already been claimed or is unavailable."), 409
    return jsonify(success=True, donation=_serialize(record)), 200


@donations.route("/api/ngo/donations", methods=["GET"])
@ngo_required
def ngo_donations():
    refresh_lifecycle()
    user, error = _session_user("ngo")
    if error:
        return error
    records = [_serialize(item) for item in get_collection("donations").find({"ngo_id": user["_id"]}).sort("created_at", -1)]
    return jsonify(success=True, donations=records), 200


def _advance_donation(donation_id, expected, target, timestamp_name):
    refresh_lifecycle()
    user, error = _session_user("ngo")
    if error:
        return error
    object_id = _object_id(donation_id)
    if not object_id:
        return jsonify(success=False, message="Invalid donation ID."), 400
    now = datetime.now(timezone.utc)
    record = get_collection("donations").find_one_and_update(
        {"_id": object_id, "ngo_id": user["_id"], "status": expected},
        {"$set": {"status": target, timestamp_name: now, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if record is None:
        return jsonify(success=False, message="Donation is not in the required state or is not yours."), 409
    if target == "completed":
        get_collection("food_listings").update_one({"_id": record["listing_id"], "status": "surplus_pending"}, {"$set": {"status": "completed", "updated_at": now}})
    return jsonify(success=True, donation=_serialize(record)), 200


@donations.route("/api/donations/<donation_id>/pickup", methods=["POST"])
@ngo_required
def pickup_donation(donation_id):
    return _advance_donation(donation_id, "claimed", "picked_up", "picked_up_at")


@donations.route("/api/donations/<donation_id>/complete", methods=["POST"])
@ngo_required
def complete_donation(donation_id):
    return _advance_donation(donation_id, "picked_up", "completed", "completed_at")


@donations.route("/api/ngo/dashboard", methods=["GET"])
@ngo_required
def ngo_dashboard_data():
    refresh_lifecycle()
    user, error = _session_user("ngo")
    if error:
        return error
    collection = get_collection("donations")
    completed = list(collection.find({"ngo_id": user["_id"], "status": "completed"}))
    active = collection.count_documents({"ngo_id": user["_id"], "status": {"$in": ["claimed", "picked_up"]}})
    return jsonify(success=True, dashboard={
        "available_count": collection.count_documents({"status": "available"}),
        "active_claims": active,
        "food_rescued": sum(item.get("surplus_quantity", 0) for item in completed),
        "completed_donations": len(completed),
        "recent_donations": [_serialize(item) for item in collection.find({"status": "available"}).sort("created_at", -1).limit(5)],
        "my_donations": [_serialize(item) for item in collection.find({"ngo_id": user["_id"]}).sort("updated_at", -1).limit(5)],
    }), 200
