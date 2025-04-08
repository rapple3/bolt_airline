require('dotenv').config({ path: '../.env' });
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
// console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY);

console.log('Environment variables:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Found' : 'Missing',
  SUPABASE_KEY: process.env.SUPABASE_KEY ? 'Found' : 'Missing',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Found' : 'Missing',
});

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Main function to process documents
async function processDocument(filePath, category) {
  console.log(`Processing ${filePath} (${category})...`);
  
  try {
    // Extract text from Word document
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    // Get file metadata
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    
    // Split into chunks
    const chunks = splitTextIntoChunks(text, 500);
    console.log(`Split into ${chunks.length} chunks`);
    
    // Process each chunk
    for (const [index, chunk] of chunks.entries()) {
      console.log(`Processing chunk ${index + 1}/${chunks.length}`);
      await processChunk(chunk, { 
        category, 
        source: fileName,
        chunkIndex: index,
        lastModified: stats.mtime
      });
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`✅ Completed processing ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Split text into semantically meaningful chunks
function splitTextIntoChunks(text, maxTokens = 500) {
  // Simple paragraph-based splitting
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // Skip empty paragraphs
    if (!paragraph.trim()) continue;
    
    // Approximate token count (words ÷ 0.75)
    const tokenEstimate = paragraph.split(/\s+/).length / 0.75;
    const currentTokens = currentChunk.split(/\s+/).length / 0.75;
    
    if (currentChunk && (currentTokens + tokenEstimate > maxTokens)) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

// Process a single chunk
async function processChunk(text, metadata) {
  try {
    // Generate embedding
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    
    const embedding = response.data[0].embedding;
    
    // Store in Supabase
    const { data, error } = await supabase.from('policy_chunks').insert({
      content: text,
      embedding,
      metadata
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error processing chunk:', error);
    throw error;
  }
}

// Run processing
async function main() {
  // Map of file paths to categories
  const policyFiles = [
    { path: './policies/flight changes - cancel.docx', category: 'cancellation' },
    { path: './policies/travel policies.docx', category: 'policies' },
    // Add all your policy documents
  ];
  
  // Create policies directory if it doesn't exist
  try {
    await fs.mkdir('./policies', { recursive: true });
  } catch (error) {
    // Ignore if already exists
  }
  
  // Process each file
  for (const file of policyFiles) {
    await processDocument(file.path, file.category);
  }
  
  console.log('All documents processed successfully!');
}

main().catch(console.error);