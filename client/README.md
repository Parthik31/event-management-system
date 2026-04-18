# 🎟️ EventBook: Advanced Ticketing & Cinema Management Platform

![MERN Stack](https://img.shields.io/badge/MERN-Stack-blue)
![Tailwind V4](https://img.shields.io/badge/TailwindCSS-V4-38B2AC)
![System](https://img.shields.io/badge/Architecture-3--Pillar_RBAC-purple)

EventBook is a high-performance, full-stack ticketing engine built to handle complex relational data across three distinct business verticals: standard Events, Movie Productions, and Multiplex Theatre operations. 

Unlike standard CRUD applications, this platform features an optimized financial aggregation engine, real-time live-analytics dashboards, and advanced concurrency controls.

## ✨ High-Impact Engineering Features

### 🔐 1. Optimistic Concurrency Control (Seat Locking)
To prevent race conditions where two users attempt to purchase the exact same seat simultaneously, the platform utilizes a **Two-Phase Commit** strategy:
* When a user selects seats and proceeds to checkout, the backend generates a temporary `Locked` booking.
* A **MongoDB Time-To-Live (TTL) Index** is applied to an `expiresAt` field.
* If payment is not completed within 5 minutes, MongoDB automatically drops the document, instantly releasing the seats back to the public pool without the need for expensive background cron jobs.

### 📊 2. SaaS-Grade Financial Aggregation Engine
The backend implements complex **MongoDB Aggregation Pipelines** (`$match`, `$group`, `$project`) to process thousands of booking documents.
* Calculates 30-day trailing platform revenue, splitting 5% platform commissions and 18% gateway fees server-side.
* Feeds real-time data to a custom React `useLiveAnalytics` polling hook, visualizing metrics via Recharts without freezing the main UI thread.

### 🛡️ 3. 3-Pillar Role-Based Access Control (RBAC)
Implemented a strictly typed, hybrid JWT authentication system mapping users to dynamic frontend dashboards based on their `businessType` (`producer`, `theatre`, or `events`). Secure HTTP headers (`Helmet`) and API rate limiting protect the endpoints.

## ⚙️ Tech Stack
* **Frontend:** React.js, Tailwind CSS (V4 `bg-linear-to` syntax), React Router DOM, Recharts, Lucide Icons.
* **Backend:** Node.js, Express.js, JSON Web Tokens (JWT), Cloudinary (Image Optimization).
* **Database:** MongoDB, Mongoose (Heavy use of Virtuals, TTL Indexes, and Populate relations).

## 🏗️ Core Relational Architecture (Cinema Pillar)
To handle the complexity of staggered movie showings, the database is highly normalized:
`Multiplex` (Building) ➡️ `Screen` (Room layout & capacity) ➡️ `Show` (Time, format, specific movie) ➡️ `Booking` (Financial transaction).

## 🚀 Running Locally
1. Clone the repository.
2. Install backend dependencies: `cd backend && npm install`
3. Install frontend dependencies: `cd frontend && npm install`
4. Set up your `.env` with `MONGO_URI`, `JWT_SECRET`, and `CLOUDINARY` keys.
5. Run the servers.
