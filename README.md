# ⚡ AuctionHub: Distributed Cloud-Native Bidding Engine

[![Next.js](https://img.shields.io/badge/Next.js-14%2B%20App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![CockroachDB](https://img.shields.io/badge/CockroachDB-Distributed%20SQL-6933FF?style=for-the-badge&logo=cockroachlabs)](https://www.cockroachlabs.com/)
[![PostgreSQL](https://img.shields.io/badge/Wire%20Compatible-PostgreSQL%20v14-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Vitest](https://img.shields.io/badge/Tests-32%20Passed-25c2a0?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

> **Computer Science Database Management Systems (DBMS) DA3 Capstone Project**  
> A high-concurrency, ACID-compliant auction engine engineered on CockroachDB with on-premise AI vector semantic search, autonomous PL/pgSQL business triggers, point-based wallet settlement, and real-time proxy bidding.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Next.js 14 App Router                            │
│   • Server Components (SSR)       • Server Actions       • Route Handlers   │
│   • Client Hooks (SWR)            • Preventative UX      • Middleware RBAC  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ PostgreSQL Wire Protocol (:26257)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    CockroachDB Cloud-Native SQL Engine                      │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │    VECTOR(384) AI     │  │   ACID Point Wallet   │  │   Receipt Log   │  │
│  │ Cosine Similarity <=> │  │   Row Locks (FOR UPDATE)  │ Cryptographic UUID│  │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Autonomous PL/pgSQL Triggers                       │  │
│  │  • check_buyer_solvency (P0005)    • handle_anti_sniping (+5m window) │  │
│  │  • handle_proxy_bidding (Recursion)• update_user_rating (Rating Math) │  │
│  │  • enforce_minimum_increment       • prevent_seller_bidding           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Core Database Features (The "Wow" Factor)

### 1. 🧠 Native AI Vector Semantic Search (`VECTOR(384)`)
Eliminates external vector databases (e.g., Pinecone or Milvus) by leveraging CockroachDB’s native vector index engine:
- **Embedding Pipeline**: Text listings are automatically embedded into **384-dimensional dense vectors** on the fly using `@xenova/transformers` (`all-MiniLM-L6-v2`) running on the server node.
- **Cosine Distance Matching**: The search query is vectorized and compared against item embeddings using the native Cosine Distance operator (`<=>`):
  ```sql
  SELECT item_id, title, description, (embedding <=> $1::VECTOR) AS distance
  FROM ITEMS
  WHERE category_id = $2
  ORDER BY distance ASC
  LIMIT 20;
  ```
- **Vector Index**: Enabled via cluster setting `feature.vector_index.enabled = true` and defined as:
  ```sql
  CREATE VECTOR INDEX ON ITEMS (category_id, embedding);
  ```

---

### 2. 💰 ACID-Compliant Point Wallet & Atomic Settlement
Traditional auction systems suffer from race conditions and balance desynchronization. AuctionHub solves this through database-level locks:
- **Strict Constraints**: Every user has a `wallet_balance NUMERIC(12,2) DEFAULT 10000.00 NOT NULL` backed by a strict `CONSTRAINT check_positive_balance CHECK (wallet_balance >= 0)`.
- **Atomic Closing (`FOR UPDATE`)**: The `close_expired_auction(p_auction_id INT)` stored procedure acquires exclusive row-level locks on the auction and item rows to prevent concurrent settlements:
  ```sql
  SELECT a.reserve_price, a.current_highest_bid, i.seller_id
  INTO v_reserve_price, v_current_bid, v_seller_id
  FROM AUCTIONS a JOIN ITEMS i ON a.item_id = i.item_id
  WHERE a.auction_id = p_auction_id
  FOR UPDATE;
  ```
- **Guaranteed Transfer**:
  - Automatically transfers points: `UPDATE USERS SET wallet_balance = wallet_balance - v_current_bid WHERE user_id = v_highest_bidder;`
  - Credits the seller: `UPDATE USERS SET wallet_balance = wallet_balance + v_current_bid WHERE user_id = v_seller_id;`
  - Generates immutable cryptographic proof of purchase in `RECEIPTS (receipt_id UUID DEFAULT gen_random_uuid())`.
  - Automatically initializes `PAYMENTS_ESCROW` with status `'HELD'`.

---

### 3. ⚙️ Autonomous PL/pgSQL Database Engines

All critical marketplace invariants are enforced at the database layer rather than the application layer:

#### A. The Solvency Defender (`check_buyer_solvency`)
Prevents double-spending by calculating active liabilities across all other live auctions before permitting a new bid:
- Intercepts `BEFORE INSERT ON BIDS`.
- Calculates:
  $$\text{Available Points} = \text{Wallet Balance} - \sum(\text{Active Winning Bids in Other Auctions})$$
- If $\text{Available Points} < \text{New Bid Amount}$, rejects the transaction immediately:
  ```sql
  RAISE EXCEPTION 'Insufficient available points' USING ERRCODE = 'P0005';
  ```

#### B. The Autonomous Proxy Bidding Engine (`handle_proxy_bidding`)
Executes real-time counter-bidding on behalf of bidders who configured maximum ceilings:
- Runs as an `AFTER INSERT ON BIDS` trigger.
- Automatically calculates tier-based increment jumps ($1 for <$100, $5 for <$500, $25 for <$2,500, $100 for $2,500+).
- Counter-bids autonomously up to the proxy ceiling.
- **Infinite Recursion Guard**: Implements `IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;` to guarantee safety.

#### C. Dynamic Anti-Sniping Window (`handle_anti_sniping`)
Prevents last-second bot snipes:
- If a valid bid is placed within 2 minutes of `current_end_time`, automatically executes:
  ```sql
  UPDATE AUCTIONS 
  SET current_end_time = current_end_time + INTERVAL '5 minutes',
      status = 'EXTENDED'
  WHERE auction_id = NEW.auction_id;
  ```

---

### 4. 🛡️ Data Security & Fraud Prevention (`flagged_shill_bids_v`)
Auditing is built directly into relational views. The `flagged_shill_bids_v` view detects illegal shill bidding by correlating bidder and seller session logs:
```sql
CREATE OR REPLACE VIEW flagged_shill_bids_v AS
SELECT
    b.bid_id, b.auction_id, b.bidder_id, i.seller_id,
    al_bidder.ip_address AS bidder_ip, al_seller.ip_address AS seller_ip
FROM BIDS b
JOIN AUCTIONS a ON b.auction_id = a.auction_id
JOIN ITEMS i ON a.item_id = i.item_id
JOIN USER_AUDIT_LOGS al_bidder ON b.bidder_id = al_bidder.user_id
JOIN USER_AUDIT_LOGS al_seller ON i.seller_id = al_seller.user_id
WHERE al_bidder.ip_address = al_seller.ip_address
   OR al_bidder.device_hash = al_seller.device_hash;
```

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend & UI** | **Next.js 14 / React 19** | App Router, Server Components (SSR), Server Actions, SWR |
| **Styling** | **Tailwind CSS v4** | Dark mode, glassmorphism, responsive data grids |
| **Database** | **CockroachDB (v24+)** | Cloud-native distributed SQL, serializable isolation |
| **Protocol** | **PostgreSQL Wire** | Native `pg` pool connecting to CockroachDB port `26257` |
| **AI / Embeddings** | **@xenova/transformers** | Local on-device 384-dimensional feature extraction |
| **Security** | **BcryptJS & HTTP-Only Cookies** | Salted password hashes, RBAC middleware, secure sessions |
| **Testing** | **Vitest & Playwright** | Unit, trigger, lifecycle, attack simulation, and E2E suites |

---

## 📦 Getting Started (Local Setup)

Follow these exact steps to run the complete system locally.

### 1. Prerequisites
- **Node.js**: v20.x or higher
- **CockroachDB**: v24.x or higher installed on your path ([Download CockroachDB](https://www.cockroachlabs.com/docs/releases/))

---

### 2. Start Local CockroachDB Node
In a separate terminal window, start a single-node local CockroachDB cluster:
```bash
cockroach start-single-node --insecure --listen-addr=localhost:26257 --http-addr=localhost:8080
```
*(CockroachDB will listen on port `26257`, and the Web Console will be available at `http://localhost:8080`)*

---

### 3. Initialize Database & Apply SQL Schemas
Open your CockroachDB SQL shell:
```bash
cockroach sql --insecure --host=localhost:26257
```

Inside the SQL prompt, create the database:
```sql
CREATE DATABASE auction_platform_db;
USE auction_platform_db;
```

Execute the schema scripts located in the `queries/` directory:
```bash
cockroach sql --insecure -d auction_platform_db -f queries/cdb-tables.sql
cockroach sql --insecure -d auction_platform_db -f queries/cdb-triggers.sql
cockroach sql --insecure -d auction_platform_db -f queries/cdb-rpcs.sql
cockroach sql --insecure -d auction_platform_db -f queries/cdb-views.sql
cockroach sql --insecure -d auction_platform_db -f queries/dummydata.sql
```

---

### 4. Configure Environment Variables
Create a `.env` file in the project root:
```env
DATABASE_URL="postgresql://root@localhost:26257/auction_platform_db?sslmode=disable"
TEST_BASE_URL="http://localhost:3000"
NODE_ENV="development"
```

---

### 5. Install Dependencies & Launch Application
```bash
# Install NPM packages
npm install

# Start the Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Comprehensive Test Suite (32 Automated Tests)

The repository features an enterprise-grade automated test suite written in **Vitest** that directly verifies CockroachDB triggers, attack resistance, and settlement flows:

```bash
# Run all 32 automated tests
npm test
# or
npx vitest run
```

### Test Coverage Highlights:
1. **Hostile Attacks & Trigger Resilience** (`tests/api/triggers-and-attacks.test.ts`):
   - Simulates seller self-bidding attacks & verifies database rejection.
   - Verifies minimum bid tier increment enforcement at the DB level.
   - Tests bidding on closed or non-existent auctions.
2. **Point-Based Wallet & Solvency Defender** (`tests/api/wallet-and-solvency.test.ts`):
   - Verifies custom error `P0005` when a bid exceeds available wallet points.
   - Tests RBAC authorization on `/api/admin/funds` and `/api/admin/shill`.
   - Tests correlated subquery calculating locked liabilities in `/api/user/wallet`.
   - Verifies 64-bit CockroachDB foreign keys for categories.
3. **Autonomous Proxy Bidding** (`tests/api/proxy-bidding.test.ts`):
   - Tests automated counter-bidding up to ceiling.
   - Tests proxy tie-breaking rules and trigger recursion bounds.
4. **Settlement Lifecycle & Escrow** (`tests/lifecycle/settlement-lifecycle.test.ts`):
   - Tests reserve clearing, atomic balance deduction, and receipt ledger generation.
   - Tests `POST /api/auction/[id]/settle` lazy settlement endpoint with idempotency.
   - Tests delivery confirmation, escrow release, and review rating mathematical trigger updates.
5. **AI Semantic Search** (`tests/ai/semantic-search.test.ts`):
   - Tests cosine distance ordering using native vector columns.

---

## 📂 Repository Directory Layout

```
├── app/
│   ├── actions/               # Server Actions (auction, auth, seller)
│   ├── admin/                 # Admin Control Panel & Shill Fraud Inspection
│   ├── api/
│   │   ├── admin/             # RBAC Protected Admin Endpoints (funds, shill)
│   │   ├── auction/[id]/      # Auction Detail & Lazy Settlement (/settle)
│   │   ├── bid/               # Bid Placement Endpoint
│   │   ├── categories/        # 64-bit Category API
│   │   ├── user/wallet/       # Wallet Balance & Locked Liabilities
│   │   └── search/            # On-Premise Vector Semantic Search
│   ├── auction/[id]/          # Auction Arena, BidForm, ProxyForm, SellerPanel
│   ├── components/            # Header, CountdownTimer, Search
│   ├── create/                # Create Auction with AI Embeddings
│   └── profile/receipts/      # Cryptographic Purchase Receipts Ledger
├── lib/
│   ├── db.ts                  # CockroachDB PostgreSQL Pool Connector
│   ├── auth.ts                # Cookie & Session Management
│   └── embedding.ts           # On-Premise Vector Embedding Generator
├── queries/                   # Up-to-date CockroachDB SQL Documentation
│   ├── cdb-tables.sql         # Base entities, VECTOR(384), RECEIPTS, PROXY_BIDS
│   ├── cdb-triggers.sql       # 11 Autonomous PL/pgSQL Triggers
│   ├── cdb-rpcs.sql           # Settlement Procedures & Proxy Engines
│   ├── cdb-views.sql          # Shill fraud detection & active auction views
│   └── dummydata.sql          # Seed dataset with categorized items
└── tests/                     # 32 Automated Test Cases (Vitest & Playwright)
```

---

## 📜 Academic Integrity & Project Credits
- **Project**: AuctionHub Distributed Bidding Engine
- **Course**: Computer Science — Database Management Systems (DA3 Mini-Project)
- **Engine**: CockroachDB Local Distributed Node
- **Framework**: Next.js 14 App Router with Full-Stack TypeScript
