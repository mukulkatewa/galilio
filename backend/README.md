# Galilio Casino API

A secure, scalable, and provably fair casino gaming platform backend API.

## 🚀 Features

- 🔐 **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (User/Admin)
  - Rate limiting on auth endpoints

- 🎮 **Provably Fair Games**
  - 🎲 Dice
  - 🎯 Keno
  - 📈 Crash
  - 🏗️ Limbo
  - 🐉 Dragon Tower

- 📊 **User Features**
  - Real-time balance updates
  - Game history
  - Transaction tracking

- 👑 **Admin Dashboard**
  - User management
  - Game statistics
  - House profit tracking

- 🛡️ **Security**
  - Input validation
  - Request rate limiting
  - Helmet for secure headers
  - CORS protection

- 📈 **Monitoring & Logging**
  - Request logging
  - Error tracking with Sentry
  - Prometheus metrics
  - Swagger API documentation

## 🛠️ Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **Validation**: express-validator
- **API Documentation**: Swagger/OpenAPI
- **Security**: helmet, cors, express-rate-limit
- **Logging**: Winston
- **Monitoring**: Prometheus, Grafana (optional)
- **Error Tracking**: Sentry (optional)

## 🚀 Getting Started

### Prerequisites

- Node.js 16 or higher
- PostgreSQL 12 or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/galilio.git
   cd galilio/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your configuration.

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Seed the database (optional):
   ```bash
   npm run seed
   ```

### Running the Server

- Development mode (with hot-reload):
  ```bash
  npm run dev
  ```

- Production mode:
  ```bash
  npm run build
  npm start
  ```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

Interactive API documentation is available at `/api-docs` when the server is running.

### Authentication

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "SecurePassword123!"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "SecurePassword123!"
}
```

### Example Game Request (Dice)

```http
POST /api/games/dice
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "betAmount": 10,
  "target": 50,
  "rollOver": true
}
```

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/galilio?schema=public"

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# CORS
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100  # Max requests per window

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn_here
PROMETHEUS_METRICS_ENABLED=true
```

## 🧪 Testing

To run the test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📊 Monitoring

### Prometheus Metrics

Metrics are available at `/metrics` when `PROMETHEUS_METRICS_ENABLED=true`.

### Logs

Application logs are stored in the `logs/` directory and are automatically rotated daily.

## 🚀 Deployment

### Docker

1. Build the Docker image:
   ```bash
   docker build -t galilio-backend .
   ```

2. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [Swagger](https://swagger.io/)
- And all other amazing open-source projects used in this project.
