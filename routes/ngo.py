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
            return jsonify({
                "success": False,
                "message": "MongoDB is currently unavailable."
            }), 503

        try:
            user = users_collection.find_one({
                "_id": object_id
            })

        except PyMongoError:
            return jsonify({
                "success": False,
                "message": "Unable to verify NGO account."
            }), 503

        if user is None:
            return jsonify({
                "success": False,
                "message": "User account not found."
            }), 404

        role = str(
            user.get("role", "")
        ).strip().lower()

        if role != "ngo":
            return jsonify({
                "success": False,
                "message": "NGO access required."
            }), 403

        return view(*args, **kwargs)

    return wrapped_view


# ==========================================================
# NGO PROFILE — GET
# ==========================================================

@ngo.route(
    "/api/ngo/profile",
    methods=["GET"]
)
@ngo_required
def get_ngo_profile():

    users_collection = get_collection("users")

    if users_collection is None:
        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable."
        }), 503

    try:

        user = users_collection.find_one({
            "_id": ObjectId(
                session["user_id"]
            )
        })

    except (InvalidId, TypeError):

        session.clear()

        return jsonify({
            "success": False,
            "message": "Invalid user session."
        }), 401

    except PyMongoError:

        return jsonify({
            "success": False,
            "message": "Unable to load NGO profile."
        }), 503

    if user is None:
        return jsonify({
            "success": False,
            "message": "NGO account not found."
        }), 404

    role = str(
        user.get("role", "")
    ).strip().lower()

    if role != "ngo":
        return jsonify({
            "success": False,
            "message": "NGO access required."
        }), 403

    # ======================================================
    # PROFILE DATA
    # ======================================================

    profile = {

        "id": str(
            user["_id"]
        ),

        "full_name": user.get(
            "full_name",
            ""
        ),

        "email": user.get(
            "email",
            ""
        ),

        "phone": user.get(
            "phone",
            ""
        ),

        "organization_name": user.get(
            "organization_name",
            user.get(
                "full_name",
                ""
            )
        ),

        "contact_person": user.get(
            "contact_person",
            ""
        ),

        "profile_image": user.get(
            "profile_image",
            ""
        ),

        # Address
        "address": user.get(
            "address",
            ""
        ),

        "city": user.get(
            "city",
            ""
        ),

        "state": user.get(
            "state",
            ""
        ),

        "pincode": user.get(
            "pincode",
            ""
        ),

        "service_area": user.get(
            "service_area",
            ""
        ),

        # About NGO
        "about": user.get(
            "about",
            ""
        ),

        # Verification
        "verification_status": user.get(
            "verification_status",
            "unverified"
        ),

        # Role
        "role": "ngo",
    }

    return jsonify({
        "success": True,
        "profile": profile
    }), 200


# ==========================================================
# NGO PROFILE — UPDATE
# ==========================================================

@ngo.route(
    "/api/ngo/profile",
    methods=["PUT"]
)
@ngo_required
def update_ngo_profile():

    payload = request.get_json(
        silent=True
    )

    if not isinstance(
        payload,
        dict
    ):
        return jsonify(
            success=False,
            message=(
                "A valid JSON request body "
                "is required."
            )
        ), 400

    # ======================================================
    # ALLOWED FIELDS
    # ======================================================

    allowed_fields = (
        "organization_name",
        "contact_person",
        "phone",
        "address",
        "city",
        "state",
        "pincode",
        "service_area",
        "about",
        "profile_image",
    )

    update_data = {}

    for field in allowed_fields:

        if field not in payload:
            continue

        value = payload[field]

        if value is None:
            update_data[field] = ""

        else:
            update_data[field] = str(
                value
            ).strip()[:500]

    # ======================================================
    # VALIDATION
    # ======================================================

    if (
        "organization_name"
        in update_data
        and not update_data[
            "organization_name"
        ]
    ):
        return jsonify(
            success=False,
            message=(
                "Organization name "
                "is required."
            )
        ), 400

    if (
        "pincode"
        in update_data
        and update_data["pincode"]
    ):

        pincode = update_data[
            "pincode"
        ]

        if (
            not pincode.isdigit()
            or len(pincode) != 6
        ):
            return jsonify(
                success=False,
                message=(
                    "Enter a valid "
                    "6-digit PIN code."
                )
            ), 400

    # ======================================================
    # NOTHING TO UPDATE
    # ======================================================

    if not update_data:
        return jsonify(
            success=False,
            message="No profile changes were provided."
        ), 400

    # ======================================================
    # UPDATED TIMESTAMP
    # ======================================================

    update_data[
        "ngo_profile_updated_at"
    ] = datetime.now(
        timezone.utc
    )

    users_collection = get_collection(
        "users"
    )

    if users_collection is None:
        return jsonify(
            success=False,
            message=(
                "MongoDB is currently "
                "unavailable."
            )
        ), 503

    # ======================================================
    # UPDATE
    # ======================================================

    try:

        result = users_collection.update_one(
            {
                "_id": ObjectId(
                    session["user_id"]
                )
            },
            {
                "$set": update_data
            }
        )

    except (InvalidId, TypeError):

        session.clear()

        return jsonify(
            success=False,
            message="Invalid user session."
        ), 401

    except PyMongoError:

        return jsonify(
            success=False,
            message=(
                "Unable to update "
                "NGO profile."
            )
        ), 500

    # ======================================================
    # VERIFY UPDATE
    # ======================================================

    if result.matched_count == 0:
        return jsonify(
            success=False,
            message="NGO account not found."
        ), 404

    return jsonify(
        success=True,
        message=(
            "NGO profile updated "
            "successfully."
        )
    ), 200