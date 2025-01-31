import { DeepSeek } from '@deepseek/api';  // Use actual SDK
import cors from 'cors';

const corsMiddleware = cors({ origin: true });

export default async (req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).end();
    
    try {
      const { message } = req.body;
      
      const client = new DeepSeek({
        apiKey: process.env.DEEPSEEK_API_KEY
      });

      const response = await client.chat({
        model: "deepseek-chat",
        messages: [{
          role: "user",
          content: `As an industrial surplus expert, answer: ${message}`
        }]
      });

      res.status(200).json({ response: response.choices[0].message.content });
    } catch (error) {
      res.status(500).json({ error: "AI service unavailable" });
    }
  });
};