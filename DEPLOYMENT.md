# Deployment Guide - Vercel

This guide will help you deploy the Galilio Casino Platform to Vercel with separate frontend and backend deployments.

## Prerequisites

1. A Vercel account (https://vercel.com)
2. GitHub repository connected to Vercel
3. PostgreSQL database (recommend Neon, Supabase, or Railway)

## Step 1: Deploy Backend

### 1.1 Create New Project in Vercel
1. Go to https://vercel.com/new
2. Import your repository: `mukulkatewa/galilio-final`
3. **Root Directory**: Set to `backend`
4. **Framework Preset**: Other
5. Click "Deploy"

### 1.2 Configure Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=5001
NODE_ENV=production
```

### 1.3 Setup Database
After deployment, run Prisma migrations:
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
cd backend
vercel link

# Run migration
vercel env pull .env.local
npx prisma migrate deploy
npx prisma generate
```

### 1.4 Note Your Backend URL
After deployment, copy the backend URL (e.g., `https://your-backend.vercel.app`)

## Step 2: Deploy Frontend

### 2.1 Create New Project in Vercel
1. Go to https://vercel.com/new
2. Import the same repository: `mukulkatewa/galilio-final`
3. **Root Directory**: Set to `frontend`
4. **Framework Preset**: Vite
5. **DO NOT DEPLOY YET** - Configure environment variables first

### 2.2 Configure Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```
VITE_API_URL=https://your-backend.vercel.app/api
```

Replace `your-backend.vercel.app` with your actual backend URL from Step 1.4

### 2.3 Deploy Frontend
Click "Deploy" button

## Step 3: Update CORS Settings

After both deployments, update backend CORS to allow frontend domain:

1. Go to backend repository
2. Edit `backend/src/server.js`
3. Update CORS configuration:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend.vercel.app'  // Add your frontend URL
  ],
  credentials: true
}));
```

4. Commit and push changes - Vercel will auto-redeploy

## Step 4: Verify Deployment

1. Visit your frontend URL
2. Register a new account
3. Test all games:
   - Crash
   - Keno
   - Limbo
   - Dragon Tower
   - Dice

## Troubleshooting

### Database Connection Issues
- Ensure DATABASE_URL is correct
- Check if database allows connections from Vercel IPs
- For Neon/Supabase: Enable connection pooling

### CORS Errors
- Verify frontend URL is added to CORS whitelist
- Check backend logs in Vercel dashboard
- Ensure credentials: true in both frontend and backend

### Build Errors
**Backend:**
- Check Node version (use .nvmrc or specify in package.json)
- Verify all dependencies are in package.json

**Frontend:**
- Check VITE_API_URL is set correctly
- Verify build command: `npm run build`
- Check output directory: `dist`

### API Calls Failing
- Check Network tab in browser DevTools
- Verify API URL is correct (should include /api)
- Check backend logs for errors

## Environment Variables Summary

### Backend (.env)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
PORT=5001
NODE_ENV=production
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend.vercel.app/api
```

## Custom Domains (Optional)

### Backend Custom Domain
1. Vercel Dashboard → Backend Project → Settings → Domains
2. Add domain (e.g., `api.yourdomain.com`)
3. Update DNS records as instructed

### Frontend Custom Domain
1. Vercel Dashboard → Frontend Project → Settings → Domains
2. Add domain (e.g., `yourdomain.com`)
3. Update DNS records as instructed
4. Update VITE_API_URL to use new backend domain

## Database Providers

### Recommended: Neon (PostgreSQL)
1. Sign up at https://neon.tech
2. Create a new project
3. Copy connection string
4. Use as DATABASE_URL

### Alternative: Supabase
1. Sign up at https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy connection string (Direct Connection)
5. Use as DATABASE_URL

### Alternative: Railway
1. Sign up at https://railway.app
2. Create PostgreSQL database
3. Copy connection string
4. Use as DATABASE_URL

## Post-Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Database connected and migrations applied
- [ ] Environment variables configured
- [ ] CORS configured correctly
- [ ] User registration works
- [ ] Login works
- [ ] All games functional
- [ ] Transactions recorded in database
- [ ] Balance updates correctly

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all environment variables
4. Test API endpoints directly using Postman/Insomnia
5. Check database connection

## Security Notes

- Never commit .env files to GitHub
- Use strong JWT_SECRET (min 32 characters)
- Enable 2FA on Vercel account
- Regularly update dependencies
- Monitor error logs
- Set up rate limiting (already configured)
