// CORS helper for serverless functions
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://galilio-frontend.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

// Helper function to check if origin matches Vercel deployment pattern
function isAllowedVercelOrigin(origin) {
  if (!origin) return false;
  
  // Match any galilio*.vercel.app URL (case-insensitive)
  const vercelPattern = /^https:\/\/galilio[\w-]*\.vercel\.app$/i;
  return vercelPattern.test(origin);
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  // Allow requests with no origin
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return true;
  }
  
  const originClean = origin.replace(/\/$/, '');
  
  // Check exact match
  const exactMatch = allowedOrigins.some(allowed => {
    if (!allowed) return false;
    const allowedClean = allowed.replace(/\/$/, '');
    return originClean === allowedClean;
  });
  
  // Check Vercel pattern match
  const vercelMatch = isAllowedVercelOrigin(originClean);
  
  if (exactMatch || vercelMatch) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return true;
  }
  
  return false;
}

function handleCors(handler) {
  return async (req, res) => {
    setCorsHeaders(req, res);
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    return handler(req, res);
  };
}

module.exports = { setCorsHeaders, handleCors };
