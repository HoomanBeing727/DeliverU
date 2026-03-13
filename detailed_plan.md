# 🚴 DeliverU – Product Specification

## 🧩 Overview

**DeliverU** is a peer-to-peer delivery coordination app built for **HKUST students** to easily help each other get food from school canteens or nearby restaurants like McDonald’s and Subway.  

Every verified student can be both an **Orderer** and a **Deliverer**, allowing flexible roles within the same dormitory community.  

The app features:
- **School email verification**
- **Smart matching algorithm** for efficient pairing
- **Payment escrow and refund system**
- **Order tracking and auto notifications**
- **Dynamic tip calculation**

---

## 📱 App Flow Summary

1. **Login & School Verification**  
2. **Profile Setup**  
3. **Main Dashboard**  
4. **Order Creation & Management**  
5. **Deliverer Queue & Workflow**  
6. **Payment & Rating System**

---

## 🔐 1. Login Page

**Purpose:** Authenticate users through official school email to ensure trust and exclusivity to university students.

### Features
- **Login Method:**
  - HKUST email (e.g., `abc@connect.ust.hk`)
- **Verification Flow:**
  - Send a one-time verification code via email.
  - Upon successful verification, generate and store a **session token/cookie**, so re-login is not required until session expiry.
- **Post-login Redirect:**  
  → **Profile Setup Page**

---

## 👤 2. Profile Setup Page

**Purpose:** Collect personalized data to optimize delivery matching and user preferences.

### User Information Fields

| Field | Required | Description |
|--------|-----------|-------------|
| Nickname | ✅ | User’s display name within the app (real name optional) |
| School Email | ✅ | Automatically verified field |
| Dormitory Hall | ✅ | For matching nearby orders and deliveries |
| Usually Orders At | ✅ | Typical time ranges when user orders food |
| Delivery Preference | ✅ | For example: “Deliver to room” or “Meet in lobby” |

### Deliverer Additional Fields

| Field | Required | Description |
|--------|-----------|-------------|
| Available Return Times | ✅ | When the user usually goes back to hall |
| Preferred Delivery Halls | ✅ | The halls the deliverer wants to deliver to |

### Verification Step
- One-time **Student ID verification** can be requested for additional security.  
  - The system checks validity but **does not store** the ID data.

### Role Flexibility
- All users can **act as both Orderer and Deliverer**.  
- Users can toggle delivery participation on/off anytime.

---

## 🏠 3. Main Dashboard

**Purpose:** Central hub for navigation and status management.

### Core Features
- Manage profile & preferences  
- View active orders (as Orderer or Deliverer)  
- View completed orders  
- Dark mode toggle  
- FAQ / Help center access  
- Logout button  

### Primary Actions
- **Order Food**  
  Redirects user to order-creation flow.

- **Find Orders to Deliver**  
  Opens filtered deliverer queue.

---

## 🛒 4. Order Creation & Management

**Purpose:** Allow users to place orders directly through canteen or restaurant integrations.

### New Order Flow

#### For School Canteens
1. User selects canteen (e.g., **LG1**, **LG7**, or **LSK**).
2. The app embeds the **canteen ordering webpage** within DeliverU.
3. After selecting items and pressing “Order,” user is redirected back to DeliverU.
4. DeliverU fetches the item list and pricing data from the canteen's webpage.
5. User confirms and pays within app.
6. The order enters a **pending state**, awaiting deliverer acceptance.

#### For External Restaurants (e.g., McDonald's, Subway)
- DeliverU backend hosts an **Android emulator** to listen for menu updates from official apps.
- Menu updates are synced automatically with DeliverU for order placement.

---

### Order Management Rules
- Pending orders stay open until accepted by a deliverer.
- If **no deliverer accepts within 30 minutes**, the user may **cancel the order**, triggering a **full refund**.
- **When a deliverer accepts:**
  - Deliverer **pays upfront** at pickup.
  - Upon successful delivery, the system reimburses the **food cost + tip** from escrow.

---

## 🚴 5. Deliverer Queue & Workflow

**Purpose:** Provide a personalized and efficient way for deliverers to find the best orders.

### Features
- View available orders filtered by:
  - Hall location  
  - Order amount  
  - Preferred range and timings  
- Accept orders directly from the queue.
- Once accepted:
  - Order removed from the public queue.
  - Orderer automatically notified.
  - Deliverer receives order details and any auto-message (e.g., “Deliver to lobby.”).

### Proof of Delivery Flow

| Step | Required Action |
|------|-----------------|
| Pickup | Upload photo of the purchased meal |
| Delivery | Upload photo proof of drop-off |
| Confirmation | Both parties confirm delivery status |
| Payment | Automatically released after confirmation |

---

## 💳 6. Payment and Escrow System

**Purpose:** Ensure transparent, safe, and fair transactions between Orderers and Deliverers — while minimizing costs and legal complexity.

---

### Option A — Traditional Payment + Escrow (Default Mode)

**Purpose:** Provide a standard money-based payment structure for users who prefer direct financial transactions.

#### Payment Flow
1. **Orderer pays** when creating the order.  
   (Payment is held in **escrow**.)
2. When a **Deliverer accepts**, they **pay upfront** for the order at pickup point.
3. Upon successful delivery and confirmation:
   - **Escrow releases** the full order price + **tip** to Deliverer.
4. If no deliverer accepts within 30 minutes → **auto refund** to Orderer.

#### Tip Formula
\[
\text{Tip} = (\text{Order Price} \times 10\%) + C \times \text{Distance}
\]
> where \( C \) is a constant determined by distance multiplier.  
Values are rounded to avoid decimals.

#### Platform Fee
A small **platform fee** (around $0.5–$1.0) is deducted per order to cover operational costs (e.g., payment SDK charges and server fees).

---

### Option B — Campus Credit System (Alternative Mode)

**Purpose:** Eliminate payment gateway dependency and reduce legal and financial risk by using a **non-monetary exchange system**.

#### Concept Overview
- Introduce an **internal credit currency**, named **DeliverU Credits** (DC).
- **1 delivery = +1 DC**
- **1 order = −1 DC**

This means students **earn credits** by delivering others’ orders and **spend credits** when using the app to have food delivered to them.

#### Credit Rules
| Action | Credit Change | Description |
|--------|----------------|-------------|
| Deliver successfully | +1 DC | Earn one credit for completing a delivery |
| Place an order | −1 DC | Spend one credit to have a delivery fulfilled |
| Cancel order (before acceptance) | 0 | No credit consumed |
| Order canceled (after acceptance) | Refunds DC to orderer (upon confirmation) |

#### Advantages
- 💸 **No payment processor fees** (no Alipay / WeChat cost)  
- ⚖️ **No real money handled by platform**, minimizing **legal liability**  
- 🔁 **Self-sustaining ecosystem** — encourages active participation  
- 📉 **Reduced barrier to entry** for students (no bank setup needed)

#### Additional Features
- Optional **credit trading** or **bonus credits** for frequent users.  
- Admins can **manually distribute credits** during system startup or promotions.  
- In future, credits can be **tokenized or integrated** into scholarship/reward systems if required.

---

## 💬 7. Temporary Chat Session

**Purpose:** Provide a secure, ephemeral communication channel between the Orderer and Deliverer for coordination.

### Chat Flow
1. When a deliverer accepts an order, a **temporary chat session** is automatically created.
2. The system sends **auto messages** first:
   - Orderer’s delivery preference (e.g., *“Meet in LG7 lobby”*)  
   - Deliverer’s ETA or pickup info
3. After auto messages, both users can freely chat to coordinate any changes or clarifications.

### Key Features
- **End-to-end secured via HTTPS**
- **Session expires** after order completion or cancellation
- **No chat history stored** — messages are deleted once the session closes
- Supports **text and system message types** (no media upload in this version)

### Benefits
- Enhances communication while maintaining privacy  
- Prevents data accumulation and ensures full compliance with privacy policies  
- Auto-injects relevant preference data for smoother coordination

---

## ⭐ 8. Rating & Review System

**Purpose:** Maintain trust and fairness within the DeliverU ecosystem.

### Rating Flow
- Both Orderer and Deliverer rate each other upon delivery completion.
- Ratings include:
  - ⭐ 1–5 stars  
  - Optional written feedback  
- Ratings contribute to a visible **Reputation Score** in each profile.

---

## 🧭 8. Future Enhancements

- 📍 AI-powered **order matching optimization**  
- 🧠 Smarter **menu sync and caching** system  
- 🔒 Enhanced session management and MFA  
- 🔔 Push notifications for order status  
- 💰 Loyalty / reward program for frequent users  
- 🧾 Duplicate order detection and fraud prevention  

---

## 🧱 Tech Stack (Proposed)

| Component | Technology |
|------------|------------|
| Frontend | React Native |
| Backend | FastAPI |
| Database | Firebase / PostgreSQL |
| Auth | Firebase Auth (Email Verification) |
| Payment | Alipay HK / WeChat Pay / PayMe SDK |
| Canteen Integration | Embedded WebView + Data Fetch |
| Notifications | Firebase Cloud Messaging (FCM) |
| Virtualized Restaurant APIs | Android Emulator Listener |

---

## 💰 Server Cost Evaluation

**Goal:** Establish a stable backend infrastructure with minimal cost by leveraging HKUST resources and flexible hosting options.

### Strategy & Priority
1. **University Collaboration (Preferred Option)**  
   - Submit a proposal to **HKUST IT or Entrepreneurship Center** for **approval and support**.  
   - Request permission to access and integrate with the **school email system** (for secure login).  
   - Apply to rent a **small node** on the university’s internal network for backend hosting.  
     > This is likely to be low-cost or free if approved.

2. **Backup Plan: Personal Server on Campus**
   - If approval is not granted, negotiate to **host our own physical server** on campus (e.g., lab or office corner).  
   - Purchase or assemble a low-power **dedicated PC** for backend hosting.

3. **Dorm-based Hosting (Last Resort)**
   - If university hosting is unavailable, host the backend temporarily inside a **dorm room** using a personal PC or mini server.  
   - This approach minimizes cost significantly while maintaining acceptable latency within the HKUST network.

### Expected Benefits
- **Low operational cost** (no commercial cloud instance needed initially)  
- **High performance** due to local campus network proximity  
- **Full control** over server configuration and data access policies  
- **Scalable path** — can migrate to official infrastructure if app gains traction

---

## 🧮 User Flow Diagram (High-Level)

[Login via HKUST Email]  
↓  
[Profile Setup]  
↓  
[Dashboard]  
→ [Order Food] (via Canteen / Restaurant Integration)  
↓  
[Order Pending]  
↓  
[Deliverer Accepts]  
↓  
[Pickup + Proof]  
↓  
[Delivery & Confirmation]  
↓  
[Escrow Release + Rating]  

---


**DeliverU** — Built by students, for students.  
Making canteen and restaurant delivery smarter, fairer, and community-driven.

# 🚀 Additional Features Specification – DeliverU 2.0 Expansion

## 🎡 1. Lucky Draw Wheel — *“What Should I Eat?”*

**Purpose:** Help indecisive students decide where to eat while adding a fun and engaging touch to the app.

### Overview
A spinning **randomizer wheel** that selects a canteen or nearby restaurant for the user.

### Key Features
- **Animated spinner** with canteen or restaurant icons  
- Displays **canteen name + daily special or highlight**  
- Option to **share result** (e.g., “Looks like I’m eating LG7 today 🍜!”)  
- Optional small **credit reward** for using the wheel (e.g., +0.1 DC)  
- **“Order Now”** button redirects to the order creation screen with that canteen pre-filled  

### Integration Flow

Dashboard → Lucky Wheel
↓
User spins → result displayed
↓
Option “Order Now” → jumps to order creation page with selected canteen

crmsh

### Technical Notes
- Implemented via **React Native animation / Canvas-based spinner**  
- Can fetch canteen list dynamically from backend  
- Optional **weighted randomness** (e.g., based on popularity / user history)  

---

## 🧑‍🤝‍🧑 2. Group / Batch Orders

**Purpose:** Allow multiple students in the same dorm to join a shared delivery, improving delivery success and efficiency for both orderers and deliverers.

### Core Concept
When a user places an order, they can mark it as **“Open for Group Join.”**  
This publishes the order in a **hall-level shared order board**, visible to all students in the same hall.

### Flow Summary
| Step | Description |
|------|--------------|
| 1 | **User A** creates an order and enables “Allow group join.” |
| 2 | The order appears in the **hall’s public order board**. |
| 3 | Other hallmates can **join** by adding their own food items under the same batch. |
| 4 | Deliverers can view combined orders and **accept multiple at once** (“Batch delivery”). |
| 5 | After completion, the **deliverer earns credits** equal to the **number of users served**. |

### Example  
- 3 users join the same group order  
- 1 deliverer accepts  
- Deliverer earns **+3 DC total** (1 per participant)

### Benefits
- Increases delivery success rate (higher chance of accepted orders)  
- Improves efficiency and community collaboration  
- Reduces environmental footprint (fewer duplicate trips)  

### UI Enhancements
- **Dashboard:** “Group Orders Open in My Hall” section  
- **Deliverer Queue:** Filter for “Batchable Orders Only”  
- **Order Card Display:** Shows number of participants (e.g., “3 joined”)  

### Technical Notes
- New database collection: `group_orders`  
- Requires order aggregation logic and participant linking  
- Credit calculation handled server-side upon delivery confirmation  

---

## 🎮 3. Mini Waiting Game — *“UST Dash”*

**Purpose:** Keep users engaged while waiting for their orders to arrive.

### Concept
A simple, endless **mini-game** inspired by *Flappy Bird* or the *Chrome Dinosaur game*, themed around HKUST campus life.

### Gameplay Ideas
- Player controls a **student cyclist** (DeliverU mascot 🚴)  
- Background: **HKUST campus** (Academic Concourse, LG7, dorm area)  
- Obstacles: fountains, stairs, buses, random birds  
- Rewards: earn **bonus credits or cosmetic items** for high scores  

### Integration Flow

Order In Progress → “Play UST Dash While You Wait!”
↓
Gameplay session (endless)
↓
Display score → optional small reward

sql_more

### Technical Notes
- Built with **React Native Canvas / Expo + Phaser Engine**  
- Mostly **offline client logic** (minimal backend load)  
- Optionally sync top scores or achievements via Firebase  

---

## 🪪 4. User Card & Social System

**Purpose:** Gamify user identity and encourage friendly competition through personalized and social profile elements.

### User Card Components
| Element | Description |
|----------|--------------|
| Profile Icon | Custom or default avatar |
| Display Name | User’s nickname |
| Short Bio | 80-character description (e.g., “LG7 enjoyer 🍙 since 2024”) |
| Stats | Deliveries completed, Orders placed, Rating |
| Popularity Button ❤️ | Tap to increase user’s popularity score |
| Badges | Unlocked through milestones or battle pass tiers |

> Acts as a **digital student ID + achievement card** for DeliverU users.

---

### ❤️ Popularity & Weekly Rival System

**Concept:** Students can “cheer” each other via the **Popularity Button**. Rankings reset weekly.

#### Rival Mechanism
1. A user can **challenge a friend** (mutual or same hall).  
2. A **1-week mini leaderboard** opens between both users.  
3. Points are earned from:
   - Popularity taps ❤️  
   - Deliveries completed 🚴‍♀️  
   - Orders placed 🍱  
4. The weekly winner receives a **badge or reward** (e.g., “Hall Star ✨”).

#### Anti-Abuse Controls
- Each user can give **max 3 popularity points per person per day.**

---

## 🏆 5. Battle Pass System — *DeliverU Pass*

**Purpose:** Introduce a long-term reward loop where users earn points and unlock cosmetics, badges, or small bonuses through regular usage.

### How It Works
- Every completed **order or delivery** earns **Battle Points (BP)**.  
- BP accumulate along a **seasonal progress bar** (semester-based).  
- Unlock rewards such as:
  - Titles (e.g., *“Hall Hero”*, *“Canteen Champ”*)  
  - Profile themes & borders  
  - Custom emojis & badges  
  - Small DC bonus milestones  

### Example Actions
| Action | Reward |
|--------|---------|
| Complete a delivery | +10 BP |
| Place an order | +5 BP |
| Win weekly rivalry | +20 BP |

### Seasons & Customization
- **Resets each semester** (e.g., *Spring 2026 – Campus Chronicles 🌸*)  
- Users can customize card appearance:
  - Theme color  
  - Equipped title  
  - Badge lineup  

### Technical Notes
- Extend user schema with fields: `battle_points`, `tier`, `custom_theme`  
- Rewards stored client-side for immediate UI updates 

---

## 🍔 6. Favourite Item Notification System *(DeliverU 2.0 Expansion)*

**Purpose:** Allow users to mark their favourite menu items and receive smart notifications when those items appear (or disappear) in the available menus.

---

### 🎯 Overview
Students can **“favourite”** specific food items (e.g., *LG7 Chicken Rice*, *Subway Tuna Sandwich*) so they never miss when their favourite food is available again.  

DeliverU automatically monitors menu updates from canteens and nearby restaurants and triggers **contextual notifications** only when changes occur.

---

### ⚙️ Core Logic

#### User Actions
- Tap ❤️ to **favourite** any menu item from the order screen.
- All favourites are saved under the user’s profile (`favourites` array in database).

#### Detection Logic (Server-Side)
1. DeliverU backend listens for **menu update events** (additions/removals from canteen or restaurant listings).  
2. When a menu change occurs:
   - Compare new menu items against all users’ favourites.
   - If an item **was added** and matches a favourite → trigger **popup notification**.
   - If an item **was removed** and matches a favourite → trigger **popup notification**.

✅ The system **does not repeatedly notify** unless a real “add” or “remove” event is detected, preventing spam notifications.

---

### 🔔 Notification Behavior

| Event | Notification Example | Type |
|--------|----------------------|------|
| Item added | “🍱 Good news! Your favourite *LG7 Curry Fish Ball* is back on the menu!” | Pop-up + Push |
| Item removed | “⚠️ *Subway Chicken Teriyaki* is currently unavailable.” | Pop-up |

- Notifications are **actionable** — tapping leads directly to the related canteen’s order screen.
- Users can toggle favourite alerts in *Settings → Notifications*.

---

### 📊 Favourite Item Dashboard

**Purpose:** Provide a quick overview of current favourite items and their live availability status.

#### UI Sections
- **Available Now:** shows favourites currently in menu  
- **Unavailable:** shows favourites temporarily removed  
- **Recently Changed:** highlights recent reappearances  

#### Example Layout
| Item | Location | Status | Action |
|------|-----------|--------|---------|
| Chicken Rice | LG7 | ✅ Available | [Order Now] |
| Tuna Sandwich | Subway | ❌ Unavailable | — |
| Spaghetti Bolognese | LG1 | ⚠️ Restocked 2h ago | [Order] |

---

### 🧠 Technical Notes
- Table: `favourite_items`  
  - Fields: `user_id`, `item_id`, `item_name`, `canteen_id`, `availability_status`, `last_notified`
- Backend runs **diff comparison** between new and cached menu states to detect changes.  
- Notification queue throttled to avoid multiple pushes in a short interval.  
- Integrates with existing **Firebase Cloud Messaging (FCM)** for delivery.  

---

### 🌟 Benefits
- Keeps users **engaged** with personalized updates.  
- Encourages higher **order frequency**.  
- Promotes **canteen menu transparency** and discovery.  
- Maintains notification sanity with **event-based triggers only** (no spamming).

---

## 🧩 Summary of Additional Features

| Feature | Goal | Impact | Complexity |
|----------|------|---------|-------------|
| Lucky Draw Wheel | Fun, casual engagement | 🎯 Medium | 🔧 Easy |
| Group / Batch Orders | Efficiency & success rates | 💥 High | ⚙️ Medium |
| Mini Waiting Game | Downtime entertainment | 🎮 Medium | ⚙️ Medium |
| User Card & Popularity | Social retention + identity | ❤️ High | ⚙️ Medium–High |
| Battle Pass | Long-term progression | 🔁 Very High | ⚙️ High |
| Favourite Item Notifications | Personalization & engagement | 🎯 Medium | 🔧 Medium |

---

**DeliverU 2.0 — More local, social, and fun.**
*Expanding the community-driven spirit of HKUST, one meal at a time.*