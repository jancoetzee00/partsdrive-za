import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;

// Parse JSON bodies
app.use(express.json());

// Helper for lazy loading Gemini Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// AI 1: Enhance Part Listing
app.post('/api/ai/enhance-listing', async (req, res) => {
  try {
    const { title, description, make, model, year, category, condition, price } = req.body;

    if (!title || !category || !condition) {
      return res.status(400).json({ error: 'Title, category and condition are required.' });
    }

    const ai = getGeminiClient();
    const prompt = `
      You are an expert South African automotive parts copywriter.
      Enhance this user's automotive parts listing to make it look highly professional, clear, and trustworthy for buyers.
      Use South African automotive context where appropriate (e.g. mention popular vehicles, use terms like bakkie if it fits, ZAR/R currency).

      Input Details:
      - Raw Title: "${title}"
      - Category: "${category}"
      - Condition: "${condition}"
      - Vehicle Fit: ${make || 'Unknown Make'} ${model || 'Unknown Model'} ${year || 'Unknown Year'}
      - Raw Description: "${description || 'None'}"
      - User Price: ${price ? `R${price}` : 'Not provided'}

      Please provide:
      1. A highly polished, SEO-friendly title that includes crucial technical descriptors (e.g., brand names, OEM-like fitment, specs).
      2. An enhanced description with:
         - A short engaging summary.
         - Bulleted "Specifications & Technical Details".
         - A "Condition Appraisal" explanation based on the user-selected condition ("Brand New" / "Like New" / "Good Used" / "Spares / Scrap").
         - Fitting / installation tips or warnings.
      3. A suggested price in South African Rands (ZAR) based on the item condition and description (only return a number).
      4. A comma-separated list of search keywords (for tags).
      5. An array of other car models/makes this part is likely compatible with (if applicable).

      Format the response strictly as a JSON object matching this schema:
      {
        "enhancedTitle": "string",
        "enhancedDescription": "string",
        "suggestedPriceZAR": number,
        "searchKeywords": ["string", "string"],
        "compatibilityList": ["string", "string"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedTitle: { type: Type.STRING, description: 'Polished SEO listing title' },
            enhancedDescription: { type: Type.STRING, description: 'Formatted markdown/bulleted description' },
            suggestedPriceZAR: { type: Type.INTEGER, description: 'Suggested selling price in Rands' },
            searchKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of relevant keywords'
            },
            compatibilityList: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of other car models it fits'
            }
          },
          required: ['enhancedTitle', 'enhancedDescription', 'suggestedPriceZAR', 'searchKeywords', 'compatibilityList']
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('No content returned from Gemini.');
    }

    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error('Gemini error enhancing listing:', error);
    res.status(500).json({
      error: 'Failed to enhance listing via AI.',
      details: error.message || error
    });
  }
});

// AI 2: Part Compatibility Checker
app.post('/api/ai/compatibility-check', async (req, res) => {
  try {
    const { partTitle, partCategory, partDescription, buyerMake, buyerModel, buyerYear, buyerEngine } = req.body;

    if (!partTitle || !buyerMake || !buyerModel) {
      return res.status(400).json({ error: 'Part details and Buyer vehicle details are required.' });
    }

    const ai = getGeminiClient();
    const prompt = `
      You are an expert car mechanic. Evaluate if the following automotive part is compatible with the buyer's vehicle.

      Part to buy:
      - Title: "${partTitle}"
      - Category: "${partCategory}"
      - Description: "${partDescription || 'No description provided.'}"

      Buyer's Vehicle:
      - Make: "${buyerMake}"
      - Model: "${buyerModel}"
      - Year: "${buyerYear || 'Unknown'}"
      - Engine/Details: "${buyerEngine || 'Unknown'}"

      Analyze technical indicators, part shapes, engine families (e.g. Volkswagen EA888, Toyota GD engine, BMW N20), and year transitions to assess compatibility.

      Determine:
      1. Is it compatible? Answer with 'Yes', 'No', or 'Maybe (Requires Verification)'.
      2. Confidence level: 'high' | 'medium' | 'low'.
      3. A clear explanation of your reasoning in South African English, including specific mechanical checks the buyer should perform (e.g., checking part numbers, comparing plug connectors, sensor locations, bolt holes, etc.). Keep it helpful, precise, and objective.

      Format the response strictly as a JSON object matching this schema:
      {
        "compatible": "Yes" | "No" | "Maybe",
        "confidence": "high" | "medium" | "low",
        "reasoning": "string"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            compatible: { type: Type.STRING, description: 'Compatibility answer (Yes, No, Maybe)' },
            confidence: { type: Type.STRING, description: 'Confidence level (high, medium, low)' },
            reasoning: { type: Type.STRING, description: 'Detailed expert reasoning and action steps' }
          },
          required: ['compatible', 'confidence', 'reasoning']
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('No content returned from Gemini.');
    }

    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error('Gemini error checking compatibility:', error);
    res.status(500).json({
      error: 'Failed to verify compatibility via AI.',
      details: error.message || error
    });
  }
});

// Secure Payment Simulation for South African subscriptions (PayFast / Capitec Pay / Instant EFT)
app.post('/api/payment/checkout-session', (req, res) => {
  try {
    const { planId, sellerId, sellerEmail, sellerName } = req.body;

    if (!planId || !sellerId || !sellerEmail) {
      return res.status(400).json({ error: 'Missing required parameters for subscription checkout.' });
    }

    const planPrices: Record<string, number> = {
      starter: 149,
      pro: 399
    };

    const price = planPrices[planId] || 149;
    const reference = `PD-SUB-${sellerId.substring(0, 5).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Create a simulation checkout payload
    const checkoutSession = {
      reference,
      planId,
      amount: price,
      currency: 'ZAR',
      sellerId,
      sellerEmail,
      sellerName,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Checkout session created successfully.',
      session: checkoutSession,
      // Provide a standard simulated payment URL
      paymentUrl: `/checkout-gateway?ref=${reference}&amount=${price}&plan=${planId}&email=${encodeURIComponent(sellerEmail)}&name=${encodeURIComponent(sellerName || '')}`
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create payment checkout session.', details: error.message });
  }
});

// Verify mock payment and return verification token
app.post('/api/payment/verify', (req, res) => {
  try {
    const { reference, planId, sellerId } = req.body;

    if (!reference || !planId || !sellerId) {
      return res.status(400).json({ error: 'Reference, Plan ID, and Seller ID are required.' });
    }

    // Verify format and simulate bank clearance
    const isValid = reference.startsWith('PD-SUB-');
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid payment reference structure.' });
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days validity

    res.json({
      success: true,
      verified: true,
      reference,
      planId,
      sellerId,
      subscriptionExpiry: expiryDate.toISOString(),
      token: `VERIFIED-TOKEN-${Buffer.from(`${sellerId}:${planId}:${expiryDate.toISOString()}`).toString('base64')}`
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Payment verification failed.', details: error.message });
  }
});

// Full-stack Vite server integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Partsdrive ZA Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
