"""Session-based authentication API endpoints."""

from datetime import datetime, timezone

from flask import Blueprint, jsonify, redirect, request, session, url_for
from pymongo.errors import DuplicateKeyError, PyMongoError
from werkzeug.security import check_password_hash, generate_password_hash

from config.database import get_collection


auth = Blueprint("auth", __name__)

SIGNUP_REQUIRED_FIELDS = ("full_name", "email", "password", "role")


def _missing_fields(payload: dict, fields: tuple[str, ...]) -> list[str]:
    """Return required fields that are absent, null, or blank strings."""
    return [
        field for field in fields
        if field not in payload
        or payload[field] is None
        or (isinstance(payload[field], str) and not payload[field].strip())
    ]


@auth.route("/api/signup", methods=["POST"])
def signup():
    """Register a new user with a securely hashed password."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "message": "A valid JSON request body is required."
        }), 400

    missing_fields = _missing_fields(payload, SIGNUP_REQUIRED_FIELDS)
    if missing_fields:
        return jsonify({
            "success": False,
            "message": "Required fields are missing.",
            "missing_fields": missing_fields,
        }), 400

    users_collection = get_collection("users")
    if users_collection is None:
        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable. Please try again later."
        }), 500

    email = payload["email"].strip().lower()
    try:
        if users_collection.find_one({"email": email}) is not None:
            return jsonify({
                "success": False,
                "message": "An account with this email already exists."
            }), 409

        user_document = {
            "full_name": payload["full_name"].strip(),
            "email": email,
            "password": generate_password_hash(payload["password"]),
            "role": payload["role"].strip(),
            "created_at": datetime.now(timezone.utc),
        }
        result = users_collection.insert_one(user_document)
    except DuplicateKeyError:
        return jsonify({
            "success": False,
            "message": "An account with this email already exists."
        }), 409
    except PyMongoError:
        return jsonify({
            "success": False,
            "message": "Unable to create the account. Please try again later."
        }), 500

    return jsonify({
        "success": True,
        "message": "Account created successfully.",
        "user_id": str(result.inserted_id),
    }), 201


@auth.route("/api/login", methods=["POST"])
def login():
    """Authenticate a user and store their identifier in the Flask session."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "message": "A valid JSON request body is required."
        }), 400

    missing_fields = _missing_fields(payload, ("email", "password"))
    if missing_fields:
        return jsonify({
            "success": False,
            "message": "Email and password are required.",
            "missing_fields": missing_fields,
        }), 400

    users_collection = get_collection("users")
    if users_collection is None:
        return jsonify({
            "success": False,
            "message": "MongoDB is currently unavailable. Please try again later."
        }), 500

    try:
        user = users_collection.find_one({"email": payload["email"].strip().lower()})
    except PyMongoError:
        return jsonify({
            "success": False,
            "message": "Unable to process login. Please try again later."
        }), 500

    if user is None or not check_password_hash(user["password"], payload["password"]):
        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401

    session.clear()
    session["user_id"] = str(user["_id"])

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "redirect": url_for("dashboard"),
    }), 200


@auth.route("/logout", methods=["GET"])
def logout():
    """Clear the current session and return the user to the login page."""
    session.clear()
    return redirect(url_for("login"))
