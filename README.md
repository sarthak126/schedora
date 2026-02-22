# Schedora

## Quick Start

### Prerequisites
- Node.js
- MongoDB

### Setup

1. **Install Dependencies**
   ```bash
   cd server && npm install
   cd client && npm install
   ```

2. **Environment Variables**
   - Copy `server/.env.example` to `server/.env` and update values.

3. **Run Application**
   - **Server**: `cd server && npm run dev` (Runs on port 5000)
   - **Client**: `cd client && npm run dev` (Runs on port 3000)

## Project Structure
- `client/`: Next.js 14 App Router Frontend with Tailwind CSS.
- `server/`: Express.js Backend with MongoDB.
