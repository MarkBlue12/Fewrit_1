const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Clean part numbers by removing non-alphanumeric characters
// const cleanPartNumber = (input) => {
//     if (!input) return ''; // Handle undefined/null
//     return input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
// };

const cleanPartNumber = (input) => {
    if (!input) return '';

    // Updated regex to capture various part number formats
    const partNumberRegex = /(\b|^)([a-zA-Z0-9]+(?:[- ][a-zA-Z0-9]+)*)(\b|$)/gi;
    
    // Find all matches and filter out partial matches
    const matches = (input.match(partNumberRegex) || [])
        .map(m => m.replace(/^\W+|\W+$/g, '')) // Trim non-word chars from edges
        .filter(m => m.length > 1); // Filter out single-character matches

    // Get best candidate (prioritize alphanumeric with separators)
    const extracted = matches.reduce((best, current) => {
        const score = current.replace(/[^a-zA-Z0-9]/g, '').length;
        return score > best.score ? { value: current, score } : best;
    }, { value: '', score: 0 }).value;

    // Clean non-alphanumeric and normalize
    return extracted.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Validate request body
    if (!req.body?.message?.trim()) {
        return res.status(400).json({ error: "Message is required" });
        }
    
    const { message } = req.body;
    console.log('Received message:', message);

    // Clean input
    const cleanedInput = cleanPartNumber(message);
    // const cleanedInput = "abb-1234";
    if (!cleanedInput) {
      return res.json({ 
        response: "Please provide a part number or product description",
        products: []
      });
    }

    // 2. Search Supabase with similarity scoring
    const { data: products, error } = await supabase.rpc('search_products', {
      search_term: cleanedInput,
      similarity_threshold: 0.3 // Adjust threshold as needed
    });

    if (error) throw error;
    console.log('Found products:', products);

 
    // Build AI prompt
    // In the AI prompt section, update to:
    const inventoryContext = products.length > 0
    ? `Top matches:\n${
        products.map(p => 
            `- ${p.part_number} (${Math.round(p.similarity_score * 100)}% match): ` +
            `${p.brand} ${p.description}, ` +
            `Qty: ${p.quantity}, Price: $${p.price}`
        ).join('\n')
        }`
    : 'No similar products found.';

    const aiPrompt = [
      "You're an industrial surplus assistant. Respond to:",
      `"${message}"`,
      "Use this inventory data:",
      inventoryContext,
      "If similarity < 80%, ask user to verify part number."
    ].join('\n');

    // Get AI response
    const aiResponse = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: aiPrompt }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      response: aiResponse.data.choices[0].message.content,
      products: products.slice(0, 3)
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: "Service unavailable",
      details: error.message 
    });
  }
};