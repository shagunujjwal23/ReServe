# ReServe — Complete Project Audit & Technical Architecture Report

**Document Version:** 1.0.0  
**Inspection Date:** September 20, 2026  
**Audited System:** ReServe — Smart Dual-Tier Surplus Food Rescue & Redistribution Platform  
**Target Codebase:** `d:\ReServe`  

---

## 1. Project Structure

A complete recursive audit of the workspace reveals the following actual directory tree (excluding `.git`, `.venv`, and `__pycache__`):

```
ReServe/
├── app.py                     # Primary Flask application entry point, page router, session authentication filters
├── config.py                  # [EMPTY - 0 bytes] Unused configuration stub
├── requirements.txt           # Python dependency specifications (Flask, PyMongo, Werkzeug, Jinja2, etc.)
├── .env.example               # Environment variable templates (SECRET_KEY, MONGO_URI, MONGO_DB_NAME)
├── test_doc.html / .pdf       # Scratch evaluation test files
├── test_mm.html               # Scratch rendering test file
│
├── config/
│   ├── __init__.py            # Python package initializer
│   └── database.py            # MongoDB connection manager (MongoClient, ping validation, get_collection)
│
├── database/
│   └── reserve.db             # Legacy/unused SQLite database file (System uses MongoDB)
│
├── ml/                        # [ALL EMPTY - 0 bytes]
│   ├── dynamic_pricing.py     # [EMPTY - 0 bytes] Placeholder for dynamic pricing ML model
│   ├── freshness.py           # [EMPTY - 0 bytes] Placeholder for freshness vision/score model
│   └── waste_prediction.py   # [EMPTY - 0 bytes] Placeholder for waste prediction model
│
├── models/                    # [ALL EMPTY - 0 bytes]
│   ├── __init__.py            # Package initializer
│   ├── food.py                # [EMPTY - 0 bytes] Placeholder for ORM/ODM food model
│   ├── order.py               # [EMPTY - 0 bytes] Placeholder for ORM/ODM order model
│   └── user.py                # [EMPTY - 0 bytes] Placeholder for ORM/ODM user model
│
├── routes/
│   ├── __init__.py            # Package initializer
│   ├── admin.py               # [EMPTY - 0 bytes] Placeholder; NO admin routes or logic exist
│   ├── ai.py                  # [EMPTY - 0 bytes] Placeholder; NO backend AI endpoints exist
│   ├── auth.py                # Session authentication, signup, login, logout, provider & consumer profile APIs
│   ├── dashboard.py           # [EMPTY - 0 bytes] Unused route stub (dashboard rendered in app.py)
│   ├── donate.py              # [EMPTY - 0 bytes] Unused route stub
│   ├── donations.py           # Surplus management, NGO donation claims, provider approvals, NGO impact analytics
│   ├── listings.py            # Food listing CRUD, public listing discovery, provider listing management
│   ├── marketplace.py         # [EMPTY - 0 bytes] Unused route stub (marketplace rendered in app.py)
│   ├── ngo.py                 # NGO profile management API (GET/PUT) and @ngo_required decorator
│   ├── orders.py              # Customer reservation placement, provider request approval/rejection, pickup completion
│   └── upload.py              # Multipart image upload handler, disk storage, and static image serving
│
├── services/
│   ├── __init__.py            # Package initializer
│   └── lifecycle.py           # On-demand state machine for listing expiry, donation rollover, claim expiry, pickup transition
│
├── utils/                     # [ALL EMPTY - 0 bytes]
│   ├── __init__.py            # Package initializer
│   ├── helpers.py             # [EMPTY - 0 bytes] Placeholder utility file
│   └── validators.py          # [EMPTY - 0 bytes] Placeholder validation file
│
├── uploads/                   # Local file storage for uploaded food and profile images (UUID named JPEGs/PNGs)
│
├── templates/                 # Jinja2 HTML View Templates (33 files total)
│   ├── index.html             # Landing page with hero, mission, and quick links
│   ├── login.html             # Multi-role login interface
│   ├── signup.html            # Registration form with role selector (Provider, User, NGO)
│   ├── forgot-password.html   # Password reset request form
│   ├── reset-password.html    # Password reset submission form
│   ├── dashboard.html         # Food provider main dashboard (metrics, charts, recent activity)
│   ├── add-listings.html      # Food listing submission & client-side AI analysis wizard
│   ├── my-listings.html       # Provider listing management + embedded Surplus Donations panel
│   ├── requests.html          # Provider pending reservation requests & order acceptance
│   ├── my-pickups.html        # Provider & Consumer scheduled pickup management
│   ├── provider-pickup.html   # Provider pickup operations interface
│   ├── provider-profile.html  # Food provider business profile and hours configuration
│   ├── provider-donations.html# Legacy standalone provider donation history
│   ├── marketplace.html       # Public consumer food discovery & filtering portal
│   ├── listing-details.html   # Detailed food listing view, nutrition/dietary flags, pickup timing
│   ├── place-order.html       # Customer checkout & portion reservation interface
│   ├── my-reservations.html   # Consumer reservation tracking & active pickup codes
│   ├── user-dashboard.html    # Consumer personal dashboard
│   ├── user-profile.html      # Consumer profile settings
│   ├── user-view-profile.html # Consumer public profile view
│   ├── donor-profile.html     # Donor profile display
│   ├── ngo-dashboard.html     # NGO operations overview (rescued food stats, active claims)
│   ├── ngo-explore-food.html  # NGO marketplace for claiming free surplus food packages
│   ├── ngo-claims.html        # NGO active and historical claim tracking
│   ├── ngo-impact.html        # NGO environmental and social impact analytics hub
│   ├── ngo-workspace.html     # NGO workspace portal
│   ├── view-listing.html      # Secondary listing preview template
│   ├── base.html              # Standalone template stub (not actively inherited by child templates)
│   ├── check-email.html       # Informational password reset notification screen (not routed)
│   ├── admin.html             # [EMPTY - 0 bytes] Unused admin template stub
│   ├── ai.html                # [EMPTY - 0 bytes] Unused AI template stub
│   ├── donate.html            # [EMPTY - 0 bytes] Unused donation template stub
│   └── error.html             # [EMPTY - 0 bytes] Unused error template stub
│
└── static/
    ├── css/                   # 44 CSS stylesheets (glassmorphism UI, mobile responsiveness, dark themes)
    └── js/                    # 32 JavaScript client-side controllers (fetch API calls, dynamic DOM manipulation)
```

---

## 2. Technology Stack

### Frontend
* **Markup:** Semantic HTML5 rendered via Flask's Jinja2 template engine. Templates are self-contained standalone documents containing dedicated header navigation, modals, and content blocks.
* **Styling:** Vanilla CSS3 with extensive custom property design tokens (variables, glassmorphism `backdrop-filter`, responsive CSS Grid, Flexbox, custom animated status badges).
* **Client Logic:** Modern Vanilla JavaScript (ES6+ async/await, Fetch API, DOM manipulation).
* **Third-Party Frontend Libraries:**
  * Chart.js (included via CDN on provider dashboard and NGO impact templates for trend rendering).
  * Lucide / FontAwesome icon sets (included via CDN links).
  * Google Fonts (`Plus Jakarta Sans`, `Inter`).

### Backend
* **Language & Runtime:** Python 3.10+ (tested on Python 3.11/3.12).
* **Web Framework:** Flask 3.1.3 (`flask.Flask`, `flask.Blueprint`, `flask.request`, `flask.session`, `flask.jsonify`, `flask.render_template`).
* **Extensions & Middleware:**
  * `flask-cors` (6.0.5): Cross-Origin Resource Sharing enabled globally on `app`.
  * `python-dotenv` (1.2.2): Environment variable loader reading `.env`.
  * `Werkzeug` (3.1.8): Password hashing security (`generate_password_hash`, `check_password_hash`) and secure file naming.
  * `itsdangerous` (2.2.0): Flask cryptographically signed client-side session cookies.

### Database Layer
* **Database Engine:** MongoDB (Document Store). Tested with local standalone instance (`mongodb://localhost:27017`) and compatible with MongoDB Atlas.
* **Database Name:** Default `reserve_db` (configurable via `MONGO_DB_NAME`).
* **Driver:** `pymongo` 4.17.0 (`MongoClient`, `ReturnDocument`, `PyMongoError`, `DuplicateKeyError`).
* **ORM/ODM:** None. The application interacts directly with collections using PyMongo dictionary queries. Files in `models/` (`user.py`, `food.py`, `order.py`) are 0-byte stubs.
* **Active Collections:**
  1. `users`
  2. `food_listings`
  3. `orders`
  4. `donations`
  5. `donation_claims`

### Security Implementation
* **Password Hashing:** PBKDF2 with SHA-256 via Werkzeug (`generate_password_hash(password)`). Plaintext passwords are never stored.
* **Session Management:** Flask signed cookie-based session management (`session["user_id"]`, `session["role"]`). Keyed with `SECRET_KEY`.
* **Access Control:** Decorator-based route guards (`login_required` in `app.py`, `ngo_required` in `routes/ngo.py` and `routes/donations.py`).
* **Input Validation:** ObjectId validation with `bson.errors.InvalidId` exception handling; strictly typed phone numbers (10-digit, Indian mobile prefix `[6-9]`); required field checks.
* **File Security:** Uploaded files restricted to `.jpg`, `.jpeg`, `.png`, `.webp`, capped at 5 MB, stored with random UUID hex filenames.

---

## 3. User Roles & Permission Matrix

The system implements exactly **three functional user roles**. No administrative user or admin module is operational.

```
                  ┌──────────────────────────────┐
                  │    ReServe User Ecosystem    │
                  └──────────────┬───────────────┘
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Food Provider   │   │  Consumer (User) │   │   NGO Partner    │
│ (Retail Salvage) │   │ (Public Buyer)   │   │ (Charity Rescue) │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

### Role 1: Food Provider
* **Role Identifiers in Code:** `"provider"`, `"food_provider"`, `"food provider"`, `"donor"`, `"restaurant"` (mapped via `PROVIDER_ROLES` in `routes/auth.py`).
* **Registration & Login:** Signs up via `/signup` with role `provider`. Assigned unique provider ID `RS-P-XXXXXX`. Redirected upon login to `/provider-profile` or `/dashboard`.
* **Accessible Pages:** `/dashboard`, `/add-listings`, `/my-listings`, `/requests`, `/my-pickups`, `/provider-pickup`, `/provider-profile`, `/provider-donations`.
* **API Endpoints:**
  * `POST /api/listings` (Create food listing)
  * `GET /api/listings/my` (Retrieve owned listings)
  * `PUT / PATCH / DELETE /api/listings/<id>` (Update, pause, delete listing)
  * `GET /api/requests` (View customer reservation requests)
  * `POST /api/requests/<id>/accept` (Accept reservation)
  * `POST /api/requests/<id>/reject` (Reject reservation, restoring stock)
  * `GET /api/provider/pickups` (View accepted pickups)
  * `GET /api/provider/surplus` (View unsold listings eligible for donation)
  * `POST /api/listings/<id>/donate` (Publish surplus food to NGO portal)
  * `GET /api/provider/donation-claims` (View claims from NGOs)
  * `POST /api/provider/donation-claims/<id>/approve` (Approve NGO claim)
  * `POST /api/provider/donation-claims/<id>/reject` (Reject NGO claim, restoring surplus)
* **Data Operations:**
  * Creates: `food_listings`, `donations`.
  * Reads: `users` (own profile), `orders` (placed on own listings), `donation_claims` (placed on own donations).
  * Updates: `food_listings` (quantity, price, status), `orders` (status to accepted/rejected), `donations` (pickup windows), `donation_claims` (status to confirmed/cancelled).
  * Deletes: `food_listings` (own listings).

### Role 2: Consumer / Individual User
* **Role Identifiers in Code:** `"user"`, `"individual"`.
* **Registration & Login:** Signs up via `/signup` with role `user`. Redirected upon login to `/user-profile` or `/marketplace`.
* **Accessible Pages:** `/marketplace`, `/listing/<listing_id>`, `/place-order/<listing_id>`, `/my-reservations`, `/user-dashboard`, `/user-profile`, `/user-view-profile`.
* **API Endpoints:**
  * `GET /api/listings` (Public marketplace discovery)
  * `GET /api/listings/<id>` (Listing details)
  * `POST /api/orders/place` (Reserve portions; locks inventory atomically)
  * `GET /api/user/reservations` (View personal reservation history and pickup codes)
  * `POST /api/user/reservations/<id>/cancel` (Cancel pending reservation, restoring stock)
  * `POST /api/user/reservations/<id>/confirm-pickup` (Mark order completed upon receipt)
  * `GET / PUT /api/user/profile` (View and update personal profile)
* **Data Operations:**
  * Creates: `orders` (reservations).
  * Reads: `food_listings` (active public items), `orders` (own reservations), `users` (own profile).
  * Updates: `orders` (status to cancelled or completed), `users` (personal profile).
  * Deletes: None (orders are marked `cancelled`, never deleted).

### Role 3: NGO / Charity Organization
* **Role Identifiers in Code:** `"ngo"`.
* **Registration & Login:** Signs up via `/signup` with role `ngo`. Guarded by the `@ngo_required` decorator. Redirected upon login to `/ngo-dashboard`.
* **Accessible Pages:** `/ngo-dashboard`, `/ngo-explore-food`, `/ngo-claims`, `/ngo-impact`, `/ngo-profile`, `/ngo-workspace`.
* **API Endpoints:**
  * `GET /api/donations/available` (Browse available free surplus donations)
  * `GET /api/donations/<id>` (Donation package details)
  * `POST /api/donations/<id>/claim` (Submit claim with beneficiary details)
  * `GET /api/ngo/claims` (View active and past rescue claims)
  * `POST /api/donation-claims/<id>/cancel` (Cancel pending claim, restoring available donation quantity)
  * `POST /api/donation-claims/<id>/complete` (Confirm receipt of rescued food)
  * `GET /api/ngo/dashboard` (Summary statistics of claims and rescued food)
  * `GET /api/ngo/impact` (Aggregated impact metrics: kg rescued, people served, categories, sources)
  * `GET / PUT /api/ngo/profile` (Organization details, contact person, service area)
* **Data Operations:**
  * Creates: `donation_claims`.
  * Reads: `donations` (free surplus catalog), `donation_claims` (own claims), `users` (own profile).
  * Updates: `donation_claims` (status to completed or cancelled), `donations` (decrements `available_quantity`), `users` (NGO profile).
  * Deletes: None.

### Role 4: Admin Role Audit
* **Status:** **NOT IMPLEMENTED / NON-FUNCTIONAL**.
* **Audit Evidence:**
  1. `routes/admin.py`: 0 bytes (completely empty).
  2. `templates/admin.html`: 0 bytes (completely empty).
  3. In `routes/auth.py`, the string `"admin"` is allowed in `allowed_roles` at signup, and `get_redirect_url("admin")` returns `"/dashboard"`. However, `/dashboard` is the **Food Provider dashboard**. There is no admin panel, no user moderation route, and no platform-wide admin management logic.

---

## 4. Authentication & Authorization System

### Flow Analysis

```
[ Unauthenticated Client ]
       │
       ▼
POST /api/signup ───────► Validates Fields & Phone (10-digit Indian)
                          Hashes Password (Werkzeug PBKDF2-SHA256)
                          Inserts to 'users' Collection
                          Generates Provider ID if Role is Provider
                          Sets session['user_id'] & session['role']
                          Returns JSON + Redirect URL
       │
       ▼
POST /api/login ────────► Looks up user by lowercased email
                          Verifies check_password_hash()
                          Clears stale session & Sets session['user_id'], session['role']
                          Returns JSON + Role-specific redirect
       │
       ▼
GET /logout ────────────► Calls session.clear()
                          Redirects to url_for('login')
```

### Route Protection Mechanisms

1. **`@login_required` (Defined in `app.py`):**
   * Validates that `session.get("user_id")` exists and is a valid BSON `ObjectId`.
   * If invalid, clears the session and issues a HTTP 302 redirect to `/login`.
   * Applied to all authenticated HTML page routes (`/dashboard`, `/add-listings`, `/my-listings`, `/requests`, `/my-pickups`, `/user-dashboard`, etc.).

2. **`@ngo_required` (Defined in `routes/ngo.py` and `routes/donations.py`):**
   * Validates `session["user_id"]`.
   * Queries `users` collection to check that `user.role == "ngo"`.
   * Returns HTTP 401 if unauthenticated, HTTP 403 if user role is not `ngo`, HTTP 503 if database is offline.

3. **Inline Session Verification:**
   * Used in `routes/listings.py`, `routes/orders.py`, and `routes/auth.py`.
   * Helper functions `get_logged_in_user_id()` and `_session_user()` extract the session user, check database existence, and enforce role-level isolation.

---

## 5. Food Provider Workflow (Detailed End-to-End)

```
[ Provider Signup/Login ]
           │
           ▼
[ Provider Profile Setup ] ──────► Sets Business Name, Address, Operating Hours
           │
           ▼
[ Add Food Listing ] ────────────► Form Input + Client-Side Heuristic Analysis
           │                       POST /api/listings
           │                       Status: "available"
           ▼
[ Active Inventory ] ────────────► Monitored on "My Listings"
           │
     ┌─────┴──────────────────────────────┐
     │                                    │
     ▼                                    ▼
[ Customer Places Reservation ]     [ Pickup Window Ends ]
     │                                    │
     ▼                                    ▼
[ Appears in "Requests" ]           [ Lifecycle Worker Moves to "surplus_pending" ]
     │                                    │
     ├──► POST /api/requests/<id>/accept  ▼
     │    Status -> "accepted"      [ Provider Confirms Surplus in "My Listings" ]
     │    (Ready when store opens)        │
     │                                    ▼
     ├──► POST /api/requests/<id>/reject [ Published to NGO Free Portal as "donations" ]
     │    Status -> "rejected"
     │    (Restores listing stock)
     ▼
[ Physical Handover ]
Customer presents Pickup Code (REQ-XXXXXXXX)
Customer confirms via /api/user/reservations/<id>/confirm-pickup
Status -> "completed"
```

### Step-by-Step Implementation Details

1. **Listing Creation:**
   * **Template:** `templates/add-listings.html`
   * **Script:** `static/js/add-listings.js`
   * **Endpoint:** `POST /api/listings`
   * **Collection:** `food_listings`
   * **Payload Fields:** `food_title`, `category`, `food_type` (veg/non-veg), `listing_type` (sell/donate), `quantity`, `unit`, `original_price`, `discounted_price`, `expiry_date`, `pickup_start`, `pickup_end`, `description`, `image`, `carbon_saved`.
   * **Initial Status:** `"available"`.

2. **Managing Active Inventory:**
   * **Template:** `templates/my-listings.html`
   * **Script:** `static/js/my-listings.js`
   * **Endpoint:** `GET /api/listings/my`
   * **Actions:** Provider can pause (`PATCH /api/listings/<id>/pause`), duplicate (`POST /api/listings/<id>/duplicate`), edit (`PUT /api/listings/<id>`), or delete (`DELETE /api/listings/<id>`).

3. **Reviewing Customer Requests:**
   * **Template:** `templates/requests.html`
   * **Script:** `static/js/requests.js`
   * **Endpoint:** `GET /api/requests`
   * **Accept Action:** `POST /api/requests/<id>/accept` sets `status: "accepted"`.
   * **Reject Action:** `POST /api/requests/<id>/reject` sets `status: "rejected"` and atomically returns reserved portions:
     ```python
     listings_collection.update_one(
         {"_id": listing_id},
         {"$inc": {"quantity": quantity, "reservations": -quantity}}
     )
     ```

4. **Pickups & Handover:**
   * **Template:** `templates/my-pickups.html` or `templates/provider-pickup.html`
   * **Script:** `static/js/my-pickups.js`
   * **Endpoint:** `GET /api/provider/pickups`
   * Returns items with statuses: `"accepted"`, `"confirmed"`, `"ready_for_pickup"`, `"picked_up"`, `"scheduled"`.

---

## 6. Consumer Workflow (Detailed End-to-End)

```
[ Consumer Login ] ──► [ Marketplace Discovery (/marketplace) ]
                               │
                               ▼
                       [ Filter & Search ]
                       (Category, Veg/Non-Veg, Price)
                               │
                               ▼
                       [ Listing Details (/listing/<id>) ]
                               │
                               ▼
                       [ Checkout / Reserve (/place-order/<id>) ]
                               │
                               ▼
                       POST /api/orders/place
                       ├── Validates date within listing pickup window
                       ├── Atomically locks quantity: $inc: {quantity: -qty}
                       ├── Generates Request ID: "REQ-" + hex(inserted_id)
                       └── Sets Status: "pending"
                               │
                               ▼
                       [ My Reservations (/my-reservations) ]
                       Displays Token, Provider Address, Status
                               │
                               ▼
                       [ Store Handover ]
                       Customer picks up food
                       Calls POST /api/user/reservations/<id>/confirm-pickup
                       Status: "ready_for_pickup" ──► "completed"
```

### Verification Checks

* **Atomic Stock Decrement:** Verified. Handled in `routes/orders.py` via `find_one_and_update`:
  ```python
  listings_collection.find_one_and_update(
      {
          "_id": listing_object_id,
          "owner_id": listing_provider_id,
          "status": "available",
          "quantity": {"$gte": quantity},
      },
      {
          "$inc": {"quantity": -quantity, "reservations": quantity},
          "$set": {"updated_at": datetime.now(timezone.utc)},
      }
  )
  ```
* **Overselling Prevention:** If `quantity > available`, MongoDB match fails; returns HTTP 409 Conflict.
* **Self-Order Prevention:** Verified. `listing_provider_id == user_id` returns HTTP 400.
* **Customer Cancellation:** Verified. `POST /api/user/reservations/<id>/cancel` cancels pending order and restores listing stock.

---

## 7. NGO Rescue Workflow (Detailed End-to-End)

```
[ NGO Login ] ──► [ NGO Dashboard (/ngo-dashboard) ]
                          │
                          ▼
                  [ Explore Surplus Food (/ngo-explore-food) ]
                  Calls GET /api/donations/available
                          │
                          ▼
                  [ Submit Claim ]
                  Calls POST /api/donations/<donation_id>/claim
                  Payload: quantity, intended_beneficiaries
                  ├── Atomically decrements donation.available_quantity
                  ├── Generates Claim ID: "RS-C-" + hex(inserted_id)
                  ├── Creates document in 'donation_claims'
                  └── If available_quantity reaches 0 -> donation status: "claimed"
                          │
                          ▼
                  [ Provider Approves Claim ]
                  Provider reviews on "Requests" / "Donation Claims"
                  Calls POST /api/provider/donation-claims/<id>/approve
                  Claim status: "pending" ──► "confirmed"
                          │
                          ▼
                  [ Physical Pickup & Verification ]
                  NGO collects food package
                  Calls POST /api/donation-claims/<id>/complete
                  Claim status: "confirmed" ──► "completed"
                  Donation status: "completed"
                          │
                          ▼
                  [ Impact Analytics (/ngo-impact) ]
                  Calls GET /api/ngo/impact
                  Aggregates: food_collected, people_served, communities_supported
```

### Status of Features
* NGO Registration & Profile: **IMPLEMENTED**
* NGO Dashboard: **IMPLEMENTED**
* Explore Surplus Donations: **IMPLEMENTED**
* Claiming Engine with Beneficiary Logging: **IMPLEMENTED**
* Provider Claim Approval/Rejection: **IMPLEMENTED**
* Claim Cancellation with Stock Rollback: **IMPLEMENTED**
* Real-time Impact Calculation: **IMPLEMENTED**

---

## 8. Food Listing Lifecycle & State Engine

The listing lifecycle is controlled by `services/lifecycle.py`.

### Execution Mechanism Audit
* **Architectural Finding:** The lifecycle engine is **NOT a background daemon, Celery worker, or cron task**.
* **Actual Trigger:** It is an **on-demand request-time state synchronizer** executed via `refresh_lifecycle()` at the top of incoming API endpoints across `listings.py`, `orders.py`, and `donations.py`.

### State Transitions Table

| Current Status | Trigger / Condition | New Status | Code Location | Database Update |
| :--- | :--- | :--- | :--- | :--- |
| `available` | Customer reserves all remaining quantity (`quantity <= 0`) | `completed` | `services/lifecycle.py` (`_refresh_listing_lifecycle`) | `listings.update_one({"status": "completed", "completed_at": now})` |
| `available` | Commercial pickup window expires (`pickup_end <= now`) and `quantity > 0` | `surplus_pending` | `services/lifecycle.py` (`_refresh_listing_lifecycle`) | `listings.update_one({"status": "surplus_pending", "pickup_window_ended_at": now})` |
| `surplus_pending` | Provider reviews Surplus Panel and submits donation window | `donation` record created; listing marked `completed` once donation ends | `routes/donations.py` (`publish_donation`) | Inserts new doc into `donations` with `status: "available"` |
| `available` (Donation) | NGO pickup window expires (`donation_pickup_end <= now`) | `expired` | `services/lifecycle.py` (`_refresh_donation_lifecycle`) | `donations.update_one({"status": "expired", "available_quantity": 0})` |
| `pending` / `confirmed` (Claim) | Parent donation status becomes `expired` | `expired` | `services/lifecycle.py` (`_refresh_claim_lifecycle`) | `claims.update_many({"status": "expired", "expired_at": now})` |
| `accepted` (Order) | Pickup date is today (`pickup_date == today`) and provider opening time reached (`now >= opening_time`) | `ready_for_pickup` | `services/lifecycle.py` (`_refresh_reservation_lifecycle`) | `orders.update_one({"status": "ready_for_pickup", "ready_for_pickup_at": now})` |

---

## 9. Donation / Surplus System

The surplus recovery system operates as a secondary channel when commercial listings expire:

```
[ food_listings ] (status: "surplus_pending")
        │
        ▼  Provider clicks "Donate to NGO" (my-listings.html)
POST /api/listings/<id>/donate
        │
        ▼
[ donations ] (status: "available", available_quantity: N, donation_pickup_end: T)
        │
        ▼  NGO clicks "Claim Donation" (ngo-explore-food.html)
POST /api/donations/<id>/claim
        │
        ▼
[ donation_claims ] (status: "pending", claimed_quantity: M, claim_id: "RS-C-XXXX")
        │
        ├──► Provider Approves: POST /api/provider/donation-claims/<id>/approve
        │    status: "confirmed"
        │
        ├──► Handover Complete: POST /api/donation-claims/<id>/complete
        │    status: "completed"
        │    (Logs rescued food weight)
        │
        └──► Rejection / Cancellation:
             Restores donation available_quantity; if window open, status -> "available"
```

---

## 10. Order System & Status Matrix

### Verified Order Statuses

1. **`pending`:** Order placed by consumer; stock deducted from listing; awaiting provider response.
2. **`accepted`:** Provider clicked "Accept" in `/requests`.
3. **`ready_for_pickup`:** Provider opening time reached on scheduled pickup day (via `lifecycle.py`).
4. **`completed`:** Customer confirmed receipt via `/api/user/reservations/<id>/confirm-pickup`.
5. **`rejected`:** Provider rejected request; stock restored to listing.
6. **`cancelled`:** Customer cancelled pending reservation; stock restored to listing.

---

## 11. Pickup & Token Verification System

### Code Generation & Verification
* **Customer Order Token:**
  * **Format:** `REQ-XXXXXXXX` (e.g., `REQ-4A7F9B12`).
  * **Source:** Derived from the last 8 hexadecimal characters of the MongoDB `ObjectId`:
    ```python
    request_id = f"REQ-{str(result.inserted_id)[-8:].upper()}"
    ```
  * **Recipient:** Consumer (shown in `my-reservations.html` and order receipt modal).
* **NGO Claim Token:**
  * **Format:** `RS-C-XXXXXX` (e.g., `RS-C-E12F4B`).
  * **Source:** Derived from the last 6 hexadecimal characters of the MongoDB claim `ObjectId`.
  * **Recipient:** NGO Partner (shown in `ngo-claims.html`).
* **Verification Flow:** Physical verification where the customer or volunteer presents the code at the store. Verification changes state to `completed`, preventing token reuse.
* **Security Classification:** Deterministic, non-cryptographic alphanumeric reference tokens.

---

## 12. Database Audit (MongoDB Collections)

```
                              ┌──────────────────┐
                              │      users       │
                              └────────┬─────────┘
                   ┌───────────────────┼───────────────────┐
                   │ 1:N               │ 1:N               │ 1:N
                   ▼                   ▼                   ▼
         ┌───────────────────┐ 1:N   ┌───────┐   1:N ┌───────────────────┐
         │   food_listings   ├──────►│orders │   ┌──►│  donation_claims  │
         └─────────┬─────────┘       └───────┘   │   └───────────────────┘
                   │ 1:1                         │ 1:N
                   ▼                             │
         ┌───────────────────┐                   │
         │     donations     ├───────────────────┘
         └───────────────────┘
```

### Collection 1: `users`
* **Purpose:** Stores user profiles, authentication credentials, and business metadata for Providers, Consumers, and NGOs.
* **Fields:**
  * `_id` (`ObjectId`, PK): Unique identifier.
  * `full_name` (`string`, Required): User full name.
  * `email` (`string`, Required, Unique): Account email address (lowercased).
  * `phone` (`string`, Required): 10-digit mobile number.
  * `password` (`string`, Required): PBKDF2-SHA256 password hash.
  * `role` (`string`, Required): `"provider"`, `"user"`, `"ngo"`, or `"admin"`.
  * `provider_id` (`string`, Optional): Unique ID for providers (e.g., `RS-P-XXXXXX`).
  * `business_name` / `restaurant_name` (`string`, Optional): Provider business name.
  * `organization_name` (`string`, Optional): NGO organization name.
  * `contact_person` (`string`, Optional): NGO primary contact.
  * `address`, `city`, `state`, `pincode` (`string`, Optional): Physical address data.
  * `opening_time`, `closing_time` (`string`, Optional): Store operating hours.
  * `profile_image` (`string`, Optional): Relative URL to uploaded image.
  * `profile_images` (`list[string]`, Optional): Array of store/venue photo URLs.
  * `created_at`, `updated_at` (`datetime`, UTC): Audit timestamps.

### Collection 2: `food_listings`
* **Purpose:** Stores commercial food items published by providers.
* **Fields:**
  * `_id` (`ObjectId`, PK): Unique identifier.
  * `owner_id` (`ObjectId`, FK -> `users._id`): Owning provider.
  * `food_title` (`string`, Required): Name of food item.
  * `category` (`string`, Required): Meal category (Bakery, Meals, Produce, etc.).
  * `food_type` (`string`, Required): `"veg"` or `"non-veg"`.
  * `listing_type` (`string`, Required): `"sell"` or `"donate"`.
  * `quantity` (`int`, Required): Available portions.
  * `unit` (`string`, Required): Units (`"plates"`, `"kg"`, `"boxes"`, `"items"`).
  * `original_price` (`float`, Required): Regular retail price.
  * `discounted_price` (`float`, Required): Discounted salvage price.
  * `expiry_date` (`string` / `datetime`, Required): Food expiration threshold.
  * `pickup_start`, `pickup_end` (`string` / `datetime`, Required): Valid pickup time window.
  * `description` (`string`, Required): Food description and allergens.
  * `image` (`string`, Required): Image path in `/uploads/`.
  * `carbon_saved` (`float`, Optional): Computed CO2 offset in kilograms.
  * `freshness_score` (`int`, Optional): Heuristic freshness score (0–100).
  * `status` (`string`, Required): `"available"`, `"paused"`, `"surplus_pending"`, `"completed"`.
  * `created_at`, `updated_at` (`datetime`, UTC): Timestamps.

### Collection 3: `orders`
* **Purpose:** Stores consumer meal reservations and fulfillment records.
* **Fields:**
  * `_id` (`ObjectId`, PK): Unique identifier.
  * `request_id` (`string`, Indexed): Formatted token (`REQ-XXXXXXXX`).
  * `listing_id` (`ObjectId`, FK -> `food_listings._id`): Target listing.
  * `requester_id` (`ObjectId`, FK -> `users._id`): Consumer user ID.
  * `provider_id` (`ObjectId`, FK -> `users._id`): Store owner user ID.
  * `food_name` (`string`): Snapshot of item title.
  * `quantity` (`int`, Required): Reserved portion count.
  * `unit_price`, `amount`, `platform_fee`, `total_amount` (`float`): Financial breakdown.
  * `pickup_date` (`string`, YYYY-MM-DD): Customer arrival date.
  * `pickup_time` (`string`): Customer arrival time slot.
  * `status` (`string`, Required): `"pending"`, `"accepted"`, `"ready_for_pickup"`, `"completed"`, `"rejected"`, `"cancelled"`.
  * `created_at`, `updated_at`, `completed_at` (`datetime`, UTC): Timestamps.

### Collection 4: `donations`
* **Purpose:** Stores free surplus food packages made available to NGOs.
* **Fields:**
  * `_id` (`ObjectId`, PK): Unique identifier.
  * `listing_id` (`ObjectId`, FK -> `food_listings._id`, Optional): Source commercial listing.
  * `provider_id` (`ObjectId`, FK -> `users._id`): Donating provider.
  * `food_title` (`string`): Name of surplus item.
  * `quantity` (`int`): Total surplus quantity.
  * `available_quantity` (`int`): Remaining unclaimed portions.
  * `donation_pickup_start`, `donation_pickup_end` (`datetime`, UTC): Charitable pickup window.
  * `status` (`string`): `"available"`, `"claimed"`, `"completed"`, `"expired"`.
  * `created_at`, `updated_at`, `expired_at` (`datetime`, UTC): Timestamps.

### Collection 5: `donation_claims`
* **Purpose:** Stores NGO claims submitted against surplus packages.
* **Fields:**
  * `_id` (`ObjectId`, PK): Unique identifier.
  * `donation_id` (`ObjectId`, FK -> `donations._id`): Source donation package.
  * `ngo_id` (`ObjectId`, FK -> `users._id`): Claiming NGO organization.
  * `provider_id` (`ObjectId`, FK -> `users._id`): Provider fulfilling donation.
  * `quantity` (`int`): Claimed food units.
  * `intended_beneficiaries` (`string`): Description of beneficiaries (e.g., "Local shelter").
  * `status` (`string`): `"pending"`, `"confirmed"`, `"completed"`, `"expired"`, `"cancelled"`.
  * `created_at`, `updated_at`, `completed_at`, `cancelled_at` (`datetime`, UTC): Timestamps.

---

## 13. Logical Database Relationships

```
USERS
  ├── (1:N) ──► FOOD_LISTINGS    [Foreign Key: food_listings.owner_id]
  ├── (1:N) ──► ORDERS (Placed)  [Foreign Key: orders.requester_id]
  ├── (1:N) ──► ORDERS (Received)[Foreign Key: orders.provider_id]
  ├── (1:N) ──► DONATIONS        [Foreign Key: donations.provider_id]
  └── (1:N) ──► DONATION_CLAIMS  [Foreign Key: donation_claims.ngo_id]

FOOD_LISTINGS
  ├── (1:N) ──► ORDERS           [Foreign Key: orders.listing_id]
  └── (1:1) ──► DONATIONS        [Foreign Key: donations.listing_id]

DONATIONS
  └── (1:N) ──► DONATION_CLAIMS  [Foreign Key: donation_claims.donation_id]
```

---

## 14. Complete API & Route Inventory

### Authentication & Profile Routes (`routes/auth.py`, `app.py`)
| Method | Endpoint | Blueprint | Role Required | Input | Output / Response | Collections |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/signup` | `auth` | Public | Full name, email, phone, password, role | User object, redirect URL | `users` |
| `POST` | `/api/login` | `auth` | Public | Email, password | User object, role, redirect URL | `users` |
| `GET` | `/logout` | `auth` | Any | None | HTTP 302 redirect to `/login` | None |
| `GET` | `/api/provider/profile` | `auth` | Provider | None | Provider profile JSON | `users` |
| `PUT` | `/api/provider/profile` | `auth` | Provider | Business details, hours, address | Updated profile JSON | `users` |
| `GET` | `/api/user/profile` | `auth` | Consumer | None | User profile JSON | `users` |
| `PUT` | `/api/user/profile` | `auth` | Consumer | Name, phone, address | Updated profile JSON | `users` |

### Food Listing Routes (`routes/listings.py`)
| Method | Endpoint | Blueprint | Role Required | Input | Output / Response | Collections |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/listings` | `listings` | Provider | Food details, pricing, windows | Created listing ID | `food_listings` |
| `GET` | `/api/listings` | `listings` | Public | Query filters (category, type) | Array of available listings | `food_listings`, `users` |
| `GET` | `/api/listings/my` | `listings` | Provider | None | Array of provider's listings | `food_listings` |
| `GET` | `/api/listings/<id>` | `listings` | Public | Listing ID | Single listing details JSON | `food_listings`, `users` |
| `PUT` | `/api/listings/<id>` | `listings` | Provider | Modified fields | Updated listing JSON | `food_listings` |
| `PATCH`| `/api/listings/<id>/pause` | `listings` | Provider | None | Toggled status (`available`/`paused`)| `food_listings` |
| `POST` | `/api/listings/<id>/duplicate` | `listings` | Provider | None | New duplicated listing JSON | `food_listings` |
| `DELETE`| `/api/listings/<id>` | `listings` | Provider | None | Success message | `food_listings` |

### Orders & Reservation Routes (`routes/orders.py`)
| Method | Endpoint | Blueprint | Role Required | Input | Output / Response | Collections |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/orders/place` | `orders` | Consumer | `listing_id`, `quantity`, date, time | `request_id`, status: `pending` | `orders`, `food_listings`, `users` |
| `GET` | `/api/requests` | `orders` | Provider | None | Array of reservation requests | `orders`, `donations`, `donation_claims` |
| `GET` | `/api/provider/pickups`| `orders` | Provider | None | Array of accepted upcoming pickups | `orders`, `donations`, `donation_claims` |
| `POST` | `/api/requests/<id>/accept` | `orders` | Provider | Request ID | Updated status: `accepted` | `orders`, `donation_claims` |
| `POST` | `/api/requests/<id>/reject` | `orders` | Provider | Request ID | Status: `rejected` (restores stock) | `orders`, `food_listings` |
| `GET` | `/api/user/reservations` | `orders` | Consumer | None | Array of customer reservations | `orders` |
| `POST` | `/api/user/reservations/<id>/cancel` | `orders` | Consumer | Reservation ID | Status: `cancelled` (restores stock) | `orders`, `food_listings` |
| `POST` | `/api/user/reservations/<id>/confirm-pickup` | `orders` | Consumer | Reservation ID | Status: `completed` | `orders` |

### Donations & NGO Rescue Routes (`routes/donations.py`, `routes/ngo.py`)
| Method | Endpoint | Blueprint | Role Required | Input | Output / Response | Collections |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/provider/surplus` | `donations` | Provider | None | List of expired surplus items | `food_listings` |
| `POST` | `/api/listings/<id>/donate` | `donations` | Provider | Quantity, pickup window | Created donation object | `donations`, `food_listings` |
| `GET` | `/api/donations/available` | `donations` | Public / NGO | None | Catalog of free surplus packages | `donations` |
| `POST` | `/api/donations/<id>/claim` | `donations` | NGO | `quantity`, `intended_beneficiaries` | Created claim object (`RS-C-XXXX`) | `donations`, `donation_claims` |
| `GET` | `/api/ngo/claims` | `donations` | NGO | None | Array of claims made by NGO | `donation_claims`, `donations` |
| `POST` | `/api/donation-claims/<id>/complete` | `donations` | NGO / Provider | Claim ID | Status: `completed` | `donation_claims`, `donations` |
| `POST` | `/api/donation-claims/<id>/cancel` | `donations` | NGO | Claim ID | Status: `cancelled` (restores stock) | `donation_claims`, `donations` |
| `GET` | `/api/ngo/dashboard` | `donations` | NGO | None | Rescued food counts, active claims | `donations`, `donation_claims` |
| `GET` | `/api/ngo/impact` | `donations` | NGO | None | Food saved, people served, categories| `donation_claims`, `donations` |
| `GET` | `/api/ngo/profile` | `ngo` | NGO | None | NGO profile JSON | `users` |
| `PUT` | `/api/ngo/profile` | `ngo` | NGO | Org name, contact, area, about | Updated profile JSON | `users` |

### File Upload Routes (`routes/upload.py`)
| Method | Endpoint | Blueprint | Role Required | Input | Output / Response | Collections |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/upload-image` | `upload` | Authenticated | Multipart image file | Saved image URL path | File system (`uploads/`) |
| `GET` | `/uploads/<filename>` | `upload` | Public | Filename | Raw image file stream | File system (`uploads/`) |

---

## 15. Frontend Template Inventory & Status

| Template File | Functional Role | Rendered in Route | Operational Status |
| :--- | :--- | :--- | :--- |
| `index.html` | Public landing page | `GET /` | Fully Functional |
| `login.html` | Authentication | `GET /login` | Fully Functional |
| `signup.html` | Role registration | `GET /signup` | Fully Functional |
| `forgot-password.html` | Account recovery | `GET /forgot-password` | Fully Functional |
| `reset-password.html` | Password update | `GET /reset-password` | Fully Functional |
| `dashboard.html` | Provider overview | `GET /dashboard` | Fully Functional |
| `add-listings.html` | Food item creation | `GET /add-listings` | Fully Functional |
| `my-listings.html` | Inventory & Surplus panel | `GET /my-listings` | Fully Functional |
| `requests.html` | Order requests & claims | `GET /requests` | Fully Functional |
| `my-pickups.html` | Scheduled pickups | `GET /my-pickups` | Fully Functional |
| `provider-pickup.html` | Handover management | `GET /provider-pickup` | Fully Functional |
| `provider-profile.html`| Business profile | `GET /provider-profile` | Fully Functional |
| `marketplace.html` | Public food browsing | `GET /marketplace` | Fully Functional |
| `listing-details.html` | Food details & nutrition | `GET /listing/<id>` | Fully Functional |
| `place-order.html` | Portions checkout | `GET /place-order/<id>` | Fully Functional |
| `my-reservations.html` | Customer orders & tokens | `GET /my-reservations` | Fully Functional |
| `user-dashboard.html` | Consumer dashboard | `GET /user-dashboard` | Fully Functional |
| `user-profile.html` | Consumer settings | `GET /user-profile` | Fully Functional |
| `ngo-dashboard.html` | NGO rescue overview | `GET /ngo-dashboard` | Fully Functional |
| `ngo-explore-food.html`| Free surplus catalog | `GET /ngo-explore-food` | Fully Functional |
| `ngo-claims.html` | NGO active claims | `GET /ngo-claims` | Fully Functional |
| `ngo-impact.html` | Environmental analytics | `GET /ngo-impact` | Fully Functional |
| `ngo-profile.html` | NGO profile settings | `GET /ngo-profile` | Fully Functional |
| `admin.html` | Admin portal | Not Rendered | **NOT IMPLEMENTED (0 bytes)** |
| `ai.html` | AI portal | Not Rendered | **NOT IMPLEMENTED (0 bytes)** |
| `donate.html` | Generic donate | Not Rendered | **NOT IMPLEMENTED (0 bytes)** |
| `error.html` | Error handling | Not Rendered | **NOT IMPLEMENTED (0 bytes)** |
| `check-email.html` | Reset notice | Not Rendered | Unused / Static |

---

## 16. JavaScript Client-Side Logic Audit

1. **`add-listings.js` (103 KB):**
   * Manages multi-step listing wizard.
   * Performs client-side image compression and multipart upload via `/api/upload-image`.
   * Implements simulated "AI Analysis": runs mathematical calculations (`calculateFreshness`, `calculateSuggestedPrice`, `calculateMeals`, `calculateCarbon`), updates animated circular progress bars, and sends results in the `POST /api/listings` payload.
2. **`my-listings.js` (50 KB):**
   * Fetches provider inventory from `/api/listings/my`.
   * Renders active cards with pause, duplicate, and delete controls.
   * Integrates the embedded Surplus Donations panel: queries `/api/provider/surplus` and handles the modal to submit free donations via `/api/listings/<id>/donate`.
3. **`requests.js` (38 KB):**
   * Polls and renders customer reservations from `/api/requests`.
   * Manages single-click Accept and Reject actions with optimistic DOM updates and error rollback.
4. **`marketplace.js` (37 KB):**
   * Fetches `/api/listings`.
   * Handles dynamic search keyword matching, dietary badge filtering (Veg / Non-Veg), category selection, and sorting by proximity/price.
5. **`ngo-explore-food.js` (28 KB):**
   * Queries `/api/donations/available`.
   * Renders surplus food donation cards with remaining quantities and pickup deadlines.
   * Handles the Claim modal: captures portion count, intended community shelter, and submits to `/api/donations/<id>/claim`.
6. **`ngo-impact.js` (44 KB):**
   * Fetches aggregated metrics from `/api/ngo/impact`.
   * Renders KPI cards (Total Food Rescued, People Served, Communities Supported).
   * Renders Chart.js visualization for monthly trends and food category distribution.

---

## 17. Security Audit

| Security Feature | Implementation Status | Code Evidence | Notes |
| :--- | :--- | :--- | :--- |
| **Password Hashing** | **IMPLEMENTED** | `werkzeug.security.generate_password_hash` in `routes/auth.py:198` | Uses PBKDF2-SHA256. |
| **Password Verification**| **IMPLEMENTED** | `werkzeug.security.check_password_hash` in `routes/auth.py:363` | Secure constant-time hash comparison. |
| **Session Signatures** | **IMPLEMENTED** | Flask session with signed cookies via `SECRET_KEY` | Client-side tampered sessions are rejected. |
| **ObjectId Validation**| **IMPLEMENTED** | `bson.errors.InvalidId` exception catches across all routes | Prevents BSON format injection and server crashes. |
| **Input Phone Validation**| **IMPLEMENTED** | `routes/auth.py:140`: Checks 10 digits and initial digit in `6789` | Standard Indian telecom format validation. |
| **File Upload Security**| **IMPLEMENTED** | `routes/upload.py`: Whitelisted extensions, 5MB limit, UUID filenames | Prevents path traversal and shell execution. |
| **CORS** | **IMPLEMENTED** | `flask_cors.CORS(app)` in `app.py:22` | Configured globally. |
| **CSRF Protection** | **NOT IMPLEMENTED** | No `flask-wtf` or CSRF tokens in HTML forms | State-changing API requests rely purely on cookie session auth. |
| **Rate Limiting** | **NOT IMPLEMENTED** | No `Flask-Limiter` or request throttling present | Endpoints can be called repeatedly without throttling. |
| **Admin Route Protection**| **NOT APPLICABLE** | Admin module does not exist | No admin endpoints to protect. |

---

## 18. Notifications System Audit

* **Audit Result:** **NOT IMPLEMENTED IN BACKEND / DOCUMENTATION ONLY**.
* **Code Findings:**
  1. No `notifications` collection exists in MongoDB.
  2. No Flask routes matching `/notifications` or `/api/notifications` exist.
  3. The notification bell icons in HTML headers (`dashboard.html`, `ngo-dashboard.html`, `marketplace.html`) are static UI elements. In some JavaScript files (`ngo-claims.js`, `ngo-impact.js`), clicking the bell opens an empty dropdown displaying `"No new notifications"`.

---

## 19. Analytics & Impact Calculation Audit

The system calculates metrics dynamically from completed database records:

### 1. NGO Rescued Food & Meals Formula (`routes/donations.py`)
* **Total Food Collected (kg):**
  Sum of `quantity` across all claims where `ngo_id == current_user` and `status == "completed"`.
* **Successful Pickups:**
  Count of claims with `status == "completed"`.
* **People Served:**
  Direct 1 unit = 1 beneficiary mapping: `people_served = food_collected`.
* **Communities Supported:**
  Count of distinct city/area values from donor locations in completed claims.

### 2. Carbon Offset (CO2 Saved) Formula (`static/js/add-listings.js`)
* Calculated on the client side when a food listing is created:
  `meals = round(quantity / mealWeightKg * categoryFactor)`
  `carbon_saved = meals * 0.32 * dietaryMultiplier` (Meat/Non-Veg = 1.45, Dairy = 1.20, Veg = 1.00)
* The calculated value is submitted with the listing and persisted in `food_listings.carbon_saved`.

---

## 20. Artificial Intelligence / Machine Learning Audit

> [!IMPORTANT]
> **No AI/ML functionality is currently implemented in the inspected codebase.**
> - Files `ml/dynamic_pricing.py`, `ml/freshness.py`, and `ml/waste_prediction.py` are **0 bytes (empty)**.
> - `routes/ai.py` is **0 bytes (empty)**.
> - `requirements.txt` contains no ML libraries (`scikit-learn`, `pandas`, `numpy`, `tensorflow`, `torch`).
> - All "Smart AI" recommendations, pricing suggestions, and freshness scores shown on `add-listings.html` are generated by **deterministic heuristic JavaScript functions** in `static/js/add-listings.js`.

---

## 21. Real-World Dynamic Data vs. Demo / Hardcoded Data

| Component | Nature of Data | Source / Explanation |
| :--- | :--- | :--- |
| **User Accounts** | **100% Dynamic** | Stored and authenticated against MongoDB `users` collection. |
| **Food Listings** | **100% Dynamic** | Created by providers, uploaded to `uploads/`, stored in `food_listings`. |
| **Reservations & Orders** | **100% Dynamic** | Portions decremented via atomic MongoDB operations, stored in `orders`. |
| **Donations & Claims** | **100% Dynamic** | Unsold items published, claimed by NGOs, stored in `donations` and `donation_claims`. |
| **Impact Statistics** | **100% Dynamic** | Computed on the fly in `routes/donations.py:ngo_impact()` from completed claims. |
| **Freshness & Suggested Price** | **Calculated** | Heuristic formula inside `static/js/add-listings.js`. |
| **Distance & Proximity** | **Static / Placeholder** | Shows `"Not available"` or mock `"1.2 km"`; no Google Maps API integrated. |
| **Notifications Dropdown** | **Static Mock** | Static template element with `"No new notifications"`. |

---

## 22. Current Limitations & Incomplete Features

1. **No Admin Module:** Admin files are 0 bytes. If users register with role `"admin"`, they are redirected to the provider dashboard.
2. **On-Demand Lifecycle Trigger:** State transitions occur when API routes are accessed. If no HTTP requests hit the server, listings do not transition in the background until the next request arrives.
3. **No Geolocation / GPS Integration:** Distance calculation between provider and buyer is not dynamically computed via coordinates.
4. **No Real Machine Learning Models:** Stubs in `ml/` are empty; all analysis is client-side heuristic estimation.
5. **No SMS / Email Dispatch:** Reset password and notification flows do not send external emails or SMS messages.

---

## 23. Comprehensive Feature Matrix

| Feature | Provider | Consumer | NGO | Backend Blueprint | MongoDB Collection | Implementation Status |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| **User Registration & Login** | Yes | Yes | Yes | `auth` | `users` | **IMPLEMENTED** |
| **Role-Based Access Control** | Yes | Yes | Yes | `auth`, `ngo`, `app` | `users` | **IMPLEMENTED** |
| **Profile Management** | Yes | Yes | Yes | `auth`, `ngo` | `users` | **IMPLEMENTED** |
| **Food Listing Creation** | Yes | No | No | `listings`, `upload` | `food_listings` | **IMPLEMENTED** |
| **Listing Pause / Delete / Edit** | Yes | No | No | `listings` | `food_listings` | **IMPLEMENTED** |
| **Public Food Marketplace** | No | Yes | No | `listings` | `food_listings`, `users` | **IMPLEMENTED** |
| **Dietary & Category Filtering** | No | Yes | No | `listings` | `food_listings` | **IMPLEMENTED** |
| **Portion Reservation (Order)** | No | Yes | No | `orders` | `orders`, `food_listings` | **IMPLEMENTED** |
| **Atomic Stock Locking** | No | Yes | No | `orders` | `food_listings` | **IMPLEMENTED** |
| **Order Acceptance & Rejection** | Yes | No | No | `orders` | `orders`, `food_listings` | **IMPLEMENTED** |
| **Pickup Code Generation** | Yes | Yes | No | `orders` | `orders` | **IMPLEMENTED** |
| **Pickup Confirmation** | Yes | Yes | No | `orders` | `orders` | **IMPLEMENTED** |
| **Unsold Surplus Rollover** | Yes | No | No | `services.lifecycle` | `food_listings` | **IMPLEMENTED** |
| **Free Donation Publishing** | Yes | No | No | `donations` | `donations`, `food_listings` | **IMPLEMENTED** |
| **NGO Surplus Marketplace** | No | No | Yes | `donations` | `donations` | **IMPLEMENTED** |
| **NGO Claim Submission** | No | No | Yes | `donations` | `donation_claims`, `donations` | **IMPLEMENTED** |
| **NGO Handover Verification** | Yes | No | Yes | `donations` | `donation_claims` | **IMPLEMENTED** |
| **Impact Analytics Dashboard** | No | No | Yes | `donations` | `donation_claims`, `donations` | **IMPLEMENTED** |
| **Image Upload & Storage** | Yes | Yes | Yes | `upload` | File system (`uploads/`) | **IMPLEMENTED** |
| **Lifecycle State Machine** | — | — | — | `services.lifecycle` | All collections | **IMPLEMENTED (Request-Time)** |
| **Admin Control Panel** | No | No | No | `routes/admin.py` | None | **NOT IMPLEMENTED (0 bytes)** |
| **In-App Notifications** | No | No | No | None | None | **NOT IMPLEMENTED (UI only)** |
| **Machine Learning Models** | No | No | No | `ml/*`, `routes/ai.py` | None | **NOT IMPLEMENTED (0 bytes)** |

---

# FINAL VERIFIED ARCHITECTURE

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                               │
│  Jinja2 Templates (HTML5) + Vanilla CSS3 (Glassmorphism) + ES6 JS      │
│  [Provider Dashboard]     [Consumer Marketplace]     [NGO Rescue Hub]  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON REST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                            APPLICATION TIER                            │
│                         Flask 3.1.3 Web Server                         │
│                                                                        │
│  [Route Blueprints]                                                    │
│  ├── auth.py      : Session Auth, PBKDF2 Hashing, User Profiles        │
│  ├── listings.py  : Commercial Listings CRUD & Public Discovery        │
│  ├── orders.py    : Atomic Stock Reservations, Requests, Handover      │
│  ├── donations.py : Surplus Publishing, NGO Claims, Impact Analytics   │
│  ├── ngo.py       : NGO Workspace & Role Verification Guards           │
│  └── upload.py    : File Storage & Validation (5MB Cap, UUID Names)    │
│                                                                        │
│  [On-Demand Business Engine]                                           │
│  └── services/lifecycle.py : State Machine for Window Expiry & Rollover│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ PyMongo Driver (4.17.0)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              DATA TIER                                 │
│                       MongoDB ('reserve_db')                           │
│                                                                        │
│  ├── users           : Providers, Consumers, NGOs credentials & profiles│
│  ├── food_listings   : Commercial food items, prices, pickup windows   │
│  ├── orders          : Consumer reservations, pickup codes, statuses   │
│  ├── donations       : Surplus packages published for charity rescue   │
│  └── donation_claims : NGO claims, beneficiary logs, handover tokens   │
└────────────────────────────────────────────────────────────────────────┘
```

---

# DIAGRAM SOURCE DATA

This structured data is provided so that accurate, standards-compliant diagrams can be generated immediately without assumptions.

### 1. DFD Level 0 (Context Diagram) Data
* **External Entity 1:** `Food Provider`
  * Inputs to System: Credentials, business profile, food listing data (title, quantity, price, window), request accept/reject decisions, surplus donation approvals.
  * Outputs from System: Reservation requests, pickup alerts, active inventory status, donation claim alerts.
* **External Entity 2:** `Consumer`
  * Inputs to System: Credentials, personal profile, search/filter queries, meal portion reservation requests, pickup confirmation.
  * Outputs from System: Available food catalog, reservation confirmation, digital pickup token (`REQ-XXXXXXXX`).
* **External Entity 3:** `NGO Partner`
  * Inputs to System: Credentials, organization profile, surplus donation claims (quantity, beneficiaries), pickup completion confirmation.
  * Outputs from System: Free surplus catalog, claim confirmation token (`RS-C-XXXXXX`), environmental impact metrics (kg food, people served, CO2 offsets).
* **Central Process:** `ReServe Application System (Flask API + Lifecycle Engine)`
* **Data Store:** `MongoDB (reserve_db)`

### 2. DFD Level 1 (Process Decomposition) Data
* **Process 1.0 (Auth & Profile Management):**
  * Inputs: Credentials from all entities.
  * Reads/Writes: `users` store.
* **Process 2.0 (Food Listing & Inventory Management):**
  * Inputs: Listing submission from Provider.
  * Reads/Writes: `food_listings` store, file storage (`uploads/`).
* **Process 3.0 (Consumer Discovery & Reservation Engine):**
  * Inputs: Search filters and reservation orders from Consumer.
  * Reads: `food_listings` store.
  * Writes: `orders` store (creates reservation), `food_listings` store (atomically decrements stock).
* **Process 4.0 (Lifecycle & Surplus Rollover Engine):**
  * Inputs: Current UTC time on API entry (`services/lifecycle.py`).
  * Reads: `food_listings`, `donations`, `orders`.
  * Writes: Updates `food_listings` status to `surplus_pending`, updates `donations` to `expired`, updates `orders` to `ready_for_pickup`.
* **Process 5.0 (NGO Surplus Rescue & Claiming Hub):**
  * Inputs: Provider publishes surplus; NGO claims package.
  * Reads/Writes: `donations` store, `donation_claims` store.
* **Process 6.0 (Order & Claim Fulfillment):**
  * Inputs: Token verification from Provider/Consumer/NGO.
  * Writes: Updates `orders` and `donation_claims` to `completed`.

### 3. Use Case Diagram Data
* **Actor 1: Food Provider**
  * Use Cases: Register / Login, Manage Provider Profile, Create Food Listing, Manage Active Inventory, Review Customer Requests, Accept/Reject Reservation, View Scheduled Pickups, Publish Expired Surplus to NGOs, Approve/Reject NGO Claims.
* **Actor 2: Consumer**
  * Use Cases: Register / Login, Manage User Profile, Browse & Filter Food Listings, View Listing Details, Place Portion Reservation, View My Reservations & Pickup Token, Cancel Reservation, Confirm Food Received.
* **Actor 3: NGO Partner**
  * Use Cases: Register / Login, Manage NGO Profile, Explore Free Surplus Donations, Claim Surplus Food Package, Track Claim History & Pickups, Cancel Claim, View Environmental Impact Analytics.
* **Relationships:**
  * `Place Portion Reservation` *<<includes>>* `Atomic Stock Decrement`.
  * `Publish Expired Surplus` *<<extends>>* `Manage Active Inventory`.
  * `Accept/Reject Reservation` *<<includes>>* `Verify Authentication`.

### 4. Entity-Relationship (ER) Data
* **Entity `USERS`:** `_id` (PK), `full_name`, `email`, `phone`, `password`, `role`, `provider_id`, `business_name`, `organization_name`, `address`, `city`, `state`, `pincode`, `opening_time`, `closing_time`, `profile_image`.
* **Entity `FOOD_LISTINGS`:** `_id` (PK), `owner_id` (FK -> `USERS._id`), `food_title`, `category`, `food_type`, `listing_type`, `quantity`, `unit`, `original_price`, `discounted_price`, `expiry_date`, `pickup_start`, `pickup_end`, `description`, `image`, `carbon_saved`, `status`.
* **Entity `ORDERS`:** `_id` (PK), `request_id`, `listing_id` (FK -> `FOOD_LISTINGS._id`), `requester_id` (FK -> `USERS._id`), `provider_id` (FK -> `USERS._id`), `quantity`, `unit_price`, `amount`, `total_amount`, `pickup_date`, `pickup_time`, `status`.
* **Entity `DONATIONS`:** `_id` (PK), `listing_id` (FK -> `FOOD_LISTINGS._id`), `provider_id` (FK -> `USERS._id`), `food_title`, `quantity`, `available_quantity`, `donation_pickup_start`, `donation_pickup_end`, `status`.
* **Entity `DONATION_CLAIMS`:** `_id` (PK), `donation_id` (FK -> `DONATIONS._id`), `ngo_id` (FK -> `USERS._id`), `provider_id` (FK -> `USERS._id`), `quantity`, `intended_beneficiaries`, `status`.
* **Cardinalities:**
  * `USERS` (1) to `FOOD_LISTINGS` (N)
  * `USERS` (1) to `ORDERS` (N)
  * `FOOD_LISTINGS` (1) to `ORDERS` (N)
  * `FOOD_LISTINGS` (1) to `DONATIONS` (0..1)
  * `DONATIONS` (1) to `DONATION_CLAIMS` (N)
  * `USERS` (1) to `DONATION_CLAIMS` (N)

### 5. UML Class / Architecture Data
* **Module `config.database`:** `init_mongo(app)`, `get_database()`, `get_collection(name)`.
* **Module `routes.auth`:** `signup()`, `login()`, `logout()`, `get_provider_profile()`, `update_provider_profile()`, `get_user_profile()`, `update_user_profile()`.
* **Module `routes.listings`:** `create_listing()`, `get_public_listings()`, `get_my_listings()`, `get_listing(id)`, `update_listing(id)`, `toggle_pause_listing(id)`, `duplicate_listing(id)`, `delete_listing(id)`.
* **Module `routes.orders`:** `place_order()`, `get_requests()`, `get_provider_pickups()`, `accept_request(id)`, `reject_request(id)`, `get_user_reservations()`, `cancel_user_reservation(id)`, `confirm_pickup(id)`.
* **Module `routes.donations`:** `provider_surplus()`, `publish_donation(id)`, `available_donations()`, `claim_donation(id)`, `ngo_claims()`, `approve_donation_claim(id)`, `reject_donation_claim(id)`, `complete_claim(id)`, `cancel_claim(id)`, `ngo_impact()`.
* **Module `services.lifecycle`:** `refresh_lifecycle(now)`, `_refresh_listing_lifecycle(listings, now)`, `_refresh_donation_lifecycle(donations, listings, now)`, `_refresh_claim_lifecycle(claims, donations, now)`, `_refresh_reservation_lifecycle(orders, users, now)`.

### 6. State Machine Data
* **Entity: Food Listing**
  * `available` -> `completed` (Trigger: consumer reserves all quantity)
  * `available` -> `paused` (Trigger: provider toggles pause)
  * `paused` -> `available` (Trigger: provider toggles pause)
  * `available` -> `surplus_pending` (Trigger: `now >= pickup_end` and `quantity > 0`)
  * `surplus_pending` -> `completed` (Trigger: provider publishes donation, donation lifecycle ends)
* **Entity: Order (Reservation)**
  * `[*] ` -> `pending` (Trigger: consumer places order)
  * `pending` -> `accepted` (Trigger: provider accepts)
  * `pending` -> `rejected` (Trigger: provider rejects, stock restored)
  * `pending` -> `cancelled` (Trigger: consumer cancels, stock restored)
  * `accepted` -> `ready_for_pickup` (Trigger: scheduled pickup date & opening time reached)
  * `ready_for_pickup` -> `completed` (Trigger: customer confirms pickup)
* **Entity: Donation**
  * `[*] ` -> `available` (Trigger: provider publishes surplus)
  * `available` -> `claimed` (Trigger: `available_quantity == 0`)
  * `available` -> `expired` (Trigger: `now >= donation_pickup_end`)
  * `claimed` -> `completed` (Trigger: claim completed)
* **Entity: Donation Claim**
  * `[*] ` -> `pending` (Trigger: NGO claims surplus package)
  * `pending` -> `confirmed` (Trigger: provider approves)
  * `pending` -> `cancelled` (Trigger: provider rejects / NGO cancels, stock restored)
  * `pending` / `confirmed` -> `expired` (Trigger: parent donation expires)
  * `confirmed` -> `completed` (Trigger: NGO collects food)
