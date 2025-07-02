
import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenAI client (API key should be set via environment variable)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.' 
      });
    }

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      max_tokens: 200,
      temperature: 0.8,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Ik kan u niet goed verstaan...';

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      error: 'Er ging iets mis met de AI response. Probeer opnieuw.' 
    });
  }
});

export default router;
