"""Session-based authentication API endpoints."""

from datetime import datetime, timezone

from bson import ObjectId
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
# PROVIDER ROLES
# ==========================================================

PROVIDER_ROLES = {
    "provider",
    "food_provider",
    "food provider",
    "donor",
    "restaurant",
}

# ==========================================================
# PROVIDER ID HELPER
# ==========================================================

def generate_provider_id(user_id):
    """
    Generate a unique ReServe Provider ID
    from the MongoDB user ID.
    """

    return f"RS-P-{str(user_id)[-6:].upper()}"

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

    if (
        not phone.isdigit()
        or len(phone) != 10
        or phone[0] not in "6789"
    ):
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
        
        # --------------------------------------------------
        # GENERATE PROVIDER ID
        # --------------------------------------------------

        if role in PROVIDER_ROLES:
            provider_id = generate_provider_id(
                result.inserted_id
            )

            users_collection.update_one(
                {
                    "_id": result.inserted_id
                },
                {
                    "$set": {
                        "provider_id": provider_id
                    }
                }
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

    # ======================================================
    # CREATE SESSION IMMEDIATELY AFTER SIGNUP
    # ======================================================

    session.clear()

    session["user_id"] = str(result.inserted_id)
    session["role"] = role

    # ======================================================
    # USER RESPONSE
    # ======================================================

    user = {
       "id": str(result.inserted_id),
       "name": full_name,
       "email": email,
       "phone": phone,
       "role": role,
    } 

    # ======================================================
    # ROLE-BASED REDIRECT
    # ======================================================

    redirect_url = get_redirect_url(role)

    return jsonify({
        "success": True,
        "message": "Account created successfully.",
        "user": user,
        "user_id": str(result.inserted_id),
        "role": role,
        "redirect": redirect_url,
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
    """Return the correct page according to the user's role."""

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
        return "/user-profile"

    # ------------------------------------------------------
    # FOOD PROVIDER
    # ------------------------------------------------------

    if normalized_role in PROVIDER_ROLES:
        return "/provider-profile"

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
# PROVIDER PROFILE FIELDS
# ==========================================================

PROVIDER_PROFILE_FIELDS = (
    "business_name",
    "provider_type",
    "cuisine_types",
    "other_cuisine",
    "address",
    "city",
    "state",
    "pincode",
    "serving_areas",
    "working_days",
    "about",
    "profile_images",
    "website",
    "opening_time",
    "closing_time",
)

# ==========================================================
# GET CURRENT USER
# ==========================================================

def get_current_user():
    """
    Return the currently logged-in user from MongoDB.
    """

    user_id = session.get("user_id")

    if not user_id:
        return None

    users_collection = get_collection("users")

    if users_collection is None:
        return None

    try:
        user = users_collection.find_one({
            "_id": ObjectId(user_id)
        })

        return user

    except Exception:
        return None


# ==========================================================
# GET PROVIDER PROFILE
# ==========================================================

@auth.route("/api/provider/profile", methods=["GET"])
def get_provider_profile():
    """
    Return the profile of the currently logged-in
    food provider.
    """

    # ------------------------------------------------------
    # CHECK LOGIN
    # ------------------------------------------------------

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Please log in first."
        }), 401

    # ------------------------------------------------------
    # GET USER
    # ------------------------------------------------------

    user = get_current_user()

    if user is None:
        return jsonify({
            "success": False,
            "message": "User account not found."
        }), 404

# ------------------------------------------------------
# ENSURE PROVIDER ID
# ------------------------------------------------------

    provider_id = user.get("provider_id", "")

    if not provider_id:
        provider_id = generate_provider_id(user["_id"])

    users_collection = get_collection("users")

    if users_collection is not None:
        users_collection.update_one(
            {
                "_id": user["_id"]
            },
            {
                "$set": {
                    "provider_id": provider_id
                }
            }
        )

    # ------------------------------------------------------
    # CHECK ROLE
    # ------------------------------------------------------

    role = str(
        user.get("role", "")
    ).strip().lower()

    if role not in PROVIDER_ROLES:
        return jsonify({
            "success": False,
            "message": (
                "Only food providers can access "
                "this profile."
            )
        }), 403

    # ------------------------------------------------------
    # CUISINE TYPES
    # ------------------------------------------------------

    cuisine_types = user.get(
        "cuisine_types",
        []
    )

    if not isinstance(cuisine_types, list):
        cuisine_types = []

    cuisine_types = [
        str(cuisine).strip()
        for cuisine in cuisine_types
        if str(cuisine).strip()
    ]

    # ------------------------------------------------------
    # WORKING DAYS
    # ------------------------------------------------------

    working_days = user.get(
        "working_days",
        []
    )

    if not isinstance(working_days, list):
        working_days = []

    working_days = [
        str(day).strip()
        for day in working_days
        if str(day).strip()
    ]

    # ------------------------------------------------------
    # PROFILE IMAGES
    # ------------------------------------------------------

    profile_images = user.get(
        "profile_images",
        []
    )

     # IMPORTANT:
     # Existing old data may have been stored as a string.
     # Convert it into an array so the new frontend
     # always receives an array.

    if isinstance(profile_images, str):
        profile_images = (
            [profile_images]
            if profile_images.strip()
            else []
        )

    if not isinstance(profile_images, list):
        profile_images = []

    # ------------------------------------------------------
    # PROFILE RESPONSE
    # ------------------------------------------------------

    profile = {
        "id": str(user["_id"]),

        # ==================================================
        # ACCOUNT INFORMATION
        # ==================================================

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

        "role": role,

        # ==================================================
        # PROVIDER ID
        # ==================================================

        "provider_id": provider_id,

        # ==================================================
        # BUSINESS INFORMATION
        # ==================================================

        "business_name": user.get(
            "business_name",
            ""
        ),

        "provider_type": user.get(
            "provider_type",
            ""
        ),

        # ==================================================
        # CUISINE
        # ==================================================

        "cuisine_types": cuisine_types,

        "other_cuisine": user.get(
            "other_cuisine",
            ""
        ),

        # ==================================================
        # ADDRESS
        # ==================================================

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

        "serving_areas": user.get(
            "serving_areas",
            ""
        ),

        # ==================================================
        # PROVIDER DETAILS
        # ==================================================

        "about": user.get(
            "about",
            ""
        ),

        "website": user.get(
            "website",
            ""
        ),

        # ==================================================
        # BUSINESS TIMINGS
        # ==================================================

        "working_days": working_days,

        "opening_time": user.get(
            "opening_time",
            ""
        ),

        "closing_time": user.get(
            "closing_time",
            ""
        ),

        # ==================================================
        # BUSINESS IMAGES
        # ==================================================

        "profile_images": profile_images,
        "created_at": user.get("created_at"),
    }

    return jsonify({
        "success": True,
        "profile": profile,
    }), 200

# ==========================================================
# UPDATE PROVIDER PROFILE
# ==========================================================

@auth.route("/api/provider/profile", methods=["PUT"])
def update_provider_profile():
    """
    Update the profile of the currently logged-in
    food provider.
    """

    # ------------------------------------------------------
    # CHECK LOGIN
    # ------------------------------------------------------

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Please log in first."
        }), 401

    # ------------------------------------------------------
    # GET USER
    # ------------------------------------------------------

    user = get_current_user()

    if user is None:
        return jsonify({
            "success": False,
            "message": "User account not found."
        }), 404

    # ------------------------------------------------------
    # CHECK ROLE
    # ------------------------------------------------------

    role = str(
        user.get("role", "")
    ).strip().lower()

    if role not in PROVIDER_ROLES:
        return jsonify({
            "success": False,
            "message": (
                "Only food providers can update "
                "this profile."
            )
        }), 403

    # ------------------------------------------------------
    # GET REQUEST DATA
    # ------------------------------------------------------

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "message": (
                "A valid JSON request body is required."
            )
        }), 400

    # ------------------------------------------------------
    # REQUIRED PROVIDER FIELDS
    # ------------------------------------------------------

    required_fields = (
        "business_name",
        "provider_type",
        "address",
        "city",
        "state",
        "pincode",
        "about",
    )

    missing_fields = _missing_fields(
        payload,
        required_fields
    )

    if missing_fields:
        return jsonify({
            "success": False,
            "message": (
                "Please complete all required "
                "profile fields."
            ),
            "missing_fields": missing_fields,
        }), 400

    # ======================================================
    # CLEAN BASIC VALUES
    # ======================================================

    business_name = str(
        payload["business_name"]
    ).strip()

    provider_type = str(
        payload["provider_type"]
    ).strip()

    address = str(
        payload["address"]
    ).strip()

    city = str(
        payload["city"]
    ).strip()

    state = str(
        payload["state"]
    ).strip()

    pincode = str(
        payload["pincode"]
    ).strip()

    about = str(
        payload["about"]
    ).strip()

    website = str(
        payload.get("website", "")
    ).strip()

    serving_areas = str(
        payload.get("serving_areas", "")
    ).strip()

    opening_time = str(
        payload.get("opening_time", "")
    ).strip()

    closing_time = str(
        payload.get("closing_time", "")
    ).strip()

    other_cuisine = str(
        payload.get("other_cuisine", "")
    ).strip()

    # ======================================================
    # PINCODE VALIDATION
    # ======================================================

    if (
        not pincode.isdigit()
        or len(pincode) != 6
    ):
        return jsonify({
            "success": False,
            "message": (
                "Enter a valid 6-digit PIN code."
            )
        }), 400

    # ======================================================
    # PROVIDER TYPE
    # ======================================================

    if provider_type == "":
        return jsonify({
            "success": False,
            "message": "Please select a provider type."
        }), 400

    # ======================================================
    # CUISINE TYPES
    # ======================================================

    cuisine_types = payload.get(
        "cuisine_types",
        []
    )

    if not isinstance(
        cuisine_types,
        list
    ):
        return jsonify({
            "success": False,
            "message": (
                "Invalid cuisine type selection."
            )
        }), 400

    cuisine_types = [
        str(cuisine).strip()
        for cuisine in cuisine_types
        if str(cuisine).strip()
    ]

    # ------------------------------------------------------
    # AT LEAST ONE CUISINE
    # ------------------------------------------------------

    if not cuisine_types:
        return jsonify({
            "success": False,
            "message": (
                "Please select at least one cuisine type."
            )
        }), 400

    # ------------------------------------------------------
    # OTHER CUISINE
    # ------------------------------------------------------

    if "other" in cuisine_types:

        if not other_cuisine:
            return jsonify({
                "success": False,
                "message": (
                    "Please specify your other cuisine."
                ),
                "missing_fields": [
                    "other_cuisine"
                ],
            }), 400

    else:
        # No Other selected → don't keep stale value
        other_cuisine = ""

    # ======================================================
    # WORKING DAYS
    # ======================================================

    working_days = payload.get(
        "working_days",
        []
    )

    if not isinstance(
        working_days,
        list
    ):
        return jsonify({
            "success": False,
            "message": (
                "Invalid working days selection."
            )
        }), 400

    working_days = [
        str(day).strip()
        for day in working_days
        if str(day).strip()
    ]

    # ------------------------------------------------------
    # AT LEAST ONE WORKING DAY
    # ------------------------------------------------------

    if not working_days:
        return jsonify({
            "success": False,
            "message": (
                "Please select at least one working day."
            ),
            "missing_fields": [
                "working_days"
            ],
        }), 400

    # ======================================================
    # PROFILE IMAGES
    # ======================================================

    profile_images = payload.get(
        "profile_images",
        []
    )

    if profile_images is None:
        profile_images = []

    if not isinstance(
        profile_images,
        list
    ):
        return jsonify({
            "success": False,
            "message": (
                "Invalid profile image data."
            )
        }), 400

    profile_images = [
        str(image).strip()
        for image in profile_images
        if str(image).strip()
    ]

    # ------------------------------------------------------
    # MAXIMUM 5 IMAGES
    # ------------------------------------------------------

    if len(profile_images) > 5:
        return jsonify({
            "success": False,
            "message": (
                "You can upload a maximum of 5 images."
            )
        }), 400

    # ======================================================
    # UPDATE DOCUMENT
    # ======================================================

    update_data = {

        # --------------------------------------------------
        # BUSINESS INFORMATION
        # --------------------------------------------------

        "business_name":
            business_name,

        "provider_type":
            provider_type,

        # --------------------------------------------------
        # CUISINE
        # --------------------------------------------------

        "cuisine_types":
            cuisine_types,

        "other_cuisine":
            other_cuisine,

        # --------------------------------------------------
        # ADDRESS
        # --------------------------------------------------

        "address":
            address,

        "city":
            city,

        "state":
            state,

        "pincode":
            pincode,

        "serving_areas":
            serving_areas,

        # --------------------------------------------------
        # PROVIDER DETAILS
        # --------------------------------------------------

        "about":
            about,

        "website":
            website,

        # --------------------------------------------------
        # BUSINESS TIMINGS
        # --------------------------------------------------

        "working_days":
            working_days,

        "opening_time":
            opening_time,

        "closing_time":
            closing_time,

        # --------------------------------------------------
        # BUSINESS IMAGES
        # --------------------------------------------------

        "profile_images":
            profile_images,

        # --------------------------------------------------
        # TIMESTAMP
        # --------------------------------------------------

        "profile_updated_at":
            datetime.now(timezone.utc),
    }

    # ======================================================
    # DATABASE
    # ======================================================

    users_collection = get_collection(
        "users"
    )

    if users_collection is None:
        return jsonify({
            "success": False,
            "message": (
                "MongoDB is currently unavailable. "
                "Please try again later."
            )
        }), 500

    # ======================================================
    # UPDATE DATABASE
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

    except PyMongoError:
        return jsonify({
            "success": False,
            "message": (
                "Unable to update your profile. "
                "Please try again later."
            )
        }), 500

    except Exception:
        return jsonify({
            "success": False,
            "message": (
                "Unable to update your profile."
            )
        }), 500

    # ======================================================
    # CHECK UPDATE
    # ======================================================

    if result.matched_count == 0:
        return jsonify({
            "success": False,
            "message": "User account not found."
        }), 404

    # ======================================================
    # SUCCESS
    # ======================================================

    return jsonify({
        "success": True,
        "message": (
            "Provider profile updated successfully."
        ),
    }), 200

# ==========================================================
# GET USER PROFILE
# ==========================================================

@auth.route("/api/user/profile", methods=["GET"])
def get_user_profile():

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Please log in first."
        }), 401

    user = get_current_user()

    if user is None:
        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    profile = {
        "id": f"RSV-{str(user['_id'])[-6:].upper()}",
        "full_name": user.get("full_name", ""),
        "email": user.get("email", ""),
        "phone": user.get("phone", ""),
        "address": user.get("address", ""),
        "city": user.get("city", ""),
        "state": user.get("state", ""),
        "pincode": user.get("pincode", ""),
        "pickup_area": user.get("pickup_area", ""),
        "profile_image": user.get("profile_image", ""),
        "created_at": (
            user.get("created_at").isoformat()
            if user.get("created_at")
            else None
        )
    }

    return jsonify({
        "success": True,
        "profile": profile
    }), 200

# ==========================================================
# UPDATE USER PROFILE
# ==========================================================

@auth.route("/api/user/profile", methods=["PUT"])
def update_user_profile():

    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Please log in first."
        }), 401

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "message": "Valid JSON required."
        }), 400

    required_fields = (
        "full_name",
        "address",
        "city",
        "state",
        "pincode",
    )

    missing_fields = _missing_fields(
        payload,
        required_fields
    )

    if missing_fields:
        return jsonify({
            "success": False,
            "message": "Please complete all required fields.",
            "missing_fields": missing_fields
        }), 400

    pincode = str(payload["pincode"]).strip()

    if not pincode.isdigit() or len(pincode) != 6:
        return jsonify({
            "success": False,
            "message": "Enter a valid 6-digit pincode."
        }), 400

    update_data = {
        "full_name": payload["full_name"].strip(),
        "address": payload["address"].strip(),
        "city": payload["city"].strip(),
        "state": payload["state"].strip(),
        "pincode": pincode,
        "pickup_area": payload.get(
            "pickup_area",
            ""
        ).strip(),
        "profile_updated_at": datetime.now(timezone.utc)
    }

    if payload.get("profile_image"):
        update_data["profile_image"] = payload["profile_image"]

    try:

        users_collection = get_collection("users")

        users_collection.update_one(
            {
                "_id": ObjectId(session["user_id"])
            },
            {
                "$set": update_data
            }
        )

    except PyMongoError:
        return jsonify({
            "success": False,
            "message": "Unable to update profile."
        }), 500

    return jsonify({
        "success": True,
        "message": "Profile updated successfully."
    }), 200

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