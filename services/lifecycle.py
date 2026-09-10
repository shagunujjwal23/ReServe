"""Server-side listing and donation expiry transitions."""

from datetime import datetime, timedelta, timezone

from pymongo.errors import PyMongoError

from config.database import get_collection


NORMAL_LISTING_STATUSES = ("available", "paused")
# India does not observe daylight saving time. A fixed offset avoids relying on
# an OS/IANA timezone database, which is not present in every development VM.
INDIA_TIMEZONE = timezone(timedelta(hours=5, minutes=30), name="IST")


def _as_utc(value):
    """Return an aware UTC datetime from current and legacy UI values.

    The provider form uses ``datetime-local``, which intentionally omits an
    offset. ReServe operates in India, so legacy naïve values are interpreted
    as Asia/Kolkata time, never as UTC. Values that already carry ``Z`` or an
    explicit offset retain that offset before conversion.
    """
    if isinstance(value, datetime):
        parsed = value
    elif not isinstance(value, str) or not value.strip():
        return None
    else:
        try:
            parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=INDIA_TIMEZONE)
    return parsed.astimezone(timezone.utc)


def normalize_datetime(value):
    """Store new provider date/time input as a canonical UTC ISO string."""
    parsed = _as_utc(value)
    return parsed.isoformat().replace("+00:00", "Z") if parsed else None


def refresh_lifecycle(now=None):
    """Advance elapsed records. Safe to call at API boundaries repeatedly."""
    now = now or datetime.now(timezone.utc)
    listings = get_collection("food_listings")
    donations = get_collection("donations")
    if listings is None:
        return

    try:
        # Historical rows may have local datetime-local strings; _as_utc
        # handles those as IST while new values are stored canonically in UTC.
        candidates = listings.find({"status": {"$in": list(NORMAL_LISTING_STATUSES)}})
        for listing in candidates:
            pickup_end = _as_utc(listing.get("pickup_end"))
            if pickup_end and pickup_end <= now:
                # The id + current status predicate makes the transition
                # atomic and prevents a concurrent pause/resume from being
                # overwritten by a stale lifecycle read.
                listings.update_one(
                    {"_id": listing["_id"], "status": listing.get("status")},
                    {"$set": {
                        "status": "surplus_pending",
                        "pickup_window_ended_at": now,
                        "updated_at": now,
                    }},
                )

        if donations is None:
            return
        candidates = donations.find({"status": {"$in": ["available", "claimed"]}})
        for donation in candidates:
            pickup_end = _as_utc(donation.get("donation_pickup_end"))
            if pickup_end and pickup_end <= now:
                updated = donations.find_one_and_update(
                    {"_id": donation["_id"], "status": donation.get("status")},
                    {"$set": {"status": "expired", "expired_at": now, "updated_at": now}},
                    return_document=True,
                )
                if updated:
                    listings.update_one(
                        {"_id": updated["listing_id"], "status": "surplus_pending"},
                        {"$set": {"status": "completed", "updated_at": now}},
                    )
    except PyMongoError:
        # Lifecycle refresh must never hide the underlying endpoint error path.
        return
