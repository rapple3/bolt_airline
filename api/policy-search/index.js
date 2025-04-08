const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  try {
    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    
    // Search for relevant policy chunks
    const { data: chunks, error } = await supabase.rpc(
      'match_policy_chunks',
      {
        query_embedding: embedding,
        match_threshold: 0.7,  // Adjust as needed
        match_count: 5         // Number of results to return
      }
    );
    
    if (error) throw error;
    
    // Return the policy chunks
    return res.status(200).json({
      policyChunks: chunks.map(chunk => ({
        content: chunk.content,
        metadata: chunk.metadata,
        similarity: chunk.similarity
      }))
    });
  } catch (error) {
    console.error('Error searching policies:', error);
    return res.status(500).json({ error: 'Failed to search policy documents' });
  }
};
