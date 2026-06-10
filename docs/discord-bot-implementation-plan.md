# DeliverU Discord Bot — Detailed Implementation Plan

## 1. System Architecture Overview

### What This Bot Is

The DeliverU Discord Bot is a **standalone** food delivery coordination system for HKUST students living in Halls X, XI, XII, and XIII. It runs entirely within Discord, using slash commands, buttons, dropdowns, modals, threads, and direct messages. No external website or mobile app is required. All data lives in a local SQLite database, and temporary files (such as QR code screenshots) are stored in a local folder on the machine hosting the bot.

### Why Standalone

This bot is a **separate beta test** from the existing React Native + FastAPI DeliverU app. It shares the same **business rules** where specified (100 starting credits, 1 credit per order, 1 credit per delivery, same canteen list, same 5-state order machine), but it has its own database, its own user accounts tied to Discord IDs, and its own command namespace. Nothing in the bot talks to the existing backend.

### Core Design Principles

- **Discord-native UX**: Every interaction happens through Discord primitives. Order creation uses dropdowns and modals. QR codes are uploaded as Discord attachments. Chat happens in private Discord threads. Ratings use star-button modals.
- **Role-based visibility**: A public order listing shows only safe information. Sensitive details (items, room numbers, QR codes) are shared only in DMs or private threads.
- **State machine tracking**: Every order follows the exact same progression as the existing app: `pending` → `accepted` → `picked_up` → `delivered`, with `cancelled` as an alternate end state.
- **Credit ledger**: Every credit change is recorded as a transaction row. The user's balance is the sum of all their transactions. This prevents race conditions and allows full auditing.
- **Hall-centric filtering**: The bot only supports Halls X, XI, XII, and XIII. All matching and filtering defaults to the user's assigned hall.

### Technology Stack

- **Language**: Python 3.10+
- **Discord Library**: `pycord` (recommended for richer UI components like modals, views, and buttons) or `discord.py` 2.x with `discord.app_commands`
- **Database**: SQLite via `aiosqlite` (async SQLite driver)
- **Process Manager**: `pm2` or `systemd` for auto-restart
- **Hosting**: Any always-on machine (dorm PC, lab server, VPS)
- **File Storage**: Local filesystem for QR code images and delivery photos

---

## 2. Database Schema Design

The bot uses a single SQLite file (`deliveru_bot.db`). All tables use `INTEGER PRIMARY KEY AUTOINCREMENT` for simplicity, except where Discord IDs are natural keys.

### Users Table

Stores every Discord user who completes profile setup.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `discord_id` | `TEXT` | `PRIMARY KEY` | The user's Discord ID (snowflake) |
| `nickname` | `TEXT` | `NOT NULL` | Display name within the bot |
| `hall` | `TEXT` | `NOT NULL` | One of: Hall X, Hall XI, Hall XII, Hall XIII |
| `delivery_preference` | `TEXT` | `NOT NULL` | `dorm_room` or `hall_lobby` |
| `order_times` | `TEXT` | | JSON array of preferred time slots |
| `is_deliverer` | `INTEGER` | `DEFAULT 0` | Boolean: 0 = no, 1 = yes |
| `is_available` | `INTEGER` | `DEFAULT 0` | Boolean: real-time availability toggle |
| `preferred_delivery_halls` | `TEXT` | | JSON array of halls this deliverer prefers |
| `credits` | `INTEGER` | `DEFAULT 100` | Current credit balance (derived from ledger, but cached here for speed) |
| `average_rating` | `REAL` | | Running average of all ratings received |
| `total_ratings` | `INTEGER` | `DEFAULT 0` | Number of ratings received |
| `total_deliveries` | `INTEGER` | `DEFAULT 0` | Lifetime deliveries completed |
| `total_orders` | `INTEGER` | `DEFAULT 0` | Lifetime orders placed |
| `profile_setup_at` | `TEXT` | `ISO 8601` | When profile was first completed |

**Notes**:
- `credits` is cached for fast reads, but the **source of truth** is the `credit_transactions` table. On every credit change, update both the transaction row and this cached value.
- `is_available` only matters when `is_deliverer = 1`. A deliverer can toggle this on/off without redoing setup.

### Orders Table

The central entity. One row = one delivery request.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Internal order ID (shown to users) |
| `orderer_id` | `TEXT` | `NOT NULL, FK → users.discord_id` | Who placed the order |
| `deliverer_id` | `TEXT` | `FK → users.discord_id, NULLABLE` | Who accepted the order |
| `status` | `TEXT` | `NOT NULL, DEFAULT 'pending'` | One of: `pending`, `accepted`, `picked_up`, `delivered`, `cancelled` |
| `canteen` | `TEXT` | `NOT NULL` | One of: LG1, LSK, Asia Pacific, Oliver Super Sandwich |
| `items` | `TEXT` | `NOT NULL` | JSON array of `{name, qty, price}` objects |
| `total_price` | `REAL` | `NOT NULL` | Total HKD amount |
| `delivery_hall` | `TEXT` | `NOT NULL` | Destination hall |
| `delivery_preference` | `TEXT` | `NOT NULL` | `dorm_room` or `hall_lobby` |
| `room_number` | `TEXT` | | Room number (only if `delivery_preference = dorm_room`) |
| `qr_code_url` | `TEXT` | | Discord CDN URL of the uploaded QR image |
| `qr_code_local_path` | `TEXT` | | Local filesystem path where the image is saved |
| `qr_uploaded_at` | `TEXT` | `ISO 8601` | When the QR was uploaded |
| `note` | `TEXT` | | Special instructions from orderer |
| `group_order_id` | `INTEGER` | `FK → orders.id, NULLABLE` | If this order is part of a group order, points to the root order |
| `is_group_root` | `INTEGER` | `DEFAULT 0` | Boolean: 1 if this order is the host/root of a group |
| `is_group_open` | `INTEGER` | `DEFAULT 0` | Boolean: 1 if this root order is open for joiners |
| `tip_amount` | `INTEGER` | `DEFAULT 0` | Extra tip credits offered by the orderer |
| `chat_thread_id` | `TEXT` | | Discord thread ID for the order's private chat |
| `created_at` | `TEXT` | `NOT NULL, ISO 8601` | When order was placed |
| `accepted_at` | `TEXT` | `ISO 8601` | When a deliverer accepted |
| `picked_up_at` | `TEXT` | `ISO 8601` | When deliverer marked picked up |
| `delivered_at` | `TEXT` | `ISO 8601` | When deliverer marked delivered |
| `cancelled_at` | `TEXT` | `ISO 8601` | When the order was cancelled |
| `expires_at` | `TEXT` | `ISO 8601` | Auto-expiration time (30 minutes after creation) |

**Notes**:
- The `id` is displayed to users as the order number (e.g., "Order #42").
- `group_order_id` is a self-referencing foreign key. The root order has `is_group_root = 1` and `is_group_open = 1`. Child orders point to the root.
- `expires_at` is set to `created_at + 30 minutes`. A background task checks for expired pending orders every 5 minutes.

### Credit Transactions Table

Ledger of every credit change. This is the **source of truth** for balances.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Transaction ID |
| `user_id` | `TEXT` | `NOT NULL, FK → users.discord_id` | Who received or lost credits |
| `amount` | `INTEGER` | `NOT NULL` | Positive for credit gain, negative for loss |
| `reason` | `TEXT` | `NOT NULL` | Human-readable reason: `order_placed`, `delivery_completed`, `order_cancelled_refund`, `welcome_bonus`, `tip_received`, `tip_paid`, etc. |
| `order_id` | `INTEGER` | `FK → orders.id, NULLABLE` | Related order, if any |
| `created_at` | `TEXT` | `NOT NULL, ISO 8601` | Transaction timestamp |

### Group Order Participants Table

Junction table linking users to group orders.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `group_order_id` | `INTEGER` | `NOT NULL, FK → orders.id` | The root group order |
| `participant_id` | `TEXT` | `NOT NULL, FK → users.discord_id` | The joining user |
| `items` | `TEXT` | `NOT NULL` | JSON array of this participant's items |
| `note` | `TEXT` | | Participant's special instructions |
| `tip_amount` | `INTEGER` | `DEFAULT 0` | This participant's tip contribution |
| `joined_at` | `TEXT` | `NOT NULL, ISO 8601` | When they joined |
| `order_id` | `INTEGER` | `FK → orders.id, NULLABLE` | The child order created for this participant |

**Primary Key**: Composite (`group_order_id`, `participant_id`)

### Ratings Table

Mutual reviews after delivery.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Rating ID |
| `order_id` | `INTEGER` | `NOT NULL, FK → orders.id` | Related order |
| `rater_id` | `TEXT` | `NOT NULL, FK → users.discord_id` | Who gave the rating |
| `ratee_id` | `TEXT` | `NOT NULL, FK → users.discord_id` | Who received the rating |
| `stars` | `INTEGER` | `NOT NULL, CHECK(1-5)` | 1 to 5 stars |
| `feedback` | `TEXT` | | Optional text comment |
| `created_at` | `TEXT` | `NOT NULL, ISO 8601` | When rating was submitted |

**Constraint**: Unique (`order_id`, `rater_id`, `ratee_id`) — one rating per direction per order.

### Order Timeline Table

Audit log of every status change.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Entry ID |
| `order_id` | `INTEGER` | `NOT NULL, FK → orders.id` | Related order |
| `status` | `TEXT` | `NOT NULL` | The new status |
| `changed_by_id` | `TEXT` | `NOT NULL, FK → users.discord_id` | Who triggered the change |
| `note` | `TEXT` | | Optional context |
| `created_at` | `TEXT` | `NOT NULL, ISO 8601` | Timestamp |

---

## 3. Module Specifications

### Module 1: Profile System

**Purpose**: Onboard new users and manage delivery preferences.

**Commands**:

- `/dc_setup` — Launches a multi-field modal. If the user already has a profile, the modal is pre-filled with current values (acts as an edit flow too).
  - Fields collected:
    - `nickname`: Text input, 2–20 characters, no spaces.
    - `hall`: Dropdown with 4 options: Hall X, Hall XI, Hall XII, Hall XIII.
    - `delivery_preference`: Dropdown with 2 options: "Dorm Room" (`dorm_room`) or "Hall Lobby" (`hall_lobby`).
    - `order_times`: Multi-select dropdown from time slots (7:00-9:00, 9:00-11:00, 11:00-13:00, 13:00-15:00, 15:00-17:00, 17:00-19:00, 19:00-21:00, 21:00-23:00).
    - `is_deliverer`: Toggle (yes/no). If yes, also ask for `preferred_delivery_halls` (multi-select from the 4 halls).
  - On first-time setup: creates the `users` row, sets `credits = 100`, logs a `welcome_bonus` transaction of +100, and replies with a confirmation embed.
  - On edit: updates the row and replies with "Profile updated."

- `/dc_profile` — Displays a rich embed showing:
  - Nickname and hall
  - Credit balance
  - Reputation score (average rating, or "New User" if < 3 ratings)
  - Total deliveries completed and total orders placed
  - Delivery preference and order times
  - Deliverer status (enabled/disabled) and availability (online/offline)

- `/dc_toggle` — Switches `is_available` on or off. Only works if `is_deliverer = 1`.
  - If toggling ON: confirms with "You are now visible to orderers."
  - If toggling OFF: confirms with "You are now offline. Active deliveries are unaffected."

- `/dc_hall` — Subcommands:
  - `view` — Shows current hall assignment.
  - `change` — Dropdown to select a new hall from the 4 options. Updates the user's row.

**Logic**:
- If any command other than `/dc_setup` is run by an unregistered user, reply with an ephemeral message: "You need to set up your profile first. Use `/dc_setup`."
- Hall selection is restricted to the 4 supported halls.
- `is_available` defaults to OFF even if `is_deliverer = 1`. The user must explicitly toggle ON.

---

### Module 2: Order Creation System

**Purpose**: Allow users to create food delivery requests.

**Commands**:

- `/dc_order` — Starts the order creation flow.
- `/dc_my_orders` — Lists the user's active and recent orders (last 10).
- `/dc_cancel <order_id>` — Cancels a pending order.

**Flow Implementation**:

**Step 1 — Initiate**
User runs `/dc_order`. Bot checks:
- Is the user registered? If no, prompt to `/dc_setup`.
- Does the user have >= 1 credit? If no, reply "Insufficient credits. You need at least 1 credit to place an order. Deliver an order to earn credits."
- Does the user already have an active order (status `pending`, `accepted`, or `picked_up`)? If yes, reply "You already have an active order. Complete or cancel it first."

If all checks pass, bot sends an ephemeral message with a dropdown for canteen selection:
- Options: LG1, LSK, Asia Pacific, Oliver Super Sandwich.

**Step 2 — Canteen Selected**
Bot sends a DM to the user:
- Message: "Please place your order on the [Canteen Name] website. Once you've paid and have the QR code or order confirmation, click the button below."
- Includes a button: "I've Completed My Order".

**Step 3 — Order Completed on Website**
User clicks "I've Completed My Order". Bot prompts:
- "Please upload a screenshot of your QR code or order confirmation. You can attach an image to your next message."

User uploads an image. Bot:
- Validates: file type must be PNG, JPEG, or WebP. Max file size 5MB.
- Saves the image to a local directory: `./qr_codes/qr_{order_id}_{timestamp}.png`.
- Stores the Discord CDN URL in `qr_code_url`.
- Stores the local path in `qr_code_local_path`.
- Sets `qr_uploaded_at`.
- Replies with a thumbnail preview: "QR code received. Does this look correct?"
- Offers two buttons: "Looks Good" and "Re-upload".

**Step 4 — Delivery Details**
After QR confirmation, bot asks for special instructions via a text modal.
Then bot asks for delivery location:
- If user's profile `delivery_preference = dorm_room`: asks for room number via text input.
- If `hall_lobby`: skips room number, uses "Lobby".

**Step 5 — Tip (Optional)**
Bot asks: "Would you like to add a tip? This encourages deliverers to accept your order faster."
- Buttons: "No Tip", "+1 Credit", "+2 Credits", "+3 Credits".
- Tip is added to `tip_amount`.

**Step 6 — Final Confirmation**
Bot shows a summary embed:
- Canteen
- Items list (from the `items` JSON — user must have entered these earlier, see note below)
- Total price
- Delivery hall and room/lobby
- Tip amount
- Total credit cost: 1 base + tip

User clicks "Confirm Order". Bot:
- Deducts 1 + tip credits from user's balance.
- Logs a `credit_transaction` row: `amount = -(1 + tip)`, `reason = "order_placed"`, `order_id = new_order_id`.
- Creates the `orders` row with status `pending`.
- Sets `expires_at = now + 30 minutes`.
- Posts a public summary embed in the designated orders channel.

**Public Order Listing Format**:
- Title: "New Order — #{order_id}"
- Fields shown publicly:
  - Canteen
  - Destination Hall
  - Tip amount
  - Time posted
- Fields NOT shown publicly:
  - Orderer's name
  - Specific items
  - Room number
  - QR code

**Note on Items Input**: The original plan mentions the bot asking for a list of items. The simplest approach is to ask the user to type their item list in a modal before Step 1, or after canteen selection. Each item is parsed as `name`, `qty`, and `price` and stored as JSON in the `items` column. For the beta, a simple text modal where the user types something like "2x Rice Bowl @ 45 HKD, 1x Iced Tea @ 15 HKD" can be parsed, or use a multi-step modal. For simplicity in the plan, the bot should collect items as a formatted text block and the developer can choose to parse it or store it as free text.

**Cancel Logic** (`/dc_cancel <order_id>`):
- Only the orderer can cancel.
- Only cancellable when status is `pending`.
- Bot shows a confirmation modal: "Are you sure? Your 1 credit + tip will be refunded."
- On confirm:
  - Refund 1 + tip credits.
  - Log transaction: `amount = +(1 + tip)`, `reason = "order_cancelled_refund"`.
  - Set status to `cancelled`, set `cancelled_at`.
  - Delete the QR code file from disk.
  - Remove the public listing from the orders channel.
  - Reply: "Order #{id} has been cancelled and your credits have been refunded."

---

### Module 3: Delivery Acceptance and Tracking

**Purpose**: Enable deliverers to find, accept, and track deliveries.

**Commands**:

- `/dc_find` — Displays available orders.
- `/dc_accept <order_id>` — Accepts a specific order.
- `/dc_update <order_id> <status>` — Updates order status.
- `/dc_my_deliveries` — Shows active deliveries.

**Find Command Flow** (`/dc_find`):
Bot queries all orders with `status = 'pending'` and `expires_at > now`.
Default filter: same hall as the deliverer.
Optional filters (via command options):
- `hall`: specific hall
- `min_tip`: minimum tip amount
- `canteen`: specific canteen

Results displayed as paginated embeds (5 per page). Each listing shows:
- Order ID
- Canteen
- Destination Hall
- Tip amount
- Time since posting (e.g., "Posted 5 minutes ago")
- A green "Accept" button

Group orders are highlighted with a 🟢 badge and show: "Group Order — X participants, total tip Y".

**Accept Command Flow** (`/dc_accept <order_id>`):
Bot validates:
- Order exists and status is `pending`.
- Order has not expired.
- Deliverer is not the orderer (`deliverer_id != orderer_id`).
- Deliverer is registered and `is_deliverer = 1` and `is_available = 1`.
- Deliverer has no other active delivery (status `accepted` or `picked_up`). Limit: 1 active delivery at a time for the beta.

If valid:
- Set order status to `accepted`.
- Set `deliverer_id`.
- Set `accepted_at`.
- Log timeline entry: `status = "accepted"`, `changed_by_id = deliverer_id`.
- Remove the public listing from the orders channel.
- Send DM to orderer: "Your order #{id} has been accepted by [deliverer nickname]."
- Send DM to deliverer containing:
  - Full item details (from `items` JSON)
  - Exact delivery location (hall + room number or lobby)
  - Special instructions (from `note`)
  - The QR code image (attached file from `qr_code_local_path`)
  - A warning: "This QR code was uploaded at [time]. It may expire soon. If it doesn't work, use `/dc_request_qr {order_id}`."
  - Action buttons for status updates: "Mark Picked Up", "Mark Delivered".

**Status Update Command Flow** (`/dc_update <order_id> <status>`):
Valid transitions:
- `pending` → `accepted` (only via `/dc_accept`)
- `accepted` → `picked_up`
- `picked_up` → `delivered`
- Any non-cancelled status → `cancelled` (only by orderer, and only if pending)

For `picked_up`:
- Deliverer must upload a photo of the purchased food as proof.
- Bot stores the photo locally and logs the timeline.
- DM sent to orderer: "Your deliverer has picked up the food and is on the way."

For `delivered`:
- Deliverer must upload a photo showing the drop-off location as proof.
- Bot stores the photo locally and logs the timeline.
- DM sent to orderer: "Your order has been delivered. Please confirm receipt."
- Orderer receives a button: "Confirm Receipt".
- Once confirmed:
  - Award 1 credit to deliverer.
  - Log transaction: `amount = +1`, `reason = "delivery_completed"`, `order_id = order_id`.
  - Update `delivered_at`.
  - Delete QR code file and delivery photos from disk.
  - Send rating prompts to both parties (see Module 7).

**Timeline Logging**:
Every status update creates a row in `order_timeline` with:
- `order_id`, `status`, `changed_by_id`, `note` (optional), `created_at`.

---

### Module 4: QR Code Handling

**Purpose**: Securely transmit canteen QR codes from orderer to deliverer.

**Storage Strategy**:
- QR images are saved to `./qr_codes/` with filenames: `qr_{order_id}_{timestamp}_{random}.png`.
- The Discord CDN URL is also stored in `qr_code_url` as a backup.
- An automated cleanup job runs every 60 minutes, deleting QR files for orders that are:
  - Status `delivered` or `cancelled`
  - OR `expires_at` is in the past and status is still `pending`
- Images are deleted immediately upon order completion or cancellation.

**Upload Flow**:
- Only the orderer can upload a QR for their order.
- Accepted formats: PNG, JPEG, WebP.
- Max size: 5MB.
- After upload, bot displays a thumbnail to the orderer with "Looks Good / Re-upload" buttons.
- Re-upload overwrites the previous file and updates both URL and local path.

**Delivery to Deliverer**:
- Upon acceptance, the bot DM's the deliverer the QR image as a file attachment.
- The message includes: "QR Code for Order #{id}" and an expiration warning.
- If the QR expires or is invalid, the deliverer can run `/dc_request_qr <order_id>`.
  - This sends a DM to the orderer: "Your deliverer needs a fresh QR code for order #{id}. Please upload a new screenshot."
  - The orderer's 30-minute expiration timer is extended by 15 minutes to accommodate the re-upload.

**Viewing Restrictions**:
- Orderer: can view/re-upload their own QR at any time before delivery.
- Deliverer: can view only during active delivery (status `accepted` or `picked_up`).
- Anyone else: no access.
- All QR view events (who, when, order_id) are logged to a simple text audit file: `./logs/qr_access.log`.

---

### Module 5: Credit System

**Purpose**: Manage the internal credit economy.

**Core Rules**:
- New users start with 100 credits (granted on first `/dc_setup`).
- Placing an order costs 1 base credit + tip (deducted at creation).
- Completing a delivery earns 1 credit (awarded when orderer confirms receipt).
- All credit changes are logged in `credit_transactions`.
- The `users.credits` column is a cached sum for fast reads, but the ledger is the source of truth.

**Commands**:

- `/dc_credits` — Shows current balance and last 5 transactions.
- `/dc_credits history` — Paginated view of all transactions (10 per page).

**Transaction Reasons**:
- `welcome_bonus`: +100 on profile setup
- `order_placed`: -(1 + tip) on order creation
- `delivery_completed`: +1 on confirmed delivery
- `order_cancelled_refund`: +(1 + tip) on cancellation before acceptance
- `tip_paid`: -tip_amount (already part of `order_placed`, but can be logged separately if desired)
- `tip_received`: +tip_amount to deliverer (optional: if tips go to deliverer)

**Note on Tip Distribution**:
The plan mentions "tip formula" but doesn't specify who gets the tip. For simplicity in the beta, the tip is paid by the orderer at creation and is **not refunded** on cancellation after acceptance. If the delivery completes, the tip can be transferred to the deliverer as part of the `delivery_completed` transaction, or kept as a pool. For the implementation plan, the simplest model is: tip is deducted from orderer at creation and awarded to deliverer on completion as a separate `tip_received` transaction.

---

### Module 6: Chat System

**Purpose**: Provide temporary, private communication between orderer and deliverer.

**Implementation**:
- Uses Discord's **private thread** feature inside a designated "Order Chats" channel.
- When an order is accepted, the bot automatically creates a private thread named `Order-{order_id}-Chat`.
- Thread members: the bot, the orderer, and the deliverer only.
- The bot posts an initial system message in the thread:
  - "This is a private chat for Order #{id}. It will be deleted 10 minutes after delivery completion."
  - Orderer's delivery preference and room/lobby info.
  - Any special instructions from the order.

**Chat Rules**:
- Only orderer and deliverer can type. Others are ignored.
- Basic keyword filter for inappropriate content (configurable list).
- Thread auto-closes 10 minutes after the order status changes to `delivered`.
- After closure, the thread is deleted 24 hours later.
- No messages are stored in the SQLite database. The thread itself is the record.

**Commands**:

- `/dc_chat <order_id>` — Opens (or reopens) the chat thread. Sends an ephemeral link to the thread.

---

### Module 7: Rating System

**Purpose**: Build trust through mutual reviews after each delivery.

**Trigger Flow**:
1. Order status changes to `delivered` and orderer confirms receipt.
2. Both parties receive a DM with a rating prompt.
3. Rating must be completed within 48 hours of delivery.
4. After 48 hours, the prompt expires and no rating is recorded.

**Rating Interface**:
- DM contains 5 buttons: ⭐, ⭐⭐, ⭐⭐⭐, ⭐⭐⭐⭐, ⭐⭐⭐⭐⭐.
- After selecting stars, a text modal appears for an optional comment.
- Once submitted, the rating is binding (no editing).
- Users cannot see the other party's rating until:
  - Both have submitted, OR
  - 48 hours have passed.

**Reputation Calculation**:
- Running average of all `stars` where `ratee_id = user`.
- Displayed as star emoji string on profile cards (e.g., "⭐⭐⭐⭐☆ 4.2").
- If `total_ratings < 3`, show "New User" badge instead of a numeric average.

**Dispute Flagging**:
- Any 1-star rating triggers a flag. The bot sends a DM to any user with the `@DeliverU-Admin` role:
  - "Flagged: [rater] rated [ratee] 1 star for Order #{id}. Comment: [feedback]"

**Commands**:

- `/dc_rate <order_id>` — Opens the rating modal for a completed delivery (only if within 48 hours and not already rated).
- `/dc_reputation <user>` — Shows a user's rating breakdown: average, total count, and last 3 comments (anonymized).

---

### Module 8: Group Order System

**Purpose**: Enable multiple users to combine orders for efficient delivery.

**Creation Flow**:
1. Host runs `/dc_group_create`.
2. Bot shows dropdown for canteen selection (same 4 canteens).
3. Bot asks for max participants (default 5, max 10).
4. Bot asks for open duration (default 30 minutes, max 60).
5. Host's 1 credit is deducted.
6. Group root order is created: `is_group_root = 1`, `is_group_open = 1`, `group_order_id = NULL`.
7. Public embed posted in orders channel:
   - "Group Order — #{root_order_id}"
   - Canteen, Host name, Max participants, Time remaining
   - "Join Group" button

**Join Flow**:
1. User clicks "Join Group" on the public embed.
2. Bot validates: user has >= 1 credit, not already in this group, group is still open.
3. Modal appears asking for:
   - Item list
   - Special instructions (optional)
   - Tip amount (optional, buttons: 0, 1, 2, 3)
4. User's 1 + tip credits are deducted.
5. Row inserted into `group_order_participants`.
6. Public embed updates with new participant count.
7. Host receives DM: "[nickname] joined your group order."

**Leave Flow**:
- Participants can leave before the group is accepted by a deliverer.
- Refund: 1 + tip credits returned.
- Participant row deleted.
- Embed updates.
- If the group drops to 0 participants (besides host), the host is notified.

**Host Cancellation**:
- Host runs `/dc_group_cancel <group_order_id>`.
- Only works if group status is still `pending`.
- All participants refunded (1 + tip each).
- Host refunded 1 credit.
- Root order status set to `cancelled`.
- Public embed deleted.

**Deliverer View**:
- Group orders appear in `/dc_find` results with a 🟢 "GROUP" badge.
- Shows: total participants, aggregate tip, canteen, destination hall.
- Accepting a group order:
  - Deliverer runs `/dc_accept <group_order_id>`.
  - Status changes to `accepted`.
  - Deliverer is assigned to the root order.
  - All child orders are created: one `orders` row per participant, with `group_order_id = root_order_id`.
  - Deliverer earns 1 credit per participant on completion.

**Delivery Flow**:
- Deliverer makes one trip to the canteen.
- Consolidated item list is DM'd to deliverer (all participants' items combined).
- Deliverer delivers to each participant individually or at the lobby as specified.
- Status updates on the root order apply to all child orders atomically.
- Each participant independently confirms receipt and rates the deliverer.

**Commands**:

- `/dc_group_create` — Create a new group order.
- `/dc_group_join <group_order_id>` — Join an existing group.
- `/dc_group_leave <group_order_id>` — Leave a group you joined.
- `/dc_group_status <group_order_id>` — View participant list, items, and time remaining.
- `/dc_group_cancel <group_order_id>` — Cancel group (host only).
- `/dc_group_kick <group_order_id> <user>` — Remove a participant (host only, before accepted).

---

### Module 9: Dashboard System

**Purpose**: Provide at-a-glance status for each user.

**Dashboard Embed Sections**:
- **Active Orders as Orderer**: List of orders with status `pending`, `accepted`, or `picked_up` where the user is the orderer. Color-coded: 🟡 pending, 🔵 accepted, 🟠 picked_up.
- **Active Deliveries**: List of orders where the user is the deliverer and status is `accepted` or `picked_up`.
- **Recent History**: Last 5 completed or cancelled orders (both as orderer and deliverer).
- **Credit Summary**: Current balance and net change in the last 24 hours.
- **Reputation**: Star rating or "New User" badge.
- **Quick Actions**: Buttons for `/dc_order`, `/dc_find`, `/dc_group_create`.

**Commands**:

- `/dc_dash` — Personal dashboard. Ephemeral message (only visible to the user).
- `/dc_history` — Full paginated order and delivery history (10 per page). Filterable by role (orderer/deliverer) and status.

---

### Module 10: Help and Tutorial System

**Purpose**: Onboard new users and provide command reference.

**Commands**:

- `/dc_help` — Categorized list of all commands.
  - Categories: Profile, Ordering, Delivering, Groups, Credits, Other.
  - Each entry shows command name + one-line description.
- `/dc_help <command>` — Detailed usage for a specific command, with examples and required permissions.
- `/dc_tutorial` — Interactive walkthrough.
  - Step 1: Explains profile setup and runs `/dc_setup`.
  - Step 2: Demonstrates order creation with mock data (does NOT create a real order).
  - Step 3: Explains deliverer flow.
  - Step 4: Explains group orders.
  - Step 5: Summary and exit.
  - Users can type "exit" at any step to pause and resume later.
- `/dc_faq` — Common questions with expandable answers.
  - Topics: How do credits work? How do I upload a QR? What if my deliverer is late? How do group orders work?

**Contextual Tips**:
- First-time errors trigger a helpful DM: "It looks like you're trying to accept an order. Make sure you're toggled ON as a deliverer with `/dc_toggle`."
- New users get an automatic DM with a quick-start guide after their first `/dc_setup`.

---

## 4. Visibility and Permission Design

### Recommended Channel Structure

Create these channels in the Discord server:

| Channel | Purpose | Permissions |
|---------|---------|-------------|
| `#welcome-and-rules` | Server info, bot invitation link | Everyone: read |
| `#available-orders` | Bot posts public order/group listings only | Everyone: read; Bot: send/delete/manage messages; Everyone: no send |
| `#order-chats` | Private threads for active order communication | Everyone: no send (threads created by bot); Bot: manage threads |
| `#delivery-log` | Completed delivery summaries, community stats | Everyone: read; Bot: send |
| `#help-desk` | Users ask questions, bot provides support | Everyone: send/read |
| `#announcements` | Bot updates, maintenance notices, new features | Everyone: read; Bot: send |

### Role-Based Access

| Role | Permissions |
|------|-------------|
| `@everyone` | View public channels, use `/dc_help`, `/dc_setup`, `/dc_faq`, `/dc_tutorial` |
| `@Verified` (auto-assigned after `/dc_setup`) | Create orders, join groups, use all standard commands |
| `@Deliverer` (toggled by user via `/dc_toggle`, not a Discord role) | Appears in matching, can accept orders |
| `@DeliverU-Admin` (manual assignment) | View all orders, resolve disputes, adjust credits, ban users, use `/dc_admin_*` commands |

### Information Visibility Matrix

| Information | Public Channel | Orderer DM | Deliverer DM | Admin |
|-------------|---------------|------------|--------------|-------|
| Order ID, Canteen, Hall, Tip, Time | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Orderer's Discord name | ❌ No | ✅ Yes | ✅ Yes (after accept) | ✅ Yes |
| Specific items | ❌ No | ✅ Yes | ✅ Yes (after accept) | ✅ Yes |
| Room number / lobby | ❌ No | ✅ Yes | ✅ Yes (after accept) | ✅ Yes |
| QR code image | ❌ No | ✅ Yes (their own) | ✅ Yes (after accept) | ✅ Yes |
| Special instructions | ❌ No | ✅ Yes | ✅ Yes (after accept) | ✅ Yes |
| Chat messages | ❌ No | ✅ Yes (in thread) | ✅ Yes (in thread) | ❌ No |
| Credit balance | ❌ No | ✅ Yes (own) | ✅ Yes (own) | ✅ Yes (any) |
| Ratings given/received | ❌ No | ✅ Yes (own) | ✅ Yes (own) | ✅ Yes (any) |

---

## 5. Notification System

### Event Triggers and Recipients

| Event | Orderer Notification | Deliverer Notification | Channel Post |
|-------|---------------------|------------------------|--------------|
| Order created | Confirmation DM with order summary | — | Public listing in `#available-orders` |
| Order accepted | "Accepted by [nickname]" DM + chat thread link | DM with full details + QR code + buttons | Listing removed from `#available-orders` |
| Status update (picked_up) | "Food picked up, on the way" DM | Confirmation | — |
| Status update (delivered) | "Delivered — please confirm" DM + confirm button | "Waiting for confirmation" DM | — |
| Delivery confirmed | "Thank you! Please rate [deliverer]" DM | "Credits awarded! +1" DM + "Please rate [orderer]" DM | Summary in `#delivery-log` |
| QR re-requested | "Please re-upload QR for order #{id}" DM | "Waiting for fresh QR" DM | — |
| Order cancelled (by orderer) | Refund confirmation DM | Cancellation notice DM (if already accepted) | Listing removed |
| Group joined | — | Host DM: "[user] joined" | Embed count update |
| Group left | — | Host DM: "[user] left" | Embed count update |
| Group cancelled | Refund DM to all participants | — | Embed removed |
| Order expired (30 min) | "Order expired, credits refunded" DM | — | Listing removed |
| Low credits (< 5) | Warning DM: "You're low on credits" | — | — |
| New badge / milestone | "Congratulations on your first delivery!" DM | — | Optional in `#delivery-log` |

### DM Format Standards

- All DMs use a consistent embed color: `#4CAF50` (DeliverU green).
- Every DM includes the order ID for reference.
- Action buttons are included where relevant: "View Order", "Open Chat", "Rate User".
- Footer text: "DeliverU Bot — HKUST Peer Delivery".

---

## 6. Error Handling and Edge Cases

### Order Edge Cases

| Scenario | Handling |
|----------|----------|
| **No deliverer available** | Order auto-expires after 30 minutes. Bot refunds 1 + tip credits. DMs orderer. Removes listing. |
| **Deliverer cancels after accepting** | Order returns to `pending` status. `deliverer_id` is cleared. Orderer is DM'd. Deliverer receives a "cancellation flag" (logged in `order_timeline` with note). If 3 flags in 24 hours, deliverer is auto-toggled OFF. |
| **Orderer cancels after acceptance** | Not allowed. Only `pending` orders can be cancelled by orderer. |
| **QR code invalid at pickup** | Deliverer clicks "Request New QR" button or runs `/dc_request_qr`. Orderer gets DM. Expiration extends by 15 minutes. |
| **Multiple simultaneous orders** | Orderer limited to 1 active order. Deliverer limited to 1 active delivery. Enforced at creation/acceptance. |
| **Bot restart during active delivery** | All states are in SQLite. On startup, bot checks all `accepted` and `picked_up` orders and re-creates their chat threads if missing. |
| **Discord API outage** | Bot queues outgoing DMs in memory. On reconnection, retries queued messages (max 3 retries, 5 min apart). |

### Credit Edge Cases

| Scenario | Handling |
|----------|----------|
| **Insufficient credits** | Order creation blocked. Bot replies: "You need at least 1 credit. Earn credits by delivering orders with `/dc_find`." |
| **Negative balance** | Not allowed for the beta. Orders are blocked if `credits < required`. The `users.credits` column must never go below 0. |
| **Refund race condition** | Since SQLite is file-based and the bot is single-process, there are no true concurrent writes. Use `BEGIN IMMEDIATE` transactions for all credit operations to prevent issues if the bot is ever scaled horizontally. |

### Group Order Edge Cases

| Scenario | Handling |
|----------|----------|
| **Host tries to leave** | Blocked. Host must cancel the entire group. |
| **Group expires before acceptance** | Same as single order: auto-cancel, refund all participants + host. |
| **Deliverer accepts group, then cancels** | Root order returns to `pending`. All child orders are deleted. Participants are notified. |
| **Max participants reached** | "Join Group" button is disabled on the embed. New join attempts are rejected. |

### Technical Edge Cases

| Scenario | Handling |
|----------|----------|
| **Database locked** | Use `aiosqlite` with `timeout=30` seconds. If still locked, reply to user: "Database busy, please try again in a moment." Log the error. |
| **Image upload failure** | If Discord attachment fails, accept text-based confirmation as fallback: "Type 'CONFIRM' to proceed without a photo." |
| **Thread creation failure** | If the `#order-chats` channel is missing or bot lacks permissions, DM both users: "Chat thread could not be created. Please use DMs to communicate." |
| **File deletion failure (QR cleanup)** | If a QR file cannot be deleted, log the error but do not crash. Retry on next cleanup job. |

---

## 7. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

1. **Project scaffolding**
   - Create Python project with `pyproject.toml` or `requirements.txt`.
   - Dependencies: `py-cord` (or `discord.py`), `aiosqlite`, `python-dotenv`.
   - Folder structure: `bot.py`, `cogs/`, `database.py`, `config.py`, `utils/`, `data/qr_codes/`, `data/logs/`.

2. **Database layer**
   - `database.py`: Initialize SQLite, create all tables if not exist.
   - `models.py`: Dataclasses or typed dicts for User, Order, CreditTransaction, Rating, etc.
   - `db/`: Async helper functions for CRUD on each table.

3. **Bot initialization**
   - `bot.py`: Discord client setup, cog loading, command sync.
   - `config.py`: Environment variables (bot token, guild ID for dev, command prefix if any).
   - Register global error handler for unhandled exceptions.

4. **Profile System (Module 1)**
   - `/dc_setup` modal with all fields.
   - `/dc_profile`, `/dc_toggle`, `/dc_hall`.
   - Middleware: check `profile_setup_at` before allowing other commands.

5. **Credit System (Module 5)**
   - `deduct_credit()`, `add_credit()`, `get_balance()`, `get_history()`.
   - Integrate with `/dc_setup` (welcome bonus) and `/dc_credits`.

### Phase 2: Order Lifecycle (Week 2)

1. **Order Creation (Module 2)**
   - `/dc_order` flow: canteen dropdown → DM with button → QR upload → details → tip → confirmation.
   - `/dc_my_orders`, `/dc_cancel`.
   - Public embed posting in `#available-orders`.
   - 30-minute expiration background task (asyncio loop, check every 5 minutes).

2. **Delivery Acceptance and Tracking (Module 3)**
   - `/dc_find` with filtering and pagination.
   - `/dc_accept` with validation.
   - `/dc_update` with status transitions.
   - `/dc_my_deliveries`.
   - DM notifications on acceptance and status changes.
   - Timeline logging.

3. **QR Code Handling (Module 4)**
   - File download from Discord CDN to local disk.
   - Attachment in deliverer DM.
   - `/dc_request_qr`.
   - Cleanup job (hourly).

### Phase 3: Communication and Trust (Week 3)

1. **Chat System (Module 6)**
   - Auto-create private thread on acceptance.
   - `/dc_chat`.
   - Thread deletion after delivery + 10 minutes.

2. **Rating System (Module 7)**
   - DM prompts with star buttons.
   - Modal for optional comment.
   - Blind rating (hide until both submit or 48h pass).
   - Reputation calculation and profile display.
   - 1-star flag to admin.

3. **Dashboard System (Module 9)**
   - `/dc_dash` rich embed.
   - `/dc_history` pagination.

### Phase 4: Group Orders (Week 4)

1. **Group Order System (Module 8)**
   - `/dc_group_create`, `/dc_group_join`, `/dc_group_leave`.
   - `/dc_group_status`, `/dc_group_cancel`, `/dc_group_kick`.
   - Public embed with live participant count.
   - Consolidated item list for deliverer.
   - Atomic status updates across root + child orders.

### Phase 5: Help, Polish, and Deployment (Week 5)

1. **Help and Tutorial (Module 10)**
   - `/dc_help`, `/dc_help <command>`, `/dc_faq`, `/dc_tutorial`.

2. **Admin commands**
   - `/dc_admin_orders` — View all active orders.
   - `/dc_admin_credits <user> <amount> <reason>` — Adjust credits.
   - `/dc_admin_ban <user>` — Ban user from bot usage.
   - `/dc_admin_dispute <order_id>` — View full order timeline and details.

3. **Polish**
   - Embed colors and formatting consistency.
   - Error message copy review.
   - Edge case testing.

4. **Deployment**
   - Dockerize: `Dockerfile` + `docker-compose.yml`.
   - Set up `pm2` or systemd for auto-restart.
   - Configure log rotation.

---

## 8. Testing Strategy

### Unit Testing

Test these core functions with `pytest`:
- Credit calculation: `deduct_credit`, `add_credit`, `get_balance`.
- Status transition validation: ensure `accepted → picked_up → delivered` works, and `pending → delivered` is blocked.
- Input validation: nickname length, hall name in allowed list, canteen name in allowed list.
- QR filename generation: ensure uniqueness and no path traversal.

### Integration Testing

Simulate full flows with a test Discord server:
1. User A registers → creates order → uploads QR.
2. User B registers → toggles deliverer ON → accepts order.
3. Deliverer updates status to `picked_up` → `delivered`.
4. Orderer confirms receipt.
5. Both rate each other.
6. Verify credits: A should have 99, B should have 101.

### Group Order Integration Test
1. User A creates group order.
2. Users B, C, D join.
3. User E accepts as deliverer.
4. Deliverer marks delivered.
5. All participants confirm and rate.
6. Verify deliverer earned 3 credits.

### Edge Case Testing
- Cancel pending order → verify refund.
- Try to accept own order → verify blocked.
- Try to create second active order → verify blocked.
- Upload oversized image → verify rejection.
- Let order expire → verify refund and cleanup.

### Load Testing (Optional for Beta)
- Simulate 20 concurrent orders with `asyncio.gather`.
- Ensure SQLite handles the load (it will, since it's single-writer).

---

## 9. Deployment Plan

### Hosting

- **Target**: Always-on machine within HKUST network (dorm PC, lab server, or lightweight VPS).
- **OS**: Ubuntu 22.04 LTS (recommended) or Windows with Python 3.10+.
- **Process Manager**: `pm2` (Node.js-based, works great for Python too) or `systemd` service.
- **Auto-restart**: Configured to restart on crash. Discord.py's `auto_reconnect=True` handles Discord disconnects.

### Docker Setup (Recommended)

```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "bot.py"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  bot:
    build: .
    container_name: deliveru-bot
    restart: unless-stopped
    env_file: .env
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
```

### Environment Variables

Create a `.env` file (never commit this):

```
DISCORD_BOT_TOKEN=your_bot_token_here
GUILD_ID=your_test_guild_id_for_dev      # Optional: for faster slash command sync in dev
DATABASE_PATH=./data/deliveru_bot.db
QR_CODES_DIR=./data/qr_codes
LOGS_DIR=./logs
ADMIN_ROLE_NAME=DeliverU-Admin
ORDERS_CHANNEL_ID=1234567890
CHATS_CHANNEL_ID=1234567891
DELIVERY_LOG_CHANNEL_ID=1234567892
ANNOUNCEMENTS_CHANNEL_ID=1234567893
```

### Monitoring

- **Error logging**: Use Python's `logging` module. Write errors to `./logs/bot_errors.log` with rotation (max 10MB, keep 5 backups).
- **Command usage**: Log every command invocation to `./logs/commands.log` (user, command, timestamp, success/failure).
- **Active orders**: A simple `/dc_admin_status` command shows active order count, active deliverer count, and DB size.

### Backup

- **Database**: Daily SQLite backup at midnight using `sqlite3 .backup` or file copy. Keep 7 days of backups in `./data/backups/`.
- **QR codes**: Not backed up — they are temporary by design.
- **Logs**: Rotated automatically. Keep 30 days.

---

## 10. File Structure

```
deliveru-discord-bot/
├── bot.py                    # Entry point: Discord client, cog loader, event handlers
├── config.py                 # Settings loaded from .env
├── database.py               # SQLite initialization and connection pool
├── requirements.txt          # Python dependencies
├── .env.example              # Template for environment variables
├── Dockerfile
├── docker-compose.yml
├── .gitignore
├── data/                     # Created at runtime
│   ├── deliveru_bot.db       # SQLite database
│   ├── qr_codes/             # Uploaded QR images
│   └── backups/              # Daily DB backups
├── logs/                     # Created at runtime
│   ├── bot_errors.log
│   └── commands.log
├── cogs/                     # Discord.py extension modules
│   ├── __init__.py
│   ├── profile.py            # Module 1: /dc_setup, /dc_profile, /dc_toggle, /dc_hall
│   ├── orders.py             # Module 2: /dc_order, /dc_my_orders, /dc_cancel
│   ├── delivery.py           # Module 3: /dc_find, /dc_accept, /dc_update, /dc_my_deliveries
│   ├── qr_handler.py         # Module 4: QR upload, delivery, cleanup, /dc_request_qr
│   ├── credits.py            # Module 5: /dc_credits, transaction ledger
│   ├── chat.py               # Module 6: Thread creation, /dc_chat
│   ├── ratings.py            # Module 7: /dc_rate, /dc_reputation, DM prompts
│   ├── groups.py             # Module 8: /dc_group_*
│   ├── dashboard.py          # Module 9: /dc_dash, /dc_history
│   ├── help_system.py        # Module 10: /dc_help, /dc_tutorial, /dc_faq
│   └── admin.py              # Admin commands: /dc_admin_*
├── db/                       # Database access layer
│   ├── __init__.py
│   ├── users.py              # User CRUD
│   ├── orders.py             # Order CRUD + queries
│   ├── transactions.py       # Credit transaction CRUD
│   ├── ratings_db.py         # Rating CRUD
│   ├── timeline.py           # Order timeline logging
│   └── groups.py             # Group order participant CRUD
├── utils/
│   ├── __init__.py
│   ├── embeds.py             # Reusable embed builders (colors, footer, timestamp)
│   ├── validators.py         # Input validation (nickname, hall, canteen, file size)
│   ├── pagination.py         # Paginated embed helpers
│   └── cleanup.py            # Background tasks: expiration check, QR cleanup
└── docs/
    └── IMPLEMENTATION_PLAN.md  # This document
```

---

## 11. Future Enhancements (Post-Beta)

These are **out of scope** for the initial beta but documented for later:

- **Tip auto-transfer**: Right now tips are deducted but not explicitly transferred. Post-beta, add a `tip_pool` concept or direct transfer to deliverer.
- **Web dashboard**: A simple read-only web page showing live order counts and recent deliveries.
- **AI-based matching**: Suggest orders to deliverers based on their preferred halls, order times, and past acceptance patterns.
- **Achievement system**: "First Delivery", "10 Orders Completed", "Speed Demon" (delivered under 15 minutes), etc.
- **Multi-language support**: English and Traditional Chinese.
- **Push notifications**: Companion mobile app for push notifications when Discord is closed.
- **Voice channel integration**: Optional voice channel per active delivery for real-time coordination.
- **Canteen menu API integration**: If HKUST canteens ever expose a digital menu API, pre-fill item lists.

---

## Appendix A: Data Constants

### Valid Canteens
```python
VALID_CANTEENS = ["LG1", "LSK", "Asia Pacific", "Oliver Super Sandwich"]
```

### Valid Halls (Discord Bot Only)
```python
VALID_HALLS = ["Hall X", "Hall XI", "Hall XII", "Hall XIII"]
```

### Valid Order Statuses
```python
VALID_STATUSES = ["pending", "accepted", "picked_up", "delivered", "cancelled"]
```

### Valid Delivery Preferences
```python
VALID_DELIVERY_PREFERENCES = ["dorm_room", "hall_lobby"]
```

### Time Slots
```python
TIME_SLOTS = [
    "7:00-9:00", "9:00-11:00", "11:00-13:00", "13:00-15:00",
    "15:00-17:00", "17:00-19:00", "19:00-21:00", "21:00-23:00"
]
```

---

## Appendix B: Quick Command Reference

| Command | Module | Who Can Use | Description |
|---------|--------|-------------|-------------|
| `/dc_setup` | Profile | Anyone | Register or edit profile |
| `/dc_profile` | Profile | Registered | View your stats |
| `/dc_toggle` | Profile | Registered deliverers | Toggle availability |
| `/dc_hall view` | Profile | Registered | View your hall |
| `/dc_hall change` | Profile | Registered | Change your hall |
| `/dc_order` | Orders | Registered | Create a new order |
| `/dc_my_orders` | Orders | Registered | List your orders |
| `/dc_cancel <id>` | Orders | Orderer | Cancel a pending order |
| `/dc_find` | Delivery | Available deliverers | Browse pending orders |
| `/dc_accept <id>` | Delivery | Available deliverers | Accept an order |
| `/dc_update <id> <status>` | Delivery | Assigned deliverer | Update order status |
| `/dc_my_deliveries` | Delivery | Deliverers | View active deliveries |
| `/dc_request_qr <id>` | QR | Assigned deliverer | Ask for fresh QR |
| `/dc_credits` | Credits | Registered | View balance + recent transactions |
| `/dc_credits history` | Credits | Registered | Full transaction history |
| `/dc_chat <id>` | Chat | Orderer or deliverer | Open order chat thread |
| `/dc_rate <id>` | Ratings | Both parties | Rate the other user |
| `/dc_reputation <user>` | Ratings | Anyone | View a user's ratings |
| `/dc_group_create` | Groups | Registered | Start a group order |
| `/dc_group_join <id>` | Groups | Registered | Join a group order |
| `/dc_group_leave <id>` | Groups | Participant | Leave a group order |
| `/dc_group_status <id>` | Groups | Participant | View group details |
| `/dc_group_cancel <id>` | Groups | Host | Cancel group order |
| `/dc_group_kick <id> <user>` | Groups | Host | Remove a participant |
| `/dc_dash` | Dashboard | Registered | Personal status dashboard |
| `/dc_history` | Dashboard | Registered | Full order history |
| `/dc_help` | Help | Anyone | Command reference |
| `/dc_help <command>` | Help | Anyone | Detailed command help |
| `/dc_tutorial` | Help | Anyone | Interactive walkthrough |
| `/dc_faq` | Help | Anyone | Frequently asked questions |
