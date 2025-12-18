# Vercel Deployment Guide

## 🚀 Quick Deployment

### Option 1: Vercel CLI (Recommended)
```bash
# Install Vercel CLI globally
npm i -g vercel

# Navigate to project directory
cd construction-platform-frontend

# Install dependencies
pnpm install

# Build for production
pnpm build:prod

# Deploy to Vercel
vercel --prod
```

### Option 2: GitHub Integration
1. Push your code to GitHub
2. Connect repository to Vercel
3. Vercel will auto-deploy on push

## ⚙️ Configuration

### vercel.json
Already configured in the project root with:
- Build commands for pnpm
- API route configuration
- CORS headers
- Production environment settings

### Environment Variables
Create `.env.local` for custom configuration:
```env
NODE_ENV=production
VITE_API_URL=https://your-domain.vercel.app/api
```

## 📁 Project Structure
```
construction-platform-frontend/
├── api/                    # Vercel serverless functions
│   ├── projects.js         # Projects API
│   ├── projects/[id].js    # Individual project details
│   ├── ai-agents.js        # AI agents monitoring
│   ├── hitl-requests.js    # Human-in-the-loop requests
│   └── dashboard.js        # Dashboard metrics
├── src/                    # React application
├── vercel.json            # Vercel configuration
└── package.json           # Dependencies and scripts
```

## 🎯 Demo Mode Features

The deployment includes realistic demo data for investor presentations:
- 5 construction projects with detailed metrics
- 7 AI agents with live status monitoring
- Human-in-the-loop approval workflow
- Real-time dashboard with business metrics

## 🔄 Automatic Deployments

Every push to main branch triggers:
1. Dependency installation with pnpm
2. Production build with optimizations
3. Serverless function deployment
4. CDN distribution update

## 📊 Performance Optimization

The Vercel deployment includes:
- Edge caching for API responses
- Static asset optimization
- Tree-shaking for minimal bundle size
- Serverless function cold start optimization

## 🐛 Troubleshooting

### Build Issues
```bash
# Clear dependencies and rebuild
pnpm clean
pnpm install
pnpm build:prod
```

### API Issues
- Check CORS configuration in vercel.json
- Verify API routes are in /api directory
- Test endpoints locally before deployment

### Performance Issues
- Enable Vercel Analytics
- Monitor function execution times
- Optimize large API responses

## 📞 Support

For deployment issues:
1. Check Vercel dashboard for build logs
2. Review function logs in Vercel
3. Test API endpoints individually
4. Verify environment variables