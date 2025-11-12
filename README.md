# 🚀 Galilio Platform

A full-stack gaming platform with provably fair games, built with Node.js, Express, PostgreSQL, React, and Vite.

## 🌐 Live Deployment

- **Frontend:** https://galilio-jmxy3axg3-kaksaab2605-8884s-projects.vercel.app
- **Backend API:** https://galiliobackend-mexd7ddrt-kaksaab2605-8884s-projects.vercel.app/api

## 🎮 Features

### Games
- **🎲 Dice** - Roll over/under prediction game
- **🎱 Keno** - Pick 10 numbers from 80
- **🎯 Limbo** - Multiplier prediction game
- **🚀 Crash** - Real-time multiplier crash game
- **🐉 Dragon Tower** - Tower climbing adventure

### Platform Features
- 🔐 Secure authentication with JWT
- 💰 Real-time balance tracking
- 📊 Comprehensive admin dashboard
- 📜 Complete game history
- 🎲 Provably fair gaming algorithms
- 📱 Fully responsive design
- 🌙 Dark theme UI inspired by Stake.com

## 📁 Project Structure

```
galilio/
├── backend/          # Node.js/Express API server
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── services/
│   └── prisma/       # Database schema and migrations
├── frontend/         # React/Vite application
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── context/
│       └── services/
└── SETUP.md         # Detailed setup guide
```

## 🚀 Quick Start (Windows)

### Prerequisites
- Node.js v18+
- PostgreSQL 14+

### Automated Setup

1. **Run setup script:**
```bash
setup.bat
```

2. **Configure backend:**
   - Edit `backend\.env` with your database credentials
   - Update JWT_SECRET

3. **Initialize database:**
```bash
cd backend
npm run migrate
npm run seed
```

4. **Start application:**
```bash
# Option 1: Start both servers at once
start-all.bat

# Option 2: Start separately
start-backend.bat  # Terminal 1
start-frontend.bat # Terminal 2
```

5. **Access application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Default admin: `admin` / `Admin@123`

## 📖 Detailed Setup

See [SETUP.md](SETUP.md) for comprehensive setup instructions including:
- Manual installation steps
- Database configuration
- Environment variables
- API documentation
- Game rules
- Troubleshooting

## 🎯 Default Credentials

After seeding the database:
- **Username:** admin
- **Email:** admin@galilio.com
- **Password:** Admin@123
- **Initial Balance:** $1,000.00

## 🛠️ Tech Stack

### Backend
- **Node.js & Express** - Server framework
- **PostgreSQL & Prisma** - Database ORM
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Provably Fair RNG** - Fair gaming

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Recharts** - Charts (Crash game)

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user

### Games
- `POST /api/games/dice` - Play Dice
- `POST /api/games/keno` - Play Keno
- `POST /api/games/limbo` - Play Limbo
- `POST /api/games/crash` - Play Crash
- `POST /api/games/dragon-tower/init` - Init Dragon Tower
- `POST /api/games/dragon-tower` - Play Dragon Tower

### User
- `GET /api/user/balance` - Get balance
- `GET /api/user/history` - Game history

### Admin
- `GET /api/admin/stats` - Game statistics
- `GET /api/admin/users` - All users

## 🎨 Design Philosophy

- **Minimal & Clean** - No excessive animations
- **Dark Theme** - Comfortable for long gaming sessions
- **Responsive** - Works on all screen sizes
- **Fast** - Optimized for performance
- **Usable** - Focus on user experience

## 📊 Admin Dashboard

Access at `/admin` (admin users only):
- View total house profit and statistics
- Monitor games by type
- Manage users
- Track platform performance

## 🔒 Security Features

- JWT authentication with secure tokens
- Password hashing with bcrypt
- Rate limiting on all routes
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers
- SQL injection protection via Prisma

## 🧪 Game Testing

All games can be tested with the seeded admin account:
1. Login with admin credentials
2. Navigate to desired game
3. Place bets and play
4. View history in History tab
5. Check admin stats in Admin panel

## 📝 Development

### Backend Development
```bash
cd backend
npm run dev        # Start with nodemon
npm run migrate    # Run migrations
npm run studio     # Open Prisma Studio
npm run seed       # Seed database
```

### Frontend Development
```bash
cd frontend
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview build
```

## 🐛 Troubleshooting

**Database Connection Error:**
- Verify PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Ensure database exists

**Port Already in Use:**
- Change PORT in backend/.env
- Change port in frontend/vite.config.js

**CORS Errors:**
- Verify FRONTEND_URL in backend/.env
- Ensure backend is running

## 📄 License

This project is for educational purposes.

## 🤝 Contributing

This is a personal project. Feel free to fork and modify.

## 📞 Support

For issues:
1. Check SETUP.md troubleshooting section
2. Review backend logs in `backend/logs/`
3. Check browser console for errors

---

Built with ❤️ for gaming enthusiasts
