const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Helper function to extract part numbers
const extractSearchTerms = (message) => {
    // Match patterns like "a 1234", "a-1234", or "a1234"
    const partNumberRegex = /([A-Za-z]+[-\s]?\d+)/gi;
    const matches = message.match(partNumberRegex) || [];
  
    return matches.map(term => 
        term
            .replace(/[-\s]/g, '')  // Remove hyphens AND spaces
            .toUpperCase()
    );
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    console.log('Received message:', req.body.message); // NEW
    const { message } = req.body;
    
    // 1. Identify product references
    const searchTerms = extractSearchTerms(message);
    console.log('Cleaned search terms:', searchTerms); // NEW
    
    // 2. Query Supabase
    let products = [];
    if (searchTerms.length > 0) {
      const queryConditions = searchTerms.flatMap(term => [
        `part_number.ilike.%${term}%`,
        `part_number.ilike.%${term.replace(/-/g, '')}%`,
        `description.ilike.%${term}%`
      ]);
      
      console.log('Supabase query conditions:', queryConditions); // NEW
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(
            searchTerms.flatMap(term => [
                // Match "a1234", "a-1234", or "a 1234"
                `part_number.ilike.%${term}%`,
                `part_number.ilike.%${term.slice(0, 1)}-${term.slice(1)}%`, // Add hyphen
                `description.ilike.%${term}%`
                ])
        );
      if (error) {
        console.error('Supabase error:', error); // NEW
        throw error;
      }
      
      products = data;
      console.log('Query results:', products); // NEW
    }
    // 3. Build AI prompt with inventory data
    const inventoryContext = products.length > 0
      ? `Current Inventory:\n${products.map(p => 
          `- ${p.part_number}: ${p.brand} ${p.description} (Qty: ${p.quantity}, Price: $${p.price})`
        ).join('\n')}`
      : 'No matching products found in inventory.';

    const aiPrompt = [
      "You're an industrial surplus assistant. Use this inventory data:",
      inventoryContext,
      `User Question: "${message}"`,
      "Provide a helpful response with exact numbers from inventory when available."
    ].join('\n');

    // 4. Get AI response
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
      products // Optional: Send product data to frontend
    });

  } catch (error) {
    console.error('Full error stack:', error); // NEW
    res.status(500).json({ error: "Service unavailable" });
  }
};