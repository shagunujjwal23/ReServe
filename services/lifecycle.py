"""Server-side listing, donation, NGO claim and reservation lifecycle transitions."""

from datetime import datetime, timedelta, timezone

from pymongo import ReturnDocument
from pymongo.errors import PyMongoError

from config.database import get_collection


# ==========================================================
# CONSTANTS
# ==========================================================

NORMAL_LISTING_STATUSES = (
    "available",
    "paused",
)

DONATION_ACTIVE_STATUSES = (
    "available",
    "claimed",
)

RESERVATION_READY_STATUS = "ready_for_pickup"

INDIA_TIMEZONE = timezone(
    timedelta(hours=5, minutes=30),
    name="IST"
)


# ==========================================================
# DATETIME HELPERS
# ==========================================================

def _as_utc(value):
    """
    Return an aware UTC datetime.

    datetime-local values from the frontend do not contain
    timezone information, so they are interpreted as IST.

    Values containing Z or another timezone offset are
    converted to UTC normally.
    """

    if isinstance(value, datetime):

        parsed = value

    elif not isinstance(value, str) or not value.strip():

        return None

    else:

        try:

            parsed = datetime.fromisoformat(
                value.strip().replace(
                    "Z",
                    "+00:00"
                )
            )

        except ValueError:

            return None

    # Legacy datetime-local values
    if parsed.tzinfo is None:

        parsed = parsed.replace(
            tzinfo=INDIA_TIMEZONE
        )

    return parsed.astimezone(
        timezone.utc
    )


def normalize_datetime(value):
    """
    Store date/time as canonical UTC ISO string.
    """

    parsed = _as_utc(value)

    if not parsed:

        return None

    return parsed.isoformat().replace(
        "+00:00",
        "Z"
    )


# ==========================================================
# INTEGER HELPER
# ==========================================================

def _quantity(value):
    """
    Safely convert quantity to integer.
    """

    try:

        return int(value or 0)

    except (TypeError, ValueError):

        return 0


# ==========================================================
# PROVIDER OPENING TIME HELPER
# ==========================================================

def _parse_opening_time(value):
    """
    Convert provider opening_time into an IST time object.

    Supported formats:

        HH:MM
        HH:MM AM
        HH:MM PM
    """

    if not isinstance(value, str):

        return None

    value = value.strip()

    if not value:

        return None

    formats = (
        "%H:%M",
        "%I:%M %p",
    )

    for time_format in formats:

        try:

            return datetime.strptime(
                value,
                time_format
            ).time()

        except ValueError:

            continue

    return None


# ==========================================================
# LISTING LIFECYCLE
# ==========================================================

def _refresh_listing_lifecycle(
    listings,
    now
):
    """
    Move normal listings to surplus_pending
    once their normal pickup window ends.
    """

    candidates = listings.find({
        "status": {
            "$in": list(
                NORMAL_LISTING_STATUSES
            )
        }
    })

    for listing in candidates:

    # --------------------------------------------------
    # NO QUANTITY LEFT → COMPLETED
    # --------------------------------------------------

        if _quantity(listing.get("quantity")) <= 0:

            listings.update_one(
                {
                    "_id": listing["_id"],
                    "status": listing.get("status")
                },
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": now,
                        "updated_at": now
                    }
                }
            )

            continue

        pickup_end = _as_utc(
        listing.get("pickup_end")
        )

        if not pickup_end:
            continue

        if pickup_end > now:

            continue

        listings.update_one(
            {
                "_id": listing["_id"],
                "status": listing.get("status")
            },
            {
                "$set": {
                    "status": "surplus_pending",
                    "pickup_window_ended_at": now,
                    "updated_at": now
                }
            }
        )


# ==========================================================
# DONATION LIFECYCLE
# ==========================================================

def _refresh_donation_lifecycle(
    donations,
    listings,
    now
):
    """
    Expire donations after their NGO pickup window ends.

    Remaining unclaimed quantity is no longer available.
    Existing claim records are preserved for history.
    """

    candidates = donations.find({
        "status": {
            "$in": list(
                DONATION_ACTIVE_STATUSES
            )
        }
    })

    for donation in candidates:

        pickup_end = _as_utc(
            donation.get(
                "donation_pickup_end"
            )
        )

        if not pickup_end:

            continue

        if pickup_end > now:

            continue

        updated = donations.find_one_and_update(
            {
                "_id": donation["_id"],
                "status": donation.get("status")
            },
            {
                "$set": {
                    "status": "expired",
                    "expired_at": now,
                    "available_quantity": 0,
                    "updated_at": now
                }
            },
            return_document=ReturnDocument.AFTER
        )

        if not updated:

            continue

        # --------------------------------------------------
        # Complete original listing when donation lifecycle
        # has completely ended.
        # --------------------------------------------------

        listing_id = updated.get(
            "listing_id"
        )

        if listing_id:

            listings.update_one(
                {
                    "_id": listing_id,
                    "status": "surplus_pending"
                },
                {
                    "$set": {
                        "status": "completed",
                        "updated_at": now
                    }
                }
            )


# ==========================================================
# CLAIM LIFECYCLE
# ==========================================================

def _refresh_claim_lifecycle(
    claims,
    donations,
    now
):
    """
    Keep claim records consistent when their parent donation
    has expired.

    Pending/confirmed claims are marked expired.
    Completed claims are never modified.
    """

    expired_donations = donations.find({
        "status": "expired"
    })

    for donation in expired_donations:

        donation_id = donation["_id"]

        claims.update_many(
            {
                "donation_id": donation_id,
                "status": {
                    "$in": [
                        "pending",
                        "confirmed"
                    ]
                }
            },
            {
                "$set": {
                    "status": "expired",
                    "expired_at": now,
                    "updated_at": now
                }
            }
        )


# ==========================================================
# RESERVATION / PICKUP LIFECYCLE
# ==========================================================

def _refresh_reservation_lifecycle(
    orders,
    users,
    now
):
    """
    Automatically move accepted reservations to
    ready_for_pickup on the customer's selected pickup date
    when the provider's opening time has arrived.

    Example:

        Pickup date:
            2026-09-22

        Provider opening time:
            10:00 AM

        Before 10:00 AM:
            accepted

        At/after 10:00 AM:
            ready_for_pickup

    The customer's selected pickup_time is NOT changed.
    """

    candidates = orders.find({
        "status": "accepted",
        "pickup_date": {
            "$exists": True,
            "$ne": ""
        }
    })

    # ------------------------------------------------------
    # CURRENT IST DATE/TIME
    # ------------------------------------------------------

    current_ist = now.astimezone(
        INDIA_TIMEZONE
    )

    today = current_ist.date()

    current_time = current_ist.time()

    for order in candidates:

        # --------------------------------------------------
        # GET PICKUP DATE
        # --------------------------------------------------

        pickup_date_value = order.get(
            "pickup_date"
        )

        if not pickup_date_value:

            continue

        try:

            pickup_date = datetime.strptime(
                str(pickup_date_value).strip(),
                "%Y-%m-%d"
            ).date()

        except (ValueError, TypeError):

            continue

        # --------------------------------------------------
        # ONLY PROCESS TODAY'S PICKUPS
        # --------------------------------------------------

        if pickup_date != today:

            continue

        # --------------------------------------------------
        # GET PROVIDER ID
        # --------------------------------------------------

        provider_id = order.get(
            "provider_id"
        )

        if not provider_id:

            continue

        # --------------------------------------------------
        # GET PROVIDER
        # --------------------------------------------------

        provider = users.find_one({
            "_id": provider_id
        })

        if provider is None:

            continue

        # --------------------------------------------------
        # GET PROVIDER OPENING TIME
        # --------------------------------------------------

        opening_time = _parse_opening_time(
            provider.get("opening_time")
        )

        # If provider has no valid opening time,
        # leave reservation as accepted.
        if opening_time is None:

            continue

        # --------------------------------------------------
        # WAIT UNTIL PROVIDER OPENS
        # --------------------------------------------------

        if current_time < opening_time:

            continue

        # --------------------------------------------------
        # ACCEPTED → READY FOR PICKUP
        # --------------------------------------------------

        orders.update_one(
            {
                "_id": order["_id"],
                "status": "accepted"
            },
            {
                "$set": {
                    "status": RESERVATION_READY_STATUS,
                    "ready_for_pickup_at": now,
                    "updated_at": now
                }
            }
        )


# ==========================================================
# MAIN LIFECYCLE REFRESH
# ==========================================================

def refresh_lifecycle(now=None):
    """
    Advance elapsed:

        - food listings
        - donations
        - NGO claims
        - user reservations

    Safe to call repeatedly at API boundaries.
    """

    now = now or datetime.now(
        timezone.utc
    )

    # ======================================================
    # COLLECTIONS
    # ======================================================

    listings = get_collection(
        "food_listings"
    )

    donations = get_collection(
        "donations"
    )

    claims = get_collection(
        "donation_claims"
    )

    orders = get_collection(
        "orders"
    )

    users = get_collection(
        "users"
    )

    # ======================================================
    # DATABASE AVAILABILITY
    # ======================================================

    # Only stop completely when none of the lifecycle
    # collections are available.
    if (
        listings is None
        and donations is None
        and claims is None
        and orders is None
    ):

        return

    try:

        # ==================================================
        # 1. NORMAL FOOD LISTINGS
        # ==================================================

        if listings is not None:

            _refresh_listing_lifecycle(
                listings,
                now
            )

        # ==================================================
        # 2. NGO DONATIONS
        # ==================================================

        if (
            donations is not None
            and listings is not None
        ):

            _refresh_donation_lifecycle(
                donations,
                listings,
                now
            )

        # ==================================================
        # 3. NGO CLAIMS
        # ==================================================

        if (
            claims is not None
            and donations is not None
        ):

            _refresh_claim_lifecycle(
                claims,
                donations,
                now
            )

        # ==================================================
        # 4. USER RESERVATIONS / PICKUPS
        # ==================================================

        if (
            orders is not None
            and users is not None
        ):

            _refresh_reservation_lifecycle(
                orders,
                users,
                now
            )

    except PyMongoError:

        # Lifecycle refresh should never break
        # the main API request.
        return