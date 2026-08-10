"""Session-based authentication API endpoints."""

from datetime import datetime, timezone

from flask import Blueprint, jsonify, redirect, request, session, url_for
from pymongo.errors import DuplicateKeyError, PyMongoError
from werkzeug.security import check_password_hash, generate_password_hash

from config.database import get_collection


# ==========================================================
# BLUEPRINT
# ==========================================================

auth = Blueprint("auth", __name__)


# ==========================================================
# SIGNUP REQUIRED FIELDS
# ==========================================================

SIGNUP_REQUIRED_FIELDS = (
    "full_name",
    "email",
    "phone",
    "password",
    "role",
)


# ==========================================================
# MISSING FIELDS HELPER
# ==========================================================

def _missing_fields(
    payload: dict,
    fields: tuple[str, ...]
) -> list[str]:
    """Return required fields that are absent, null, or blank."""

    return [
        field
        for field in fields
        if field not in payload
        or payload[field] is None
        or (
            isinstance(payload[field], str)
            and not payload[field].strip()
        )
    ]


# ==========================================================
# SIGNUP
# ==========================================================

@auth.route("/api/signup", methods=["POST"])
def signup():
    """Register a new user with a securely hashed password."""

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "message": "A valid JSON request body is required."
        }), 400

    # ------------------------------------------------------
    # REQUIRED FIELDS
    # ------------------------------------------------------

    missing_fields = _missing_fields(
        payload,
        SIGNUP_REQUIRED_FIELDS
    )

    if missing_fields:
        return jsonify({
            "success": False,
            "message": "Required fields are missing.",
            "missing_fields": missing_fields,
        }), 400

    # ------------------------------------------------------
    # DATABASE
    # ------------------------------------------------------

    users_collection = get_collection("users")

    if users_collection is None:
        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable. "
                "Please try again later."
            )
        }), 500

    # ------------------------------------------------------
    # CLEAN VALUES
    # ------------------------------------------------------

    full_name = payload["full_name"].strip()
    email = payload["email"].strip().lower()
    phone = payload["phone"].strip()
    password = payload["password"]
    role = payload["role"].strip().lower()

    # ------------------------------------------------------
    # PHONE VALIDATION
    # ------------------------------------------------------

    if not phone.isdigit() or len(phone) != 10 or phone[0] not in "6789":
        return jsonify({
            "success": False,
            "message": "Enter a valid 10-digit phone number."
        }), 400

    # ------------------------------------------------------
    # ALLOWED ROLES
    # ------------------------------------------------------

    allowed_roles = {
        "user",
        "individual",
        "provider",
        "food_provider",
        "ngo",
        "admin",
    }

    if role not in allowed_roles:
        return jsonify({
            "success": False,
            "message": "Invalid user role selected."
        }), 400

    # ------------------------------------------------------
    # CREATE USER
    # ------------------------------------------------------

    try:

        existing_user = users_collection.find_one({
            "email": email
        })

        if existing_user is not None:
            return jsonify({
                "success": False,
                "message": (
                    "An account with this email "
                    "already exists."
                )
            }), 409

        # --------------------------------------------------
        # USER DOCUMENT
        # --------------------------------------------------

        user_document = {
            "full_name": full_name,
            "email": email,
            "phone": phone,

            # Secure password hash
            "password": generate_password_hash(password),

            # Selected role
            "role": role,

            "created_at": datetime.now(timezone.utc),
        }

        result = users_collection.insert_one(
            user_document
        )

    except DuplicateKeyError:
        return jsonify({
            "success": False,
            "message": (
                "An account with this email "
                "already exists."
            )
        }), 409

    except PyMongoError:
        return jsonify({
            "success": False,
            "message": (
                "Unable to create the account. "
                "Please try again later."
            )
        }), 500

    # ------------------------------------------------------
    # USER RESPONSE
    # ------------------------------------------------------

    user = {
        "id": str(result.inserted_id),
        "name": full_name,
        "email": email,
        "phone": phone,
        "role": role,
    }

    return jsonify({
        "success": True,
        "message": "Account created successfully.",
        "user": user,
        "user_id": str(result.inserted_id),
    }), 201


# ==========================================================
# LOGIN
# ==========================================================

@auth.route("/api/login", methods=["POST"])
def login():
    """
    Authenticate a user and store their information
    in the Flask session.
    """

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "message": "A valid JSON request body is required."
        }), 400

    # ------------------------------------------------------
    # REQUIRED FIELDS
    # ------------------------------------------------------

    missing_fields = _missing_fields(
        payload,
        ("email", "password")
    )

    if missing_fields:
        return jsonify({
            "success": False,
            "message": "Email and password are required.",
            "missing_fields": missing_fields,
        }), 400

    # ------------------------------------------------------
    # DATABASE
    # ------------------------------------------------------

    users_collection = get_collection("users")

    if users_collection is None:
        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable. "
                "Please try again later."
            )
        }), 500

    email = payload["email"].strip().lower()
    password = payload["password"]

    # ------------------------------------------------------
    # FIND USER
    # ------------------------------------------------------

    try:

        user = users_collection.find_one({
            "email": email
        })

    except PyMongoError:
        return jsonify({
            "success": False,
            "message": (
                "Unable to process login. "
                "Please try again later."
            )
        }), 500

    # ------------------------------------------------------
    # VERIFY PASSWORD
    # ------------------------------------------------------

    if (
        user is None
        or not check_password_hash(
            user["password"],
            password
        )
    ):
        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401

    # ------------------------------------------------------
    # GET ROLE
    # ------------------------------------------------------

    role = str(
        user.get("role", "user")
    ).strip().lower()

    # ------------------------------------------------------
    # CREATE SESSION
    # ------------------------------------------------------

    session.clear()

    session["user_id"] = str(user["_id"])
    session["role"] = role

    # ------------------------------------------------------
    # USER DATA
    # ------------------------------------------------------

    user_data = {
        "id": str(user["_id"]),
        "name": user.get(
            "full_name",
            user.get("name", "User")
        ),
        "email": user.get("email", email),
        "phone": user.get("phone", ""),
        "role": role,
    }

    # ------------------------------------------------------
    # ROLE-BASED REDIRECT
    # ------------------------------------------------------

    redirect_url = get_redirect_url(role)

    # ------------------------------------------------------
    # RESPONSE
    # ------------------------------------------------------

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "user": user_data,
        "role": role,
        "redirect": redirect_url,
    }), 200


# ==========================================================
# ROLE REDIRECT HELPER
# ==========================================================

def get_redirect_url(role):
    """Return dashboard URL according to the user's role."""

    normalized_role = str(
        role or "user"
    ).strip().lower()

    # ------------------------------------------------------
    # INDIVIDUAL USER
    # ------------------------------------------------------

    if normalized_role in {
        "user",
        "individual",
    }:
        return "/user-dashboard"

    # ------------------------------------------------------
    # FOOD PROVIDER
    # ------------------------------------------------------

    if normalized_role in {
        "provider",
        "food_provider",
        "food provider",
        "donor",
        "restaurant",
    }:
        return "/dashboard"

    # ------------------------------------------------------
    # NGO
    # ------------------------------------------------------

    if normalized_role == "ngo":
        return "/ngo-dashboard"

    # ------------------------------------------------------
    # ADMIN
    # ------------------------------------------------------

    if normalized_role == "admin":
        return "/dashboard"

    # ------------------------------------------------------
    # FALLBACK
    # ------------------------------------------------------

    return "/user-dashboard"


# ==========================================================
# LOGOUT
# ==========================================================

@auth.route("/logout", methods=["GET"])
def logout():
    """Clear the current session and return to login."""

    session.clear()

    return redirect(
        url_for("login")
    )