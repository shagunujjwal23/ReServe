from functools import wraps
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, jsonify, request, session
from pymongo.errors import PyMongoError

from config.database import get_collection


# ==========================================================
# BLUEPRINT
# ==========================================================

ngo = Blueprint("ngo", __name__)


# ==========================================================
# NGO LOGIN / ROLE CHECK
# ==========================================================

def ngo_required(view):
    """
    Allow access only to logged-in NGO users.
    """

    @wraps(view)
    def wrapped_view(*args, **kwargs):

        user_id = session.get("user_id")
        if not user_id:
            return jsonify({
                "success": False,
                "message": "Please log in first."
            }), 401

        try:
            object_id = ObjectId(user_id)

        except (InvalidId, TypeError):
            session.clear()

            return jsonify({
                "success": False,
                "message": "Invalid session."
            }), 401

        users_collection = get_collection("users")
        if users_collection is None:
            return jsonify({"success": False, "message": "MongoDB is currently unavailable."}), 503
        user = users_collection.find_one({"_id": object_id})
        if not user or str(user.get("role", "")).strip().lower() != "ngo":
            return jsonify({"success": False, "message": "NGO access required."}), 403

        return view(*args, **kwargs)

    return wrapped_view


# ==========================================================
# NGO PROFILE
# ==========================================================

@ngo.route("/api/ngo/profile", methods=["GET"])
@ngo_required
def get_ngo_profile():

    users_collection = get_collection("users")

    if users_collection is None:
        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable."
        }), 500

    try:

        user = users_collection.find_one({
            "_id": ObjectId(session["user_id"]),
            "role": "ngo"
        })

    except PyMongoError:

        return jsonify({
            "success": False,
            "message": "Unable to load NGO profile."
        }), 500

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    if user is None:
        return jsonify({
            "success": False,
            "message": "NGO account not found."
        }), 404

    profile = {
        "id": str(user["_id"]),
        "full_name": user.get("full_name", ""),
        "email": user.get("email", ""),
        "phone": user.get("phone", ""),
        "organization_name": user.get(
            "organization_name",
            user.get("full_name", "")
        ),
        "contact_person": user.get("contact_person", ""),
        "profile_image": user.get(
            "profile_image",
            ""
        ),
        "address": user.get("address", ""),
        "city": user.get("city", ""),
        "state": user.get("state", ""),
        "pincode": user.get("pincode", ""),
        "service_area": user.get("service_area", ""),
        "about": user.get("about", ""),
        "verification_status": user.get("verification_status", "unverified"),
    }

    return jsonify({
        "success": True,
        "profile": profile
    }), 200


@ngo.route("/api/ngo/profile", methods=["PUT"])
@ngo_required
def update_ngo_profile():
    """Store NGO-specific identity data on the existing users document."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(success=False, message="A valid JSON request body is required."), 400
    allowed = (
        "organization_name", "contact_person", "phone", "address", "city",
        "state", "pincode", "service_area", "about", "profile_image",
    )
    update_data = {}
    for field in allowed:
        if field in payload:
            value = payload[field]
            update_data[field] = str(value).strip()[:500] if value is not None else ""
    if "organization_name" in update_data and not update_data["organization_name"]:
        return jsonify(success=False, message="Organization name is required."), 400
    if "pincode" in update_data and update_data["pincode"] and (
        not update_data["pincode"].isdigit() or len(update_data["pincode"]) != 6
    ):
        return jsonify(success=False, message="Enter a valid 6-digit PIN code."), 400
    update_data["ngo_profile_updated_at"] = datetime.now(timezone.utc)
    users_collection = get_collection("users")
    try:
        users_collection.update_one(
            {"_id": ObjectId(session["user_id"]), "role": "ngo"},
            {"$set": update_data},
        )
    except (PyMongoError, InvalidId, TypeError):
        return jsonify(success=False, message="Unable to update NGO profile."), 500
    return jsonify(success=True, message="NGO profile updated successfully."), 200
