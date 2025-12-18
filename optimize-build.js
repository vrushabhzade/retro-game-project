#!/usr/bin/env node

/**
 * Production Build Optimizer for AI Dungeon Master
 * Optimizes HTML files for production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Optimizing build for production...');

// Files to optimize
const htmlFiles = [
    'game-menu.html',
    'react-dungeon-master.html',
    'simple-game.html',
    'backend-demo.html',
    'index.html'
];

// Production optimizations
const optimizations = {
    // Replace development React with production builds
    reactDev: 'https://unpkg.com/react@18/umd/react.development.js',
    reactProd: 'https://unpkg.com/react@18/umd/react.production.min.js',
    
    reactDomDev: 'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
    reactDomProd: 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    
    // Add cache busting
    cacheVersion: Date.now()
};

function optimizeHtmlFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace development React with production
    if (content.includes(optimizations.reactDev)) {
        content = content.replace(optimizations.reactDev, optimizations.reactProd);
        modified = true;
        console.log(`✅ Updated React to production build in ${filePath}`);
    }
    
    if (content.includes(optimizations.reactDomDev)) {
        content = content.replace(optimizations.reactDomDev, optimizations.reactDomProd);
        modified = true;
        console.log(`✅ Updated ReactDOM to production build in ${filePath}`);
    }
    
    // Add meta tags for better SEO and performance
    if (!content.includes('<meta name="description"')) {
        const metaTags = `
    <meta name="description" content="AI-Enhanced Dungeon Master - Classic 1987 dungeon crawler with modern AI assistance">
    <meta name="keywords" content="dungeon master, ai game, retro gaming, dungeon crawler">
    <meta name="author" content="AI Dungeon Master Team">
    <meta property="og:title" content="AI-Enhanced Dungeon Master">
    <meta property="og:description" content="Classic dungeon crawler with intelligent AI mentor system">
    <meta property="og:type" content="website">
    <link rel="preconnect" href="https://unpkg.com">
    <link rel="preconnect" href="https://cdn.tailwindcss.com">`;
        
        content = content.replace('<meta name="viewport"', metaTags + '\n    <meta name="viewport"');
        modified = true;
        console.log(`✅ Added SEO meta tags to ${filePath}`);
    }
    
    // Minify inline CSS (basic)
    content = content.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove CSS comments
    content = content.replace(/\s{2,}/g, ' '); // Reduce multiple spaces
    
    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Optimized ${filePath}`);
    } else {
        console.log(`ℹ️  No changes needed for ${filePath}`);
    }
}

// Create production config
const prodConfig = {
    environment: 'production',
    apiUrl: process.env.API_URL || 'https://your-backend-api.com',
    websocketUrl: process.env.WEBSOCKET_URL || 'wss://your-backend-api.com',
    version: require('./package.json').version,
    buildTime: new Date().toISOString()
};

fs.writeFileSync('config.prod.json', JSON.stringify(prodConfig, null, 2));
console.log('✅ Created production config');

// Optimize HTML files
htmlFiles.forEach(optimizeHtmlFile);

// Create _redirects file for Netlify SPA support
const redirectsContent = `
# Netlify redirects for AI Dungeon Master
/game/* /game-menu.html 200
/react/* /react-dungeon-master.html 200
/simple/* /simple-game.html 200
/api/* https://your-backend-api.com/api/:splat 200
`;

fs.writeFileSync('_redirects', redirectsContent.trim());
console.log('✅ Created Netlify redirects');

// Create robots.txt
const robotsContent = `
User-agent: *
Allow: /

Sitemap: https://your-domain.com/sitemap.xml
`;

fs.writeFileSync('robots.txt', robotsContent.trim());
console.log('✅ Created robots.txt');

console.log('🎉 Production build optimization complete!');
console.log('');
console.log('📦 Ready for deployment to:');
console.log('   • Netlify: drag & drop or connect Git');
console.log('   • Vercel: vercel --prod');
console.log('   • GitHub Pages: push to main branch');
console.log('   • Surge: surge . your-domain.surge.sh');
console.log('');
console.log('🌐 Your game will be accessible at:');
console.log('   • /game-menu.html (main menu)');
console.log('   • /react-dungeon-master.html (AI version)');
console.log('   • /simple-game.html (classic version)');