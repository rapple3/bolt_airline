// Simple API handler using ES modules for Vercel
export default function handler(req, res) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Log received request
  console.log('API request received:', req.method);
  
  // Return a simple response for any request
  res.status(200).json({
    content: "Hello! I'm your AI travel assistant. How can I help you today?",
    role: 'assistant'
  });
} 