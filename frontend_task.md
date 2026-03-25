# Frontend Task List — AgriFlow

AgriFlow is a farm investment platform that connects verified farmers to investors. The backend is live and connected to a Supabase database. Your job is to build the frontend — pages, components, routing, and full API integration — from the ground up.

---

## What is live on the backend right now

```http
# Auth
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/auth/admin/login
POST /api/v1/auth/logout
POST /api/v1/auth/renew-access-token
GET  /api/v1/auth/me

# KYC — Farmers
POST /api/v1/farmers/verify-bvn
POST /api/v1/farmers/bank-account

# KYC — Investors
POST /api/v1/investors/verify-bvn
POST /api/v1/investors/bank-account

# Crops Reference
GET  /api/v1/crops
GET  /api/v1/crops/{crop_id}/estimate?farm_size_ha=5.0

# Banks List
GET  /api/v1/banks   (seeded — ~500 Nigerian banks)

# Farms (Phase 1E)
POST /api/v1/farms/          (Step 1: Core Details -> creates DRAFT)
POST /api/v1/farms/{id}/uploads (Step 2: Photos & Location -> submits for review as PENDING)
GET  /api/v1/farms/          (All active farms)
GET  /api/v1/farms/my-farms  (Farmer's own listings)
GET  /api/v1/farms/{id}      (Full detail incl. milestones)

# Admin (Phase 2A)
GET  /api/v1/admin/farms/pending    (List farms awaiting approval)
POST /api/v1/admin/farms/{id}/approve
POST /api/v1/admin/farms/{id}/reject
GET  /api/v1/admin/milestones/pending (List milestones under review)
POST /api/v1/admin/milestones/{id}/approve
POST /api/v1/admin/milestones/{id}/reject
GET  /api/v1/admin/stats            (Global platform statistics)

# Milestones (Phase 2B)
POST /api/v1/milestones/{id}/proof  (Submit photo + GPS proof)

# Investments (Phase 2C)
POST /api/v1/investments/initiate  (Get Interswitch params)
POST /api/v1/investments/verify    (Server-side verification)
GET  /api/v1/investments/          (Investor's history)
```

---

## Part 1: API Client Setup

### Task 1 — Axios Base Instance

Create a shared API client (e.g. `src/utils/api.js`):

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // e.g. http://localhost:8000/api/v1
  withCredentials: true, // ← critical: sends httpOnly cookies on every request
  headers: { "Content-Type": "application/json" },
});

export default api;
```

Create a `.env` file in the frontend root:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Task 2 — Token Renewal Interceptor

Add a response interceptor to the axios instance:

```
Request fails with 401
  → POST /api/v1/auth/renew-access-token   (cookies sent automatically)
  → backend sets new access_token cookie
  → retry the original request
  → if renewal also fails → clear user state → redirect to /auth
```

---

## Part 2: Authentication

### Task 3 — Signup (`/auth` signup tab)

Form fields: `first_name`, `last_name`, `email`, `password`, `role` (farmer | investor). Optionally `business_name`.

```json
POST /api/v1/auth/signup
{
  "first_name": "Adebayo",
  "last_name": "Olusola",
  "email": "adebayo@gmail.com",
  "password": "password123",
  "role": "farmer",
  "business_name": "Olusola Farms"   // optional
}
```

Response `data` contains: `uid`, `first_name`, `last_name`, `email`, `role`.  
Tokens are set as **httpOnly cookies** — you do not receive them in the body.

- On `201` → store user in context → redirect to `/farmer/dashboard` or `/investor/dashboard` based on `role`.
- On `409` → show "An account with these details already exists."
- On `422` → show field validation errors.

### Task 4 — Login (`/auth` login tab)

```json
POST /api/v1/auth/login
{
  "email": "adebayo@gmail.com",
  "password": "password123",
  "role": "farmer"
}
```

- On `200` → same redirect logic as signup.
- On `400` → show "Invalid credentials."

### Task 5 — Admin Login (`/admin/login`)

Separate page, no role selector.

```json
POST /api/v1/auth/admin/login
{
  "email": "admin@agriflow.ng",
  "password": "Admin123!"
}
```

- On `200` → redirect to `/admin/dashboard`.
- On `400` → show "Invalid credentials."

### Task 6 — Logout

```
POST /api/v1/auth/logout   → cookies cleared by backend
→ clear local user state → navigate to /auth
```

### Task 7 — Demo Quick-Access Buttons

The auth page has "Quick demo access" buttons. Wire them to auto-fill and submit the real login endpoint using preloaded seeded credentials:

```
Farmer View   → email: farmer1@agriflow.ng  | password: Farmer123!  | role: farmer
Investor View → email: investor1@agriflow.ng | password: Invest123! | role: investor
Admin View    → redirect to /admin/login, auto-fill: admin@agriflow.ng / Admin123!
```

---

## Part 3: User Profile & Route Protection

### Task 8 — `/auth/me` on Dashboard Load

Call `GET /api/v1/auth/me` when any dashboard mounts. Use the response to:

- Populate global user state (React context or Zustand).
- Determine KYC status via `bvn_verified` and `bank_verified`.

Response shape for farmers:

```json
{
  "uid": "...",
  "first_name": "Adebayo",
  "last_name": "Olusola",
  "email": "adebayo@gmail.com",
  "business_name": "Olusola Farms",
  "role": "farmer",
  "bvn_verified": false,
  "bank_verified": false,
  "trust_score": 0,
  "trust_tier": "unrated",
  "is_active": true
}
```

`trust_score` and `trust_tier` are always `null` for investors — never display them in the investor UI.

### Task 9 — Route Protection

Ensure `App.jsx` routing wrappers check the real role from `/auth/me`:

| Route                 | Allowed role |
| --------------------- | ------------ |
| `/farmer/dashboard`   | `farmer`     |
| `/investor/dashboard` | `investor`   |
| `/admin/dashboard`    | `admin`      |

Wrong role → redirect to `/auth`.

---

## Part 4: KYC Verification (BVN + Bank)

Both farmer and investor KYC flows follow the same pattern, with one important difference: **trust score and tier are only shown to farmers, never investors.**

### Task 10 — KYC Banner

If `bvn_verified: false` OR `bank_verified: false`, show a persistent top banner in the respective dashboard:

- Farmers: _"Complete your verification to start listing farms. Verify BVN → Add Bank Account"_
- Investors: _"Complete your verification to start investing. Verify BVN → Add Bank Account"_

Banner disappears when both are `true`.

### Task 11 — BVN Verification Modal/Step

Triggered from the KYC banner. Collects the 11-digit BVN.

```json
POST /api/v1/farmers/verify-bvn    (or /investors/verify-bvn)
{ "bvn": "12345678901" }
```

- `bvn` must be exactly 11 digits (enforce on frontend too).
- On success for **farmers** → the response includes `trust_score` and `trust_tier`. Display these immediately in a result screen before advancing to the bank step:

```
┌─────────────────────────────────────────────┐
│  ✅ BVN Verified                            │
│                                             │
│  Your Trust Score                           │
│  65 / 100  ████████░░  Emerging Farmer      │  ← amber badge
│                                             │
│  Add your bank account to boost your score  │
│  and unlock full access.                    │
│                                             │
│            [ Continue → ]                  │
└─────────────────────────────────────────────┘
```

- On success for **investors** → show "BVN Verified ✅" and proceed to bank step. No score shown.
- On error → show backend error message.

### Task 12 — Bank Account Modal/Step

Triggered after BVN is verified. Requires two fields:

```json
POST /api/v1/farmers/bank-account    (or /investors/bank-account)
{
  "bank_code": "044",         // from the banks list
  "account_num": "0123456789" // exactly 10 digits
}
```

**Bank Name Dropdown:** Fetch `GET /api/v1/banks` to populate a searchable dropdown of all Nigerian banks. Use `code` as the value sent to the API and `name` for display.

On success for **farmers** → the response includes updated `trust_score` and `trust_tier`. Show a completion screen:

```
┌─────────────────────────────────────────────┐
│  ✅ Bank Account Added                      │
│  We confirmed this account belongs to       │
│  MICHAEL JOHN DOE. Is this you?             │
│                                             │
│  Your Updated Trust Score                   │
│  90 / 100  █████████░  Verified Farmer      │  ← green badge
│                                             │
│  🎉 Keep earning points by completing       │
│  farm milestones and harvest reports.       │
│                                             │
│          [ Go to Dashboard ]                │
└─────────────────────────────────────────────┘
```

Update global state immediately with `bank_verified: true`, `trust_score`, and `trust_tier` — do not wait for a `/me` refetch. The dashboard trust score card should reflect the new values instantly.

On success for **investors** → show confirmed account name and proceed. No score shown.

### Task 13 — KYC Constraints

- Farmers **cannot** submit the Create Farm form until `bvn_verified: true` AND `bank_verified: true` — disable/block the wizard submit.
- Investors **cannot** complete an investment until fully verified — disable "Invest Now" and show a prompt to complete KYC.

---

## Part 5: Farm Creation Wizard (Farmer Dashboard)

### Task 14 — Text Steps + Upload Submission Flow

The Create Farm tab remains guided, but the final "Submit for Review" action happens on the upload page.
All text/budget/timeline values are entered first, then files/GPS are collected immediately before submission.

Important: there is no backend autosave endpoint for each individual UI step.
The frontend should keep values in local state (or persisted client state) and send them when the user submits.

**UI Flow:**
- **Step 1 — Details**: Crop selector, Name, State, LGA, Size, Description.
- **Step 2 — Budget**: Total Budget (validated against crop reference).
- **Step 3 — Timeline & Yields**: Start/Harvest dates, Expected Yield, Sale Price, Return Rate.
- **Step 4 — Review**: Show all text inputs for confirmation.
- **Step 5 — Upload & Submit for Review**: Collect location photo, optional display photos, latitude, longitude, then submit.

**API Sequence (on Step 5 submit):**
1.  **Step 1: Create Record**
    ```javascript
    POST /api/v1/farms/
    {
      "crop_reference_id": "...",
      "name": "...",
      "state": "...",
      "lga": "...",
      "farm_size_ha": 5.0,
      "description": "...",
      "total_budget": 500000,
      "expected_yield": 4.5,
      "sale_price_per_unit": 120000,
      "return_rate": 0.15,
      "start_date": "2026-05-01",
      "harvest_date": "2026-11-01"
    }
    ```
    - Response `201` returns the `id` of the new farm.
    - Farm is created with `farm_status = "draft"`.
    - If `403` → show KYC error (redirect to settings).

2.  **Step 2: Upload Files & Location**
    ```javascript
    POST /api/v1/farms/{id}/uploads
    Content-Type: multipart/form-data
    - latitude: 6.5244
    - longitude: 3.3792
    - location_photo: [binary]
    - display_photos: [binary array]
    ```
    - On success:
      - Backend generates milestones.
      - Backend changes `farm_status` from `draft` to `pending`.
      - Farm enters admin review queue.
      - Redirect to success screen.

**Submission state rules:**
- A farm in `draft` is not yet submitted for admin review.
- Upload step is the submission boundary.
- Backend only allows upload-submission for farms still in `draft`.

**API contract for frontend integration:**
- `POST /api/v1/farms/` success (`201`): returns a wrapper with `success`, `message`, and `data` (farm object). Frontend must read `data.id` and use it for the upload endpoint.
- `POST /api/v1/farms/{id}/uploads` success (`200`): returns a wrapper with `success`, `message`, and `data` (updated farm object). Frontend should treat this as final submission completion.

**Expected error handling (must be implemented):**
- Create farm (`POST /api/v1/farms/`)
  - `403`: KYC incomplete (BVN or bank not verified). Show blocking banner and route user to verification flow.
  - `404`: Crop reference missing/inactive. Show "Selected crop is not available" and ask user to reselect.
  - `400`: business validation errors (budget too high, yield too high, return rate too high, invalid timeline, harvest date not in future). Show backend `detail` message inline on review step.
  - `500`: generic server failure. Show retry toast and preserve form state.
- Upload and submit (`POST /api/v1/farms/{id}/uploads`)
  - `400`: farm is not in `draft` (already submitted). Show "This farm has already been submitted for review" and disable submit.
  - `403`: user is not farm owner. Show permission error and redirect to My Farms.
  - `404`: farm not found. Show not found state and refresh listing.
  - `422`: invalid multipart/form-data payload (missing/invalid latitude, longitude, or file fields). Highlight upload form fields.
  - `500`: upload/setup failure. Show retry option; keep local files queued for resubmission where possible.

### Task 14B — Milestone Proof Submission
Farmers must submit evidence (photo + GPS) to advance their milestones to `under_review`.

**Endpoint:**
```http
POST /api/v1/milestones/{id}/proof
Content-Type: multipart/form-data
- photo: [binary]
- gps_latitude: float
- gps_longitude: float
- gps_accuracy_m: float (optional)
- note: string (optional)
```

**GPS Accuracy ("Circle of Uncertainty"):**
Nigerian rural farms often have poor signal. Always send `gps_accuracy_m` (from `GeolocationCoordinates.accuracy`). 
- **High Accuracy (3m-15m):** Uses GPS/WiFi. Very precise.
- **Low Accuracy (500m+):** Uses Cell Towers. The backend "Smart Guard" uses this to be lenient if the farmer is slightly outside the 1km zone but has a weak signal.

**GPS Flags in Response:**
- `pass`: Within 1km. Auto-passes initial location check.
- `warning`: 1km – 5km. Triggers manual admin review of the photo.
- `fail`: > 5km. Likely fraudulent; show warning to farmer: *"You appear to be too far from the farm. Please stand on the registered land."*

---

## Part 6: UI Features

### Task 15 — Landing Page (`/`)

- Hero: "Browse Active Farms" → `/farms`, "List Your Farm" → `/auth` (signup tab, role=farmer pre-selected).
- Add sample farm preview card with a progress bar and milestone breakdown.
- Add three trust stats: "No hidden fees", "Verified farmers only", "Harvest-backed returns".

### Task 16 — Farm Marketplace (`/farms`)

- Sort dropdown: newest, funding %, return rate, deadline.
- Filter bar: by crop type, state, status.
- Farm cards must show:
  - The primary image from `listing_display_picture_url[0]`.
  - Remaining days to investment deadline.
  - Farmer trust tier badge next to the farmer's name. Use the colour system below — **never use red for any tier.**

```
verified  → green badge   "Verified Farmer"
emerging  → amber badge   "Emerging Farmer"
unrated   → grey badge    "Unrated"
```

### Task 17 — Farm Detail Page (`/farms/:id`)

- Milestone timeline showing locked / pending proof / under review / verified / disbursed states clearly. These come from `farm.milestones`.
- Budget breakdown bar or table.
- ROI scenario cards (Conservative, Expected, Optimistic).
- **Farmer profile section** — show the farmer's trust tier badge and trust score from `farm.farmer`.
- **Photos**: Use `full_display_picture_url` (array) for the gallery.

Add an info tooltip on the trust score:

> "AgriFlow's trust score combines BVN identity verification, credit history, and bank account verification. A higher score means a stronger financial track record. All farmers on AgriFlow are BVN-verified."

This reassures investors that even an Unrated farmer is not a fraud risk — they simply have a limited credit history.

- Investment panel:
  - Not logged in → "Invest Now" saves state and routes to `/auth`.
  - Logged in but not KYC verified → "Complete your KYC to invest."

### Task 17B — Investment Payment Flow (Interswitch)

When an investor clicks "Invest Now", follow this server-side-first flow to ensure security and auditability.

**1. Modal Input**
Collect the investment `amount` (minimum ₦5,000).

**2. Step 1: Backend Initiation**
Call the backend to register the intent and generate a secure `txn_ref`.
```javascript
POST /api/v1/investments/initiate
{
  "farm_id": "...",
  "amount": 10000 // Naira
}
```
Response `data` contains: `txn_ref`, `amount_kobo`, `merchant_code`, `payment_item_id`, `customer_email`, `customer_name`.

**3. Step 2: Load Interswitch Script**
Include the Interswitch Inline Checkout script in your `index.html` or load it dynamically:
```html
<script src="https://newwebpay.qa.interswitchng.com/inline-checkout.js"></script>
```

**4. Step 3: Launch WebPay**
Call `window.webpayCheckout` using the parameters received from the backend:
```javascript
const params = {
    merchant_code: data.merchant_code,
    pay_item_id: data.payment_item_id,
    txn_ref: data.txn_ref,
    amount: data.amount_kobo,
    currency: 566, // Naira ISO code
    cust_name: data.customer_name,
    cust_email: data.customer_email,
    mode: 'TEST', // Change to 'LIVE' for production
    onComplete: (response) => {
        // Step 4: Server-side Verification
        verifyPayment(data.txn_ref);
    }
};

window.webpayCheckout(params);
```

**5. Step 4: Reliable Verification**
*Never* trust the browser-side response for the final outcome. You **must** call the backend verification endpoint:
```javascript
POST /api/v1/investments/verify
{
  "txn_ref": "AGF-XXXXX"
}
```
- If `status: "confirmed"` → show success lottie/toast → redirect to "My Investments" dashboard.
- If `status: "failed"` → show error message with `failure_reason`.
- If `status: "pending"` → show "Processing..." and offer a "Retry Verification" button.

### Task 18 — Farmer Dashboard Pages

The farmer dashboard always shows the trust score card in a visible position (e.g. top of the overview tab). It reflects the current values from global state — no separate fetch needed.

```
┌─────────────────────────────┐
│ Your Trust Score            │
│                             │
│  90 / 100                   │
│  █████████░  Verified Farmer│  ← green progress bar, green badge
│                             │
│  Complete more farms to     │
│  earn additional points     │
└─────────────────────────────┘
```

If the farmer has not yet completed BVN verification, show a placeholder:

```
┌─────────────────────────────┐
│ Your Trust Score            │
│                             │
│  Complete KYC verification  │
│  to receive your score      │
└─────────────────────────────┘
```

Other tabs:

- **My Farms Tab:** Warning for `deadline_passed` farms with "Extend Deadline" and "Cancel & Refund Investors" actions.
- **My Farms Tab Status UX:**
  - Show `draft` farms as "Incomplete" with a "Continue Submission" action that routes to the upload step.
  - Show `pending` farms as "Under Admin Review" and disable milestone interactions.
- **Milestones Tab:** "Submit Proof" button opens a photo uploader + optional GPS capture UI.
- **Harvest Reports Tab:** Form for actual yield and total sales, shown only for farms with all milestones disbursed.
- **Settings Tab:** Update name/email. Payout details — bank dropdown (from `/api/v1/banks`), account number, account name.

### Task 19 — Investor Dashboard Pages

- **Expected Payouts Tab:** 5-step progress tracker — Invested → Milestones Done → Harvest Collected → Proceeds In → Payout Sent. Link to `/receipts/:id` once processed.
- **Settings Tab:** Same as farmer — update account info and payout bank details.

### Task 20 — Admin Dashboard Pages

The Admin Dashboard is the nerve center for platform safety and financial integrity. All endpoints are prefixed with `/api/v1/admin` and require an active Admin session.

- **Stats Overview:** Call `GET /api/v1/admin/stats` on mount to populate the top-level metric cards:
    - Total Farms, Active Farms, Pending Reviews (sum of pending farms and milestones), Total Investors, Total Farmers, Total Funds Raised.

- **Pending Farms Tab:** Call `GET /api/v1/admin/farms/pending`.
    - Display cards with crop name, farmer name, and **Trust Tier badge**.
    - "Approve" calls `POST /api/v1/admin/farms/{id}/approve`.
    - "Reject" calls `POST /api/v1/admin/farms/{id}/reject` (requires `reason` in body, min 10 chars).

- **Milestone Proofs Tab:** Call `GET /api/v1/admin/milestones/pending`.
    - List milestones with `status: "under_review"`.
    - Each card must show: `farm_name`, `farmer_name`, `amount`, and the **Proof Photo**.
    - Display GPS Metadata: `proof_latitude`, `proof_longitude`, `gps_distance_km`, and the `gps_flag` ("pass" | "warning" | "fail").
    - "Approve" calls `POST /api/v1/admin/milestones/{id}/approve`.
    - "Reject" calls `POST /api/v1/admin/milestones/{id}/reject` (requires `reason` in body).

- **Payouts Tab:** "Initiate All Transfers" block for ready payouts via Interswitch (Backend logic for this is coming in Phase 3).

**UI Context Note:** Admins see full farmer details during review (BVN/Bank status, account details) which help in verifying the legitimacy of the listing.

---

## Trust Tier Colour System — Global Rule

**Never use red for any trust tier.** Every farmer on AgriFlow is BVN-verified. The tiers reflect depth of financial history, not trustworthiness or character.

| Tier       | Score range | Badge colour   | Label           |
| ---------- | ----------- | -------------- | --------------- |
| `verified` | 75 – 100    | Green          | Verified Farmer |
| `emerging` | 50 – 74     | Amber / orange | Emerging Farmer |
| `unrated`  | 0 – 49      | Grey           | Unrated         |

This colour system applies everywhere a tier appears: farmer dashboard, farm listing cards, farm detail pages, and admin review cards.

---

## Summary: What's Live vs What's Coming

| Feature                     | Status            |
| --------------------------- | ----------------- |
| Signup (farmer / investor)  | ✅ Live           |
| Login (farmer / investor)   | ✅ Live           |
| Admin login                 | ✅ Live           |
| Logout                      | ✅ Live           |
| Token renew interceptor     | ✅ Ready to build |
| Get current user (`/me`)    | ✅ Live           |
| BVN verification (farmer)   | ✅ Live           |
| Bank account (farmer)       | ✅ Live           |
| BVN verification (investor) | ✅ Live           |
| Bank account (investor)     | ✅ Live           |
| Crops list + estimate       | ✅ Live           |
| Banks list                  | ✅ Live (seeded)  |
| KYC banner & constraints    | ✅ Ready to build |
| Route protection            | ✅ Ready to build |
| Farm CRUD                   | ✅ Live (2-Step)  |
| Admin Dashboard API (2A)    | ✅ Live           |
| Investments API             | ✅ Live (2C)      |
| Milestone proof submissions | ✅ Live           |
| Payouts API                 | ⏳ Coming soon    |

Your priority is: **Tasks 1–13 first** (API client, auth, KYC). Once those are done the KYC and dashboard experience will be fully functional with real data. Farm creation (Task 14) can run in parallel: text steps can be built with crops data, then wired to the final upload-submission step (`/farms/{id}/uploads`).
