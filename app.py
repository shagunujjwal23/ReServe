import os
from functools import wraps

from bson import ObjectId
from bson.errors import InvalidId
from flask import Flask, abort, redirect, render_template, session, url_for
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo.errors import PyMongoError

from config.database import get_collection, init_mongo
from routes.auth import auth
from routes.listings import listings
from routes.upload import upload
from routes.orders import orders
from routes.ngo import ngo
from routes.donations import donations

app = Flask(__name__)
load_dotenv()
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "development-only-secret-key-change-me")
CORS(app)
init_mongo(app)
app.register_blueprint(auth)
app.register_blueprint(listings)
app.register_blueprint(upload)
app.register_blueprint(orders)
app.register_blueprint(ngo)
app.register_blueprint(donations)

def login_required(view):
    """Redirect anonymous or malformed sessions to the login page."""
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        try:
            ObjectId(session.get("user_id", ""))
        except (InvalidId, TypeError):
            session.clear()
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped_view

# -----------------------------
# HOME
# -----------------------------
@app.route("/")
def home():
    return render_template("index.html")


# -----------------------------
# LOGIN
# -----------------------------
@app.route("/login")
def login():
    return render_template("login.html")


# -----------------------------
# SIGNUP
# -----------------------------
@app.route("/signup")
def signup():
    return render_template("signup.html")

# -----------------------------
# FORGET PASSWORD
# -----------------------------
@app.route("/forgot-password")
def forgotpassword():
    return render_template("forgot-password.html")

# -----------------------------
# RESET PASSWORD
# -----------------------------

@app.route("/reset-password")
def resetpassword():
    return render_template("reset-password.html")

# ==========================================================
# PROVIDER PROFILE
# ==========================================================

@app.route("/provider-profile")
@login_required
def provider_profile():
    """Render the profile page for food providers."""

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)
    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:
        user_record = users_collection.find_one({
            "_id": user_id
        })
    except PyMongoError:
        abort(503)

    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    # ------------------------------------------------------
    # CHECK PROVIDER ROLE
    # ------------------------------------------------------

    role = str(
        user_record.get("role", "")
    ).strip().lower()

    if role not in {
        "provider",
        "food_provider",
        "food provider",
        "donor",
        "restaurant",
    }:
        return redirect(url_for("home"))

    # ------------------------------------------------------
    # USER DATA
    # ------------------------------------------------------

    user = {
        "id": str(user_record["_id"]),
        "name": user_record.get("full_name", ""),
        "email": user_record.get("email", ""),
        "phone": user_record.get("phone", ""),
        "role": role,

        # Provider information
        "business_name": user_record.get(
            "business_name", ""
        ),

        "provider_type": user_record.get(
            "provider_type", ""
        ),

        # Address
        "address": user_record.get(
            "address", ""
        ),

        "city": user_record.get(
            "city", ""
        ),

        "state": user_record.get(
            "state", ""
        ),

        "pincode": user_record.get(
            "pincode", ""
        ),

        # About
        "about": user_record.get(
            "about", ""
        ),

        # Image
        "profile_image": user_record.get(
            "profile_image", ""
        ),

        # Optional
        "website": user_record.get(
            "website", ""
        ),

        "opening_time": user_record.get(
            "opening_time", ""
        ),

        "closing_time": user_record.get(
            "closing_time", ""
        ),
    }

    return render_template(
        "provider-profile.html",
        user=user,
    )

# -----------------------------
# DASHBOARD
# -----------------------------

@app.route('/dashboard')
@login_required
def dashboard():
    """Render the dashboard for the currently authenticated user."""
    session_user_id = session.get("user_id")
    if not session_user_id:
        return redirect(url_for("login"))

    try:
        user_id = ObjectId(session_user_id)
    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")
    if users_collection is None:
        abort(503)

    try:
        user_record = users_collection.find_one({"_id": user_id})
    except PyMongoError:
        abort(503)
    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    user = {
        "name": user_record["full_name"],
        "role": user_record["role"]
    }

    return render_template(
        "dashboard.html",
        user=user
    )

@app.route("/add-listings")
@login_required
def addlistings():
    return render_template("add-listings.html")

# -----------------------------
# MY LISTINGS
# -----------------------------

@app.route("/my-listings")
@login_required
def mylistings():

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)
    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:
        user_record = users_collection.find_one({"_id": user_id})
    except PyMongoError:
        abort(503)

    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    user = {
        "name": user_record["full_name"],
        "role": user_record["role"],
    }

    return render_template(
        "my-listings.html",
        user=user,
    )

# ==========================================================
# VIEW LISTING
# ==========================================================

@app.route("/view-listing")
@login_required
def viewlisting():

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:
        user_record = users_collection.find_one({
            "_id": user_id
        })

    except PyMongoError:
        abort(503)

    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    user = {
        "name": user_record["full_name"],
        "role": user_record["role"],
    }

    return render_template(
        "view-listing.html",
        user=user,
    )

# -----------------------------
# INDIVIDUAL USER DASHBOARD
# -----------------------------

@app.route("/user-dashboard")
@login_required
def user_dashboard():
    """Render the dashboard for individual users."""

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)
    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:
        user_record = users_collection.find_one({
            "_id": user_id
        })
    except PyMongoError:
        abort(503)

    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    user = {
        "name": user_record["full_name"],
        "role": user_record["role"],
    }

    return render_template(
        "user-dashboard.html",
        user=user
    )

# ==========================================================
# INDIVIDUAL USER LISTING DETAILS
# ==========================================================

@app.route("/listing/<listing_id>")
@login_required
def listing_details(listing_id):
    """Render the public listing details page."""

    return render_template(
        "listing-details.html",
        listing_id=listing_id
    )

# ==========================================================
# DONOR PROFILE
# ==========================================================

@app.route("/donor-profile")
@login_required
def donor_profile():
    """Render the profile page for food donors."""

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)
    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:
        user_record = users_collection.find_one({
            "_id": user_id
        })
    except PyMongoError:
        abort(503)

    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    # ------------------------------------------------------
    # CHECK DONOR / PROVIDER ROLE
    # ------------------------------------------------------

    role = str(
        user_record.get("role", "")
    ).strip().lower()

    if role not in {
        "provider",
        "food_provider",
        "food provider",
        "donor",
        "restaurant",
    }:
        return redirect(url_for("home"))

    # ------------------------------------------------------
    # USER DATA
    # ------------------------------------------------------

    user = {
        "id": str(user_record["_id"]),
        "name": user_record.get("full_name", ""),
        "email": user_record.get("email", ""),
        "phone": user_record.get("phone", ""),
        "role": role,

        # Provider / Donor information
        "business_name": user_record.get(
            "business_name", ""
        ),

        "provider_type": user_record.get(
            "provider_type", ""
        ),

        "provider_id": user_record.get(
            "provider_id", ""
        ),

        # Address
        "address": user_record.get(
            "address", ""
        ),

        "city": user_record.get(
            "city", ""
        ),

        "state": user_record.get(
            "state", ""
        ),

        "pincode": user_record.get(
            "pincode", ""
        ),

        # About
        "about": user_record.get(
            "about", ""
        ),

        # Profile image
        "profile_image": user_record.get(
            "profile_image", ""
        ),

        # Optional
        "website": user_record.get(
            "website", ""
        ),

        "opening_time": user_record.get(
            "opening_time", ""
        ),

        "closing_time": user_record.get(
            "closing_time", ""
        ),
    }

    return render_template(
        "donor-profile.html",
        user=user,
    )

@app.route("/user-profile")
@login_required
def user_profile():

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)
    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:
        user_record = users_collection.find_one({
            "_id": user_id
        })
    except PyMongoError:
        abort(503)

    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    created_at = user_record.get("created_at")

    member_since = ""

    if created_at:
        member_since = created_at.strftime("%d %b %Y")

    user = {
        "id": f"RSV-{str(user_record['_id'])[-6:].upper()}",
        "member_since": member_since,
        "name": user_record.get("full_name", ""),
        "email": user_record.get("email", ""),
        "phone": user_record.get("phone", ""),
        "profile_image": user_record.get("profile_image", ""),
        "address": user_record.get("address", ""),
        "city": user_record.get("city", ""),
        "state": user_record.get("state", ""),
        "pincode": user_record.get("pincode", ""),
        "pickup_area": user_record.get("pickup_area", "")
    }

    return render_template(
        "user-profile.html",
        user=user
    )

# ==========================================================
# USER VIEW PROFILE
# ==========================================================

@app.route("/user-view-profile")
@login_required
def user_view_profile():

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:
        user_record = users_collection.find_one({
            "_id": user_id
        })

    except PyMongoError:
        abort(503)

    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    created_at = user_record.get("created_at")

    member_since = ""

    if created_at:
        member_since = created_at.strftime("%d %b %Y")

    user = {
        "id": f"RSV-{str(user_record['_id'])[-6:].upper()}",
        "member_since": member_since,

        "full_name": user_record.get(
            "full_name",
            ""
        ),

        "email": user_record.get(
            "email",
            ""
        ),

        "phone": user_record.get(
            "phone",
            ""
        ),

        "profile_image": user_record.get(
            "profile_image",
            ""
        ),

        "address": user_record.get(
            "address",
            ""
        ),

        "city": user_record.get(
            "city",
            ""
        ),

        "state": user_record.get(
            "state",
            ""
        ),

        "pincode": user_record.get(
            "pincode",
            ""
        ),

        "pickup_area": user_record.get(
            "pickup_area",
            ""
        ),
    }

    return render_template(
        "user-view-profile.html",
        user=user
    )

# ==========================================================
# USER MARKETPLACE
# ==========================================================

@app.route("/marketplace")
@login_required
def marketplace():

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:
        user_record = users_collection.find_one({
            "_id": user_id
        })

    except PyMongoError:
        abort(503)

    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    user = {
        "name": user_record.get("full_name", ""),
        "role": user_record.get("role", ""),
        "profile_image": user_record.get("profile_image", "")
    }

    return render_template(
        "marketplace.html",
        user=user
    )

@app.route("/requests")
@login_required
def requests_page():

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:
        user_record = users_collection.find_one({
            "_id": user_id
        })

    except PyMongoError:
        abort(503)

    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    user = {
        "name": user_record.get("full_name", ""),
        "role": user_record.get("role", ""),
        "business_name": user_record.get(
            "business_name", ""
        )
    }

    return render_template(
        "requests.html",
        user=user
    )

@app.route("/place-order/<listing_id>")
@login_required
def place_order(listing_id):

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)
    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")
    listings_collection = get_collection("food_listings")

    try:
        user_record = users_collection.find_one(
            {"_id": user_id}
        )

        listing = listings_collection.find_one(
            {"_id": ObjectId(listing_id)}
        )

    except (InvalidId, TypeError):
        abort(404)
    except PyMongoError:
        abort(503)

    if not user_record or not listing:
        abort(404)

    user = {
        "id": str(user_record["_id"]),
        "name": user_record.get("full_name", ""),
        "email": user_record.get("email", ""),
        "phone": user_record.get("phone", "")
    }

    return render_template(
        "place-order.html",
        user=user,
        listing_id=listing_id
    )

# ==========================================================
# NGO DASHBOARD
# ==========================================================

@app.route("/ngo-dashboard")
@login_required
def ngo_dashboard():

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:

        user_record = users_collection.find_one({
            "_id": user_id
        })

    except PyMongoError:
        abort(503)

    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    # ------------------------------------------------------
    # CHECK NGO ROLE
    # ------------------------------------------------------

    role = str(
        user_record.get("role", "")
    ).strip().lower()

    if role != "ngo":
        return redirect(url_for("home"))

    # ------------------------------------------------------
    # USER DATA
    # ------------------------------------------------------

    user = {
        "id": str(user_record["_id"]),

        "name": user_record.get(
            "full_name",
            ""
        ),

        "email": user_record.get(
            "email",
            ""
        ),

        "phone": user_record.get(
            "phone",
            ""
        ),

        "role": role,

        "organization_name": user_record.get(
            "organization_name",
            user_record.get(
                "full_name",
                "NGO"
            )
        ),

        "profile_image": user_record.get(
            "profile_image",
            ""
        ),
    }

    return render_template(
        "ngo-dashboard.html",
        user=user
    )


def _render_ngo_workspace(view):
    """Render a lightweight NGO page using the same session/role protection."""
    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)
    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:
        user = users_collection.find_one({
            "_id": user_id
        })
    except PyMongoError:
        abort(503)

    if user is None:
        session.clear()
        return redirect(url_for("login"))

    if str(user.get("role", "")).strip().lower() != "ngo":
        return redirect(url_for("home"))

    return render_template(
        "ngo-workspace.html",
        view=view,
        user=user
    )

# ==========================================================
# PROVIDER DONATIONS
# ==========================================================

@app.route("/provider-donations")
@login_required
def provider_donations_page():

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)
    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:
        user_record = users_collection.find_one({
            "_id": user_id
        })
    except PyMongoError:
        abort(503)

    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    role = str(
        user_record.get("role", "")
    ).strip().lower()

    if role not in {
        "provider",
        "food_provider",
        "food provider",
        "donor",
        "restaurant",
    }:
        return redirect(url_for("home"))

    user = {
        "id": str(user_record["_id"]),
        "name": user_record.get("full_name", ""),
        "role": role,
        "business_name": user_record.get("business_name", ""),
        "profile_image": user_record.get("profile_image", ""),
    }

    return render_template(
        "provider-donations.html",
        user=user
    )

@app.route("/ngo-donations")
@login_required
def ngo_available_donations_page():
    return _render_ngo_workspace("available")


@app.route("/ngo-claims")
@login_required
def ngo_claims_page():
    return _render_ngo_workspace("claims")


@app.route("/ngo-impact")
@login_required
def ngo_impact_page():
    return _render_ngo_workspace("impact")


@app.route("/ngo-profile")
@login_required
def ngo_profile_page():
    return _render_ngo_workspace("profile")

# ==========================================================
# NGO EXPLORE FOOD
# ==========================================================

@app.route("/ngo-explore-food")
@login_required
def ngo_explore_food():

    session_user_id = session.get("user_id")

    try:
        user_id = ObjectId(session_user_id)

    except (InvalidId, TypeError):
        session.clear()
        return redirect(url_for("login"))

    users_collection = get_collection("users")

    if users_collection is None:
        abort(503)

    try:
        user_record = users_collection.find_one({
            "_id": user_id
        })

    except PyMongoError:
        abort(503)

    if user_record is None:
        session.clear()
        return redirect(url_for("login"))

    # ------------------------------------------------------
    # CHECK NGO ROLE
    # ------------------------------------------------------

    role = str(
        user_record.get("role", "")
    ).strip().lower()

    if role != "ngo":
        return redirect(url_for("home"))

    # ------------------------------------------------------
    # USER DATA
    # ------------------------------------------------------

    user = {
        "id": str(user_record["_id"]),

        "name": user_record.get(
            "full_name",
            ""
        ),

        "email": user_record.get(
            "email",
            ""
        ),

        "phone": user_record.get(
            "phone",
            ""
        ),

        "role": role,

        "organization_name": user_record.get(
            "organization_name",
            user_record.get(
                "full_name",
                "NGO"
            )
        ),

        "profile_image": user_record.get(
            "profile_image",
            ""
        ),
    }

    return render_template(
        "ngo-explore-food.html",
        user=user
    )

if __name__ == "__main__":
    app.run(debug=True)
