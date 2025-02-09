const axios = require('axios');

module.exports = async (req, res) => {
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Handle POST request
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const { message } = req.body;
    
    // Replace with actual DeepSeek API endpoint
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions', 
      {
        model: "deepseek-chat",
        messages: [{
          role: "user",
          content: `As an industrial surplus expert, answer concisely: ${message}`
        }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({ 
      response: response.data.choices[0].message.content 
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: "AI service unavailable" });
  }
};