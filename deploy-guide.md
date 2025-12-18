# Deployment Guide - React AI Dungeon Master

## Quick Deployment Options

### Option 1: GitHub Pages (Free & Easy)
1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/ai-dungeon-master.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Your game will be available at: `https://yourusername.github.io/ai-dungeon-master/`

3. **Access URLs**
   - Game Menu: `https://yourusername.github.io/ai-dungeon-master/game-menu.html`
   - React AI Version: `https://yourusername.github.io/ai-dungeon-master/react-dungeon-master.html`

### Option 2: Netlify (Free with Custom Domain)
1. **Deploy via Drag & Drop**
   - Go to [netlify.com](https://netlify.com)
   - Drag your project folder to deploy
   - Get instant URL like: `https://amazing-name-123456.netlify.app`

2. **Deploy via Git**
   ```bash
   # Connect your GitHub repo to Netlify
   # Build command: npm run build
   # Publish directory: . (root)
   ```

### Option 3: Vercel (Free with Excellent Performance)
1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   # Follow prompts, get URL like: https://ai-dungeon-master.vercel.app
   ```

### Option 4: Firebase Hosting (Google)
1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   ```

2. **Deploy**
   ```bash
   firebase deploy
   # Get URL like: https://your-project.web.app
   ```

### Option 5: Surge.sh (Simple Static Hosting)
1. **Install Surge**
   ```bash
   npm install -g surge
   ```

2. **Deploy**
   ```bash
   surge
   # Choose domain like: ai-dungeon-master.surge.sh
   ```

## Production-Ready Setup

### Create Production Build Script
Add to package.json:
```json
{
  "scripts": {
    "build:prod": "npm run build && npm run optimize",
    "optimize": "node optimize-build.js",
    "deploy:netlify": "netlify deploy --prod --dir .",
    "deploy:vercel": "vercel --prod",
    "deploy:surge": "surge . ai-dungeon-master.surge.sh"
  }
}
```

### Environment Configuration
Create `.env.production`:
```
NODE_ENV=production
API_URL=https://your-backend-api.com
WEBSOCKET_URL=wss://your-backend-api.com
```

## Backend Deployment (Optional)

### Option 1: Railway (Easy Node.js Hosting)
1. Connect GitHub repo to Railway
2. Auto-deploys from `server/` directory
3. Get API URL like: `https://your-app.railway.app`

### Option 2: Render (Free Tier Available)
1. Connect GitHub repo
2. Build command: `cd server && npm install && npm run build`
3. Start command: `cd server && npm start`

### Option 3: Heroku
```bash
# In server directory
echo "web: npm start" > Procfile
git subtree push --prefix server heroku main
```

## Recommended Quick Start

**For immediate deployment (5 minutes):**
1. **Netlify Drag & Drop**
   - Zip your project folder
   - Go to netlify.com
   - Drag zip file to deploy
   - Get instant live URL

**Your game will be accessible at:**
- `https://your-site.netlify.app/game-menu.html`
- `https://your-site.netlify.app/react-dungeon-master.html`

## Custom Domain Setup

Once deployed, you can add a custom domain:
- **Netlify**: Domain settings → Add custom domain
- **Vercel**: Project settings → Domains
- **GitHub Pages**: Repository settings → Pages → Custom domain

Example: `https://ai-dungeon-master.com`