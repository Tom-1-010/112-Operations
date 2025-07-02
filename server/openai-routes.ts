
import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenAI client only if API key is available
let openai: OpenAI | null = null;
let openrouter: OpenAI | null = null;

// OpenAI setup
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('✅ OpenAI API configured');
} else {
  console.log('⚠️ OpenAI API key not found (OPENAI_API_KEY)');
}

// OpenRouter setup
if (process.env.OPENROUTER_API_KEY) {
  openrouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });
  console.log('✅ OpenRouter API configured');
} else {
  console.log('⚠️ OpenRouter API key not found (OPENROUTER_API_KEY)');
}

// Enhanced Dutch emergency caller prompt
const DUTCH_EMERGENCY_CALLER_PROMPT = `Je bent een Nederlandse burger die 112 belt in een noodsituatie. Je bent getraind om realistische en authentieke gesprekken te voeren volgens Nederlandse normen en cultuur.

BELANGRIJKE INSTRUCTIES:
- Spreek uitsluitend Nederlands
- Gebruik natuurlijke Nederlandse uitdrukkingen en taalgebruik
- Reageer emotioneel realistisch op de situatie (paniek, stress, bezorgdheid)
- Geef geleidelijk informatie prijs zoals een echte burger zou doen
- Gebruik Nederlandse plaatsnamen en adressen
- Volg Nederlandse sociale normen en communicatiepatronen

Je speelt verschillende scenario's:
- Verkeersongevallen
- Branden  
- Inbraken
- Geweldsincidenten
- Medische noodsituaties
- Overlast

Reageer natuurlijk op vragen van de meldkamer operator en geef realistische details over de situatie.`;

router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], scenarioType = 'algemeen' } = req.body;

    // Determine which AI service to use (prioritize OpenRouter if available)
    const aiClient = openrouter || openai;
    const aiService = openrouter ? 'OpenRouter' : 'OpenAI';

    if (!aiClient) {
      return res.status(500).json({ 
        error: 'Geen AI API key geconfigureerd. Stel OPENROUTER_API_KEY of OPENAI_API_KEY in als environment variable.' 
      });
    }

    console.log(`🤖 Using ${aiService} for 112 conversation - Scenario: ${scenarioType}`);

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `${DUTCH_EMERGENCY_CALLER_PROMPT}

HUIDIGE SITUATIE: ${scenarioType}
Reageer als een Nederlandse burger die 112 belt voor deze specifieke situatie.`
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.type === 'incoming' ? 'assistant' : 'user',
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Select appropriate model based on service
    const model = openrouter ? 'anthropic/claude-3.5-sonnet' : 'gpt-4';
    
    const completion = await aiClient.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 150, // Verkort voor snellere response
      temperature: 0.8,
      timeout: 2500, // 2.5 seconde timeout
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Ik kan u niet goed verstaan...';

    res.json({ response: aiResponse });
  } catch (error) {
    const service = openrouter ? 'OpenRouter' : 'OpenAI';
    console.error(`${service} API error:`, error);
    res.status(500).json({ 
      error: `Er ging iets mis met de ${service} AI response. Probeer opnieuw.` 
    });
  }
});

export default router;
