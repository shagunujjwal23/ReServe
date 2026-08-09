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

app = Flask(__name__)
load_dotenv()
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "development-only-secret-key-change-me")
CORS(app)
init_mongo(app)
app.register_blueprint(auth)
app.register_blueprint(listings)
app.register_blueprint(upload)


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

if __name__ == "__main__":
    app.run(debug=True)
