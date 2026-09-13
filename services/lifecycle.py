"""Server-side listing, donation and NGO claim lifecycle transitions."""

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
# MAIN LIFECYCLE REFRESH
# ==========================================================

def refresh_lifecycle(now=None):
    """
    Advance elapsed listings, donations and NGO claims.

    Safe to call repeatedly at API boundaries.
    """

    now = now or datetime.now(
        timezone.utc
    )

    listings = get_collection(
        "food_listings"
    )

    donations = get_collection(
        "donations"
    )

    claims = get_collection(
        "donation_claims"
    )

    # ------------------------------------------------------
    # Database availability
    # ------------------------------------------------------

    if listings is None:
        return

    try:

        # --------------------------------------------------
        # 1. NORMAL FOOD LISTINGS
        # --------------------------------------------------

        _refresh_listing_lifecycle(
            listings,
            now
        )

        # --------------------------------------------------
        # 2. NGO DONATIONS
        # --------------------------------------------------

        if donations is None:
            return

        _refresh_donation_lifecycle(
            donations,
            listings,
            now
        )

        # --------------------------------------------------
        # 3. NGO CLAIMS
        # --------------------------------------------------

        if claims is None:
            return

        _refresh_claim_lifecycle(
            claims,
            donations,
            now
        )

    except PyMongoError:

        # Lifecycle refresh should never break
        # the main API request.
        return