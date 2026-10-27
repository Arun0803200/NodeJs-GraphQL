# User Guide — NodeJs-GraphQL Multi-Person Portfolio Platform

## What Is This?

A **full-stack multi-person portfolio platform** with a GraphQL API backend and React.js frontend. Multiple users can register, authenticate, and manage their own portfolios. Admins can manage all users and data. Guests can view public portfolios.

### Access Levels

| Role    | Description                                |
|---------|--------------------------------------------|
| **Admin** | Full CRUD on all users and portfolio data |
| **User**  | Manage own portfolio (profile, experience, projects, skills, education, awards) |
| **Guest** | Read-only public access to any portfolio   |

---

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **PostgreSQL** (v12 or higher)
- **AWS Account** with an S3 bucket and IAM credentials

---

## Installation

### 1. Clone & Install

```bash
git clone <repository-url>
cd NodeJs-GraphQL

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Set Up PostgreSQL

```sql
CREATE DATABASE user_portfolio;
CREATE USER root WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE user_portfolio TO root;
```

Tables are auto-created on startup via TypeORM's `synchronize` feature.

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# AWS
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=your-s3-bucket-name

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=root
DB_PASSWORD=your_database_password
DB_NAME=user_portfolio

# Server
PORT=4000

# JWT
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d
```

### 4. (Optional) Run Migration

If you prefer manual migration over auto-sync:

```bash
psql -U root -d user_portfolio -f src/migrations/001_initial_multi_user.sql
```

### 5. Start the Application

**Backend** (from project root):
```bash
npm start
```
Backend starts at: **http://localhost:4000/graphql**

**Frontend** (from `frontend/` directory):
```bash
cd frontend
npm run dev
```
Frontend starts at: **http://localhost:5173**

The frontend `.env` file (`frontend/.env`) contains:
```env
VITE_API_URL=http://localhost:4000/graphql
```

---

## Authentication

All authenticated endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Register a New User

```graphql
mutation {
  register(
    fullName: "John Doe"
    designation: "Full Stack Developer"
    email: "john@example.com"
    password: "securePassword123"
    mobileNo: "1234567890"
    address: "Sydney, Australia"
    socialMedia: [
      { name: "GitHub", url: "https://github.com/johndoe" }
    ]
  ) {
    status
    message
    token
    data {
      userUuid
      fullName
    }
  }
}
```

### Login

```graphql
mutation {
  login(email: "john@example.com", password: "securePassword123") {
    status
    message
    token
    data {
      userUuid
      fullName
    }
  }
}
```

### Get Current User

```graphql
query {
  me {
    status
    data {
      fullName
      email
    }
  }
}
```

---

## Creating an Admin

Admins must be created manually or via an existing admin account.

**Option 1: Via database** (first admin):
```sql
-- First register normally via the API, then update the role:
UPDATE tbl_auth SET role = 'admin' WHERE email = 'admin@example.com';
```

**Option 2: Via admin API** (subsequent admins):
```graphql
mutation {
  adminCreateUser(
    fullName: "New Admin"
    designation: "Platform Admin"
    email: "newadmin@example.com"
    password: "securePassword"
    role: "admin"
  ) {
    status
    message
  }
}
```

---

## User Panel — Managing Your Portfolio

All `my*` operations use your JWT token to identify you. No UUID needed.

### Profile

```graphql
query { myProfile { status data { fullName designation email } } }

mutation {
  updateMyProfile(fullName: "John D.", designation: "Senior Developer") {
    status message
  }
}
```

### About Section

```graphql
mutation {
  upsertMyAbout(
    title: "About Me"
    description: "Brief intro"
    longDescription: "Detailed background..."
    totalExperience: 5
    totalProjects: 12
    totalAwards: 3
  ) { status message }
}

query { myAbout { status data { title description } } }
```

### Experience

```graphql
mutation {
  addMyExperience(
    companyName: "Acme Corp"
    companyUrl: "https://acme.com"
    companyLocation: "Sydney"
    designation: "Senior Dev"
    startDate: "2022-01-15"
    isCurrentlyWorking: true
    jobDescription: "Leading backend..."
    skills: ["Node.js", "GraphQL"]
  ) { status message }
}

query { myExperiences(limit: 10, offset: 0) { status data { companyName designation } } }
```

### Projects

```graphql
mutation {
  addMyProject(
    projectName: "Portfolio API"
    projectDescription: "A GraphQL portfolio platform"
    projectUrl: "https://github.com/user/project"
    projectStartDate: "2024-01-01"
    projectLongDescription: "Full details..."
    keyFeatures: ["Multi-user", "JWT Auth"]
    technologiesSkills: ["Node.js", "TypeScript"]
    isCurrentProject: true
  ) { status message }
}
```

### Skills, Awards, Education

```graphql
mutation { addMySkills(tittle: "Backend", skills: ["Node.js", "PostgreSQL", "GraphQL"]) { status } }
mutation { addMyAward(title: "Best Developer", description: "Annual award", companyId: 1, eventDate: "2025-12-01") { status } }
mutation { addMyEducation(degree: "B.Sc", fieldOfStudy: "Computer Science", institution: "MIT", institutionLocation: "USA", startYear: "2018", endYear: "2022") { status } }
```

---

## Admin Panel

All admin operations require `role: admin` in the JWT.

```graphql
# List all users
query { adminGetAllUsers(limit: 20, offset: 0) { status total data { userUuid fullName email } } }

# Platform stats
query { adminGetStats { totalUsers totalActiveUsers totalImages } }

# Deactivate a user
mutation { adminDeactivateUser(uuid: "user-uuid-here") { status message } }

# View/manage any user's portfolio sections
query { adminGetExperiences(userUuid: "user-uuid") { data { companyName } } }
query { adminGetProjects(userUuid: "user-uuid") { data { projectName } } }
query { adminGetSkills(userUuid: "user-uuid") { data { tittle skills } } }
query { adminGetAwards(userUuid: "user-uuid") { data { title } } }
query { adminGetEducation(userUuid: "user-uuid") { data { degree institution } } }
query { adminGetContactMessages(limit: 20) { data { senderName message } } }
```

---

## Guest Panel — Public Portfolio Viewing

No authentication required. Access any user's public portfolio by UUID.

```graphql
query { getPublicProfile(uuid: "user-uuid") { data { fullName designation socialMedia { name url } } } }
query { getPublicAbout(userUuid: "user-uuid") { data { title description } } }
query { getPublicExperiences(userUuid: "user-uuid") { data { companyName designation } } }
query { getPublicProjects(userUuid: "user-uuid") { data { projectName projectDescription } } }
query { getPublicSkills(userUuid: "user-uuid") { data { tittle skills } } }
query { getPublicAwards(userUuid: "user-uuid") { data { title description } } }
query { getPublicEducation(userUuid: "user-uuid") { data { degree institution } } }
query { getPublicImages(userUuid: "user-uuid", limit: 6) { data { imageUrl } } }
```

### Submit Contact Form

```graphql
query {
  submitContactMessage(
    userUuid: "portfolio-owner-uuid"
    senderName: "Jane Smith"
    senderEmail: "jane@example.com"
    message: "I'd like to connect!"
  ) { status message }
}
```

---

## File Uploads

Use **Altair GraphQL Client** or `curl` with `graphql-upload` protocol:

```bash
curl http://localhost:4000/graphql \
  -H "Authorization: Bearer <token>" \
  -F operations='{"query":"mutation($file: Upload!) { uploadFile(file: $file, uuid: \"your-uuid\") { status message url } }","variables":{"file":null}}' \
  -F map='{"0":["variables.file"]}' \
  -F 0=@/path/to/image.jpg
```

---

## React Frontend

The project includes a React.js frontend in the `frontend/` directory.

### Frontend Routes

| Route                    | Panel | Description                     |
|--------------------------|-------|---------------------------------|
| `/`                      | Guest | Template store (default landing page): Free / Premium templates with prices |
| `/templates/:slug`       | Guest | Template details and live preview |
| `/templates/:slug/customize` | Guest | Fill in details with live preview, then publish (asks to sign in / register) |
| `/auth/forgot-password`  | Auth  | Request a password reset email |
| `/auth/reset-password?token=` | Auth | Set a new password from the emailed link |
| `/admin/templates`       | Admin | Manage templates: category, original / discount price, visibility |
| `/admin/approvals`       | Admin | Review submitted websites: preview, approve & publish, request changes, take down |
| `/user/website`          | User  | Approval status, reviewer notes, resubmit, take offline |
| `/:userName`             | Guest | Public portfolio, e.g. `/arun-palani` |
| `/auth/login`            | Auth  | Login page                      |
| `/auth/register`         | Auth  | Registration page               |
| `/admin`                 | Admin | Dashboard with platform stats   |
| `/admin/users`           | Admin | User list with create/deactivate|
| `/admin/users/:uuid`     | Admin | User detail with all sections   |
| `/admin/messages`        | Admin | Contact form messages           |
| `/user`                  | User  | Dashboard with section counts   |
| `/user/profile`          | User  | Edit profile                    |
| `/user/about`            | User  | Edit about section              |
| `/user/experience`       | User  | CRUD work experience            |
| `/user/projects`         | User  | CRUD projects                   |
| `/user/skills`           | User  | CRUD skills by category         |
| `/user/awards`           | User  | CRUD awards                     |
| `/user/education`        | User  | CRUD education history          |
| `/user/images`           | User  | View uploaded images            |

### Frontend Architecture

- **Apollo Client** connects to the backend GraphQL API
- **JWT tokens** stored in `localStorage`, sent as `Authorization: Bearer` header
- **Protected routes** enforce authentication and role-based access
- **Admin users** see a sidebar link to switch to User Panel
- Auto-redirects: unauthenticated users go to login; wrong role redirects to correct panel

---

## Troubleshooting

| Issue                              | Solution                                                    |
|------------------------------------|-------------------------------------------------------------|
| `Database connection error`        | Check PostgreSQL is running and `.env` credentials          |
| `Missing AWS Configuration`        | Ensure all `AWS_*` vars are in `.env`                       |
| `Missing JWT_SECRET`               | Add `JWT_SECRET` to `.env`                                  |
| `Access denied` on admin APIs      | Ensure your account has `role: admin` in `tbl_auth`         |
| `Not authenticated`                | Include `Authorization: Bearer <token>` header              |
| `Token expired`                    | Login again to get a fresh token                            |
| File upload fails                  | Check S3 bucket exists and IAM has write access             |
| Frontend can't reach backend       | Check `VITE_API_URL` in `frontend/.env` matches backend URL |
| Frontend blank page                | Run `npm install` in `frontend/`, then `npm run dev`        |


## Templates & Publishing

- 20 templates are seeded automatically on server start (2 Free, 18 Premium); only missing slugs are inserted, so admin edits are kept.
- Prices: a Premium template shows its discount price with the original price struck out; without a discount only the original price is shown. Free templates show "Free".
- Guests fill in their details (saved in the browser) and preview any template. Publishing requires sign-in.
- **Admin approval:** "Publish" submits the website for review. It goes live at `/<username>` only after an admin approves it in `/admin/approvals`. Later edits are submitted again; the previously approved version stays online until the new one is approved. Users get an email on approval or when changes are requested.
- **Images:** users can upload a profile photo, cover image, project images, certificate images and a photo album (JPG/PNG/WEBP/GIF, max `MAX_UPLOAD_MB`, default 5 MB). Uploads need sign-in.
- **Storage:** `STORAGE_DRIVER=local` (default) saves files in `UPLOAD_DIR` (default `uploads/`); `STORAGE_DRIVER=s3` uses the AWS bucket. Either way images are served by the API at `PUBLIC_API_URL/media/...`, so the S3 bucket can stay private. Set `PUBLIC_API_URL` to the public backend URL in production.
- Register needs only email, username, password and confirm password. Login accepts email or username.
- Forgot password emails a 30-minute reset link. Configure SMTP in `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL`). Without `SMTP_HOST`, the reset link is printed in the server console.
- Payment for Premium templates is not integrated yet — publishing a premium template currently does not charge.


## Image Upload API

Uploads need a signed-in user (`Authorization: Bearer <token>`) and use the GraphQL multipart request format. Send the header `Apollo-Require-Preflight: true`.

Every image is checked by its real content (JPG, PNG, WEBP, GIF; max `MAX_UPLOAD_MB`, default 10 MB). It is auto-rotated, stripped of EXIF/GPS metadata, and saved in three WebP sizes: `-w400`, `-w800` and `-w1600`. Images are never upscaled. Store `url` (the largest size) in content; templates derive the smaller sizes for `srcset`.

```graphql
# One image (profile photo, cover, certificate, project image)
mutation ($file: Upload!) {
  uploadMyImage(file: $file) {
    status message url
    data { id fileName url width height srcSet variants { width url } }
  }
}

# Up to 10 images at once (album). Each file gets its own result, in the order sent.
mutation ($files: [Upload!]!) {
  uploadMyImages(files: $files) {
    status message uploaded failed
    results { fileName status message data { url width height srcSet } }
  }
}
```

```bash
curl http://localhost:4000/graphql -H "Authorization: Bearer <token>" -H "Apollo-Require-Preflight: true" \
  -F operations='{"query":"mutation($fs:[Upload!]!){ uploadMyImages(files:$fs){ uploaded failed results { fileName status message data { url } } } }","variables":{"fs":[null,null]}}' \
  -F map='{"0":["variables.fs.0"],"1":["variables.fs.1"]}' \
  -F 0=@photo1.jpg -F 1=@photo2.png
```

Website content fields that hold images: `photoUrl`, `coverUrl`, `projects[].imageUrl`, `certifications[].imageUrl` and `album[] { url, caption }`. All of them are optional.

## Tamil & English, Samples for Every Trade

- **App language:** the storefront, builder and sign-in screens have an EN / தமிழ் switch in the header. The choice is remembered in the browser, and Tamil is the default for browsers set to Tamil.
- **Website languages:** a website can have an English version, a Tamil version, or both. In the builder, the **Website language** tabs switch between them. A missing version can be started by copying the other language, from a sample, or blank. Photos, phone, WhatsApp, email and links are shared between languages; all text is per language. Visitors see an EN / தமிழ் toggle on the published site when both versions exist. `/<username>?lang=ta` opens the Tamil version directly.
- **Sample profiles:** corporate professional, bike & car mechanic, electrician, AC technician, home caterer and shop owner, each in both languages with sample photos (Unsplash / Pexels). "Show samples for" on the home page previews every template with that profile. `?for=mechanic` (or `electrician`, `ac-technician`, `caterer`, `shop`) carries the choice to the detail and builder pages.
- **Business sections:** services with prices and photos, customer reviews, WhatsApp number (click-to-chat) and business hours. They sit alongside the career sections, and every section is optional.
- **Stored format:** website content is saved as `{ version: 2, defaultLang, languages: { en, ta } }`. Older single-language content is still read as English.

## Masters (Lookup Lists)

Admins manage every dropdown/suggestion list from **Admin Panel → Masters** (`/admin/masters`). Each master (e.g. Degrees) holds values that can be added one by one or pasted in bulk, edited, reordered, activated/deactivated and deleted. A master can have a parent master so its values are grouped (Skills are grouped by Skill Categories).

Seeded on first start (system masters — code locked, cannot be deleted): `skill_category`, `skill`, `degree`, `field_of_study`, `designation`, `social_platform`, `template_tag`. Admins can add their own masters too.

Forms read them from the API, so changes apply immediately. Users can still type values that are not in a master.

```graphql
# Public — one master, optionally only children of a parent value
query { masters(typeCode: "skill", parentCode: "backend") { data { id code label parentLabel } } }

# Public — several masters in one request
query { masterBundle(typeCodes: ["degree", "field_of_study"]) { data { typeCode options { label } } } }
```

Admin operations (role `admin`): `adminMasterTypes`, `adminCreateMasterType`, `adminUpdateMasterType`, `adminDeleteMasterType`, `adminMasterValues(typeId, search, status)`, `adminCreateMasterValue`, `adminUpdateMasterValue`, `adminSetMasterValuesActive(ids, isActive)`, `adminDeleteMasterValues(ids)`, `adminBulkAddMasterValues(typeId, labels, parentId)`, `adminReorderMasterValues(items)`.

## Analytics, API Logs & Activity Log

**Admin Panel → Dashboard** (`/admin`) shows, for the last 24 hours / 7 / 30 / 90 days (each compared with the period before it):

- **API health:** requests, success rate, failed requests (errors + rejections), response time (average and 95th percentile), API traffic per hour/day by outcome, per-operation table (most called / most failures / slowest) and the most frequent errors.
- **Site traffic:** visitors, first-time visitors, page views, visits, pages per visit, single-page visits, top pages, traffic sources, device / browser / OS, and a weekday × hour "busiest times" heatmap. Only public pages count (storefront, builder, portfolios, sign-in); admin and user panel pages are excluded.
- **Business:** new accounts, sign-ins and failed sign-ins, websites submitted and published, contact messages, plus current platform totals.
- **Attention strip:** API errors, sites waiting for approval and repeated failed sign-ins link straight to the relevant log.
- Auto-refreshes every minute; every chart has "View as table".

**API Logs** (`/admin/api-logs`) lists every GraphQL request: operation, outcome, duration, user, IP and error. Outcomes: **Success**, **Rejected** (the resolver answered `status: 0`, e.g. wrong password or not found) and **Error** (the request threw, e.g. access denied). Filter by range, outcome, type, operation or search; "Live" refreshes every 10 s; rows open a detail view; "Export CSV" downloads the current page.

**Activity Log** (`/admin/activity`) is the audit trail: one entry per mutation with who did it, what it targeted, the outcome and the arguments. Passwords, tokens and secrets are replaced with `[redacted]`; large content is omitted.

How it is collected:

- An Apollo plugin (`src/Utils/analytics.ts`) records each request into `tbl_api_events` and each mutation into `tbl_activity_logs`. Introspection and the analytics screens' own requests are not recorded.
- The frontend sends a page view on each route change (`trackPageView`) into `tbl_page_views`, using a random visitor id stored in the browser. Bots are ignored and browsers with Do Not Track enabled are not tracked.
- A daily cleanup removes old rows. Optional env settings (defaults shown):

```
API_EVENT_RETENTION_DAYS=90
PAGE_VIEW_RETENTION_DAYS=365
ACTIVITY_RETENTION_DAYS=365
```

Admin GraphQL operations: `adminAnalytics(range)`, `adminApiEvents(filter)`, `adminActivityLogs(filter)`.

## Managing Users

**Admin Panel → Users** (`/admin/users`):

- **Summary tiles** (all, active, deactivated, admins, new in 30 days, live websites) double as one-click filters.
- **Search** by name, username, email, mobile or designation; **filter** by role, account status, website state (live / awaiting approval / changes requested / draft / none), profile completeness and join date. Filters live in the URL, so a filtered view can be bookmarked or shared.
- **Sort** by name, email, profile completeness, last active or join date; choose 10–100 rows per page.
- Each row shows role, account status, website state (with a link when live), how many of the 7 portfolio sections are filled, and when the user last used the app.
- **Row menu (⋯):** view/edit profile, open website, view the user's activity, copy email, make admin / remove admin access, activate / deactivate.
- **Bulk actions:** select rows to activate, deactivate or export them. **Export CSV** downloads every user matching the current filters.
- Safeguards: you can't deactivate yourself or remove your own admin access, and the last active admin can't be demoted. Role changes and deactivation take effect on the user's next request.

GraphQL: `adminUsers(filter)`, `adminSetUsersActive(uuids, isActive)`, `adminSetUserRole(uuid, role)`.

## Contact Messages & Inbox

- **Visitors** reach a portfolio owner through the **Message me** button on every published website (and the form on the classic portfolio page). The form checks name, email and message length, ignores bots (hidden honeypot field) and limits each IP to 5 messages per 10 minutes. The owner gets an email notification when SMTP is configured (otherwise it is printed in the server log).
- **Users** read their messages in **My portfolio → Inbox** (`/user/messages`): folders (Inbox, Starred, Archived, All), search, a reading pane, *Reply by email* (opens the mail app with the message quoted), star, archive, mark unread, delete, bulk actions and CSV export. Opening a message marks it read; the sidebar shows the unread count.
- **Admins** see every message on the platform in **Admin → Messages** (`/admin/messages`), with the recipient, whether the owner has read it, search and CSV export. Admins can delete spam but do not change an owner's read/star/archive state.

GraphQL: `sendContactMessage(input)` (public), `myMessages(filter)`, `updateMyMessages(ids, action)`, `adminMessages(filter)`, `adminUpdateMessages(ids, "delete")`, `navCounts(scope)`.

## Travels / Taxi Templates & Trip Booking

Four templates for car owners, travels and cab services, each in English and Tamil: **Travels Saffron** (free), **Cab Midnight**, **Tour Emerald** and **Ride Royal** (premium). Pick "Travels & taxi owner" under *Start from a sample* to begin with a complete example.

**What customers can do on the website**

1. Choose **City ride**, **One-way drop** or **Round trip**, search pickup and drop locations (or use their current location), date/time, vehicle and passengers.
2. See an instant estimate: road distance and travel time, a route map, the **toll plazas on the route** (count and names), km charge, **driver bata (padi)**, tolls and the total.
3. Enter name and mobile (optionally email, notes and a preferred driver) and press **Confirm & send on WhatsApp**. The booking is saved and WhatsApp opens with all trip, customer, driver and fare details addressed to the owner's number.

**What the owner sets (builder → "Trips & online booking")**

| Setting | Default | Meaning |
|---|---|---|
| City ₹/km · Long drive ₹/km | 20 · 15 | Per-km rates; each vehicle can override them |
| City limit (km) | 40 | Longer "city" trips are priced as outstation |
| Minimum city fare | ₹300 | |
| One-way minimum km | 130 | Billed km for short one-way drops |
| Round trip minimum km/day | 250 | Billed per calendar day |
| Driver bata per day | ₹400 | Outstation; city bata separately |
| Average toll per plaza | ₹120 | Multiplied by plazas crossed (×2 for round trips) |
| Longest trip accepted | 0 (no limit) | |
| Booking WhatsApp number | owner's WhatsApp | Where bookings are sent |

Vehicles (photo, type, seats, AC, features, own rates) and drivers (photo, phone, experience, languages, licence number, validity, licence photo) are managed in the same section. Licence numbers are always shown masked (e.g. `TN09 •••••• 2345`); the licence photo is only published when the owner ticks *Show the licence photo* for that driver.

**Bookings** — owners see every request in **My portfolio → Trip bookings** (`/user/bookings`): status (new → confirmed → completed / cancelled), customer call/WhatsApp, Google Maps directions, fare breakdown, private notes and CSV export. The sidebar shows how many new bookings are waiting, and an email is sent for each booking when SMTP is configured.

**How fares are calculated** — the server always recomputes the fare from the owner's *published* rates, so the browser cannot change prices. Distances come from OSRM, place search from Nominatim and toll plazas from OpenStreetMap (a snapshot of ~2,800 Indian toll booths ships with the app and refreshes weekly into `.cache/`). Toll amounts are estimates; actuals depend on the receipt. Optional env settings: `NOMINATIM_URL`, `OSRM_URL`, `OVERPASS_URL`, `GEO_USER_AGENT` (set a contact email for production use of the public OpenStreetMap services, or point these at self-hosted instances for high traffic).

GraphQL: `placeSearch`, `placeReverse`, `tripQuote` (public), `createTripBooking` (public), `myTripBookings`, `updateMyTripBooking`.

### Driver hiring ("Drive with us")

Travel websites show a **Drive with us** section (with a top-bar link) where drivers apply:

- **Details:** name, mobile, email (optional), age, area, years of experience, licence number, licence type (LMV / LMV transport-badge / HMV), licence validity, vehicles they can drive, languages, availability (full-time / part-time / weekends / on call), city or outstation preference, expected salary, own vehicle, notes, and consent.
- **Photos:** applicant photo and licence front (required), licence back (optional). JPG/PNG/WEBP up to 10 MB; location data inside photos is removed.
- On **Submit & send on WhatsApp** the application is saved and WhatsApp opens with the details addressed to the owner's booking WhatsApp number (documents stay on the website).
- Checks: valid 10-digit mobile, Indian licence number format, licence not expired, age 18–70, one pending application per mobile, 3 applications per hour per device, hidden bot trap.

Owners turn it on/off and write "What you offer drivers" in the builder (**Trips & online booking → Driver hiring**), and review applications in **My portfolio → Driver applications** (`/user/drivers`): status tabs (new / shortlisted / hired / rejected), document previews, call/WhatsApp the applicant, private notes, CSV export and **Delete** (removes the application and its photos).

**Privacy:** applicant photos and licences are stored under `private/` and are never served by the public `/media` route. The owner's page receives signed links (`/private-media/...`) that expire after one hour.

GraphQL: `applyAsDriver(input, photo, licenseFront, licenseBack)` (public, multipart), `myDriverApplications`, `updateMyDriverApplication`, `deleteMyDriverApplication`.

### Ratings & reviews (travel templates)

Builder → **Ratings & reviews**: turn reviews on, choose moderation (*I approve each review* — default — or *Show immediately*), and add any number of **rating types**. Each type has a name (English/Tamil), what it rates and optional sub-ratings:

| Rates | Where it shows on the website |
|---|---|
| My business | **Ratings & reviews** section: average, star count, sub-rating bars, latest reviews, "Write a review" |
| Each driver | On every driver card: average stars, count, the driver's reviews, "Rate" button |
| Each vehicle | On every vehicle card, the same way |

Owners who don't want driver or vehicle reviews simply don't add those types. Visitors give 1–5 stars, optional sub-ratings, a comment, their name and (privately) their mobile. Owners approve, hide, reply publicly or delete in **My portfolio → Reviews** (`/user/reviews`). The builder preview shows clearly labelled sample reviews.

### Custom forms

Builder → **Custom forms**: create any number of forms (title, description, button text, "open WhatsApp after submitting", show/hide). Questions can be: short text, long text, number, email, mobile number, date, time, dropdown, single choice, multiple choice and yes/no tick box — each with a label, hint text, required flag and choices, in both languages. Every enabled form appears as its own section on the website. Answers are validated on the server against the published form, saved, emailed to the owner (when SMTP is set) and listed in **My portfolio → Form submissions** (`/user/forms`) with filters, notes, call/WhatsApp and CSV export.

### Page layout (drag & drop)

Builder → **Page layout** lists every section of the page (rates, fleet, drivers, reviews, drive with us, services, about, featured quotes, gallery, each custom form, terms, contact). Drag a row (or use ↑/↓ on touch screens and keyboards) to reorder, and the eye button to hide/show. The preview updates instantly; the top banner with the booking card always stays first. Empty sections show a placeholder in the preview and are left out of the live site. Menu links follow the layout.

GraphQL: `publicReviews`, `submitReview`, `submitSiteForm` (public); `myReviews`, `moderateMyReview`, `deleteMyReview`, `myFormSubmissions`, `updateMyFormSubmission`, `deleteMyFormSubmission` (owner).

## Contact us (platform enquiries)

Every published website ends with a slim **"Website by Portfolia — Want a website like this for your business? Contact us"** strip (in the site's language), and the storefront has **Contact us** in its menu and footer. "Coming soon" pages show the same button.

The form asks for name, mobile, optional email, what they need (a website, pricing, help with a website, partnership, other) and a message. On submit the enquiry is saved, the admins see it in **Admin → Business enquiries** (`/admin/enquiries`, with a sidebar badge), and WhatsApp opens with the enquiry addressed to the platform number.

Configure in the server `.env`:

```
ADMIN_WHATSAPP=919840012345   # country code + number; without it enquiries are still saved, WhatsApp is skipped
ADMIN_EMAIL=you@example.com   # optional email copy of each enquiry
```

Restart the API after changing these. GraphQL: `contactPlatform` (public), `adminPlatformLeads`, `adminUpdatePlatformLead`, `adminDeletePlatformLead`.

## Undo & redo in the website builder

The builder's top bar has **Undo** and **Redo** buttons (தமிழ்: செயல்தவிர் / மீண்டும் செய்). They cover every change: text, photos, list items added/removed/reordered, trips & booking settings, reviews, forms and page layout drag-and-drop.

- Shortcuts: **Ctrl+Z** / **⌘Z** to undo; **Ctrl+Shift+Z**, **⌘⇧Z** or **Ctrl+Y** to redo.
- Typing in one box counts as one step, so Undo reverts the whole word or sentence, not one letter.
- Up to 100 steps are kept. Making a new change after undoing clears the Redo steps.
- Loading your saved website, or opening the builder with a sample, is the starting point. It is not an undo step.
- History lasts while the builder is open. Your draft itself is still saved in the browser as before.
