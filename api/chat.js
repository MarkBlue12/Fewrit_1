const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Clean part numbers by removing non-alphanumeric characters
const cleanPartNumber = (input) => {
  return input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const { message } = req.body;
    console.log('Received message:', message);

    // 1. Clean user input
    const cleanedInput = cleanPartNumber(message);
    console.log('Cleaned input:', cleanedInput);

    // 2. Search Supabase with similarity scoring
    const { data: products, error } = await supabase.rpc('search_products', {
      search_term: cleanedInput,
      similarity_threshold: 0.3 // Adjust threshold as needed
    });

    if (error) throw error;
    console.log('Found products:', products);

    // 3. Format results for AI
    const inventoryContext = products.length > 0
      ? `Top ${products.length} matching products:\n${
          products.map(p => 
            `- ${p.part_number} (${Math.round(p.similarity * 100)}% match): ` +
            `${p.brand} ${p.description}, Qty: ${p.quantity}, Price: $${p.price}`
          ).join('\n')
        }`
      : 'No similar products found in inventory.';

    // 4. Build AI prompt
    const aiPrompt = [
      "You're an industrial surplus assistant. Respond to the user's question ",
      "using these potential matches from our inventory. If similarity is low,",
      "mention possible alternatives. Be specific with numbers when available.",
      "Inventory Data:",
      inventoryContext,
      "\nUser Question:",
      `"${message}"`
    ].join('\n');

    // 5. Get AI response
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
      products: products.slice(0, 3) // Return top 3 matches
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: "Service unavailable",
      details: error.message 
    });
  }
};