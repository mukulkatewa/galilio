# Galilio - Casino Platform

A full-stack casino platform with various games including Keno, Limbo, Crash, Dice, and Dragon Tower.

## Project Structure

- `backend/` - Node.js/Express.js backend server
  - `src/` - Source code
  - `prisma/` - Database schema and migrations
  - `monitoring/` - Monitoring configuration
  - `scripts/` - Utility scripts
  - `package.json` - Backend dependencies

- `frontend/` - (Coming soon) React frontend application

## Getting Started

### Prerequisites

- Node.js 16+
- PostgreSQL
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## License

This project is licensed under the MIT License.
