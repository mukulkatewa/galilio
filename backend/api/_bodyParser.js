// Body parser helper for Vercel serverless functions
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    // If body is already parsed
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }

    // If body is a string
    if (typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body));
      } catch (e) {
        return resolve({});
      }
    }

    // Read raw body
    let data = '';
    
    req.on('data', chunk => {
      data += chunk;
    });

    req.on('end', () => {
      try {
        if (data) {
          resolve(JSON.parse(data));
        } else {
          resolve({});
        }
      } catch (e) {
        console.error('Body parse error:', e);
        resolve({});
      }
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });
  });
}

module.exports = { parseBody };
