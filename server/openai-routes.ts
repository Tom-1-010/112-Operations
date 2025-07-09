
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
// Enhanced 112 script system with structured scenarios
const STRUCTURED_112_SCENARIOS = {
  'afpersing': {
    category: 'Bezitsaantasting',
    subcategory: 'Diefstal', 
    priority: 1,
    isUrgent: true,
    initialResponse: "112, wat is uw noodsituatie?",
    followUpQuestions: [
      "Wat is er precies gebeurd?",
      "Waar bevindt u zich nu?",
      "Bent u gewond geraakt?",
      "Zijn de daders nog in de buurt?",
      "Kunt u de daders beschrijven?"
    ]
  },
  'beroving': {
    category: 'Bezitsaantasting', 
    subcategory: 'Diefstal',
    priority: 1,
    isUrgent: true,
    initialResponse: "112, wat is uw noodsituatie?",
    followUpQuestions: [
      "Wat is er gestolen?",
      "Waar bent u nu?",
      "Bent u gewond?",
      "Welke kant zijn ze op gevlucht?",
      "Waren ze gewapend?"
    ]
  },
  'dier': {
    category: 'Bezitsaantasting',
    subcategory: 'Diefstal', 
    priority: 3,
    isUrgent: false,
    initialResponse: "112, wat is uw noodsituatie?",
    followUpQuestions: [
      "Welk dier is er gestolen?",
      "Wanneer heeft u dit ontdekt?",
      "Heeft u vermoedens wie dit gedaan heeft?",
      "Wilt u aangifte doen?"
    ]
  }
};

// Load structured scenario data from JSON file
router.post('/generate-structured-scenario', async (req, res) => {
  try {
    // In a real implementation, you would load your JSON file here
    // For now, we'll use the predefined scenarios above
    
    const scenarioTypes = Object.keys(STRUCTURED_112_SCENARIOS);
    const randomScenario = scenarioTypes[Math.floor(Math.random() * scenarioTypes.length)];
    const scenario = STRUCTURED_112_SCENARIOS[randomScenario];
    
    // Generate random caller details
    const callerTypes = ['slachtoffer', 'omstander'];
    const randomCallerType = callerTypes[Math.floor(Math.random() * callerTypes.length)];
    
    // Generate phone number
    const phoneNumber = `06-${Math.floor(Math.random() * 90000000 + 10000000)}`;
    
    const structuredScenario = {
      type: randomScenario,
      category: scenario.category,
      subcategory: scenario.subcategory,
      priority: scenario.priority,
      isUrgent: scenario.isUrgent,
      callerType: randomCallerType,
      phoneNumber: phoneNumber,
      initialResponse: scenario.initialResponse,
      questions: scenario.followUpQuestions,
      scriptData: {
        categorie: scenario.category,
        subcategorie: scenario.subcategory,
        classificatie: randomScenario.charAt(0).toUpperCase() + randomScenario.slice(1),
        spoed: scenario.isUrgent,
        melder: {
          type: randomCallerType,
          naam: "Anoniem",
          telefoon: phoneNumber
        }
      }
    };
    
    console.log(`🎯 Generated structured scenario: ${randomScenario} (${randomCallerType})`);
    
    res.json(structuredScenario);
    
  } catch (error) {
    console.error('Error generating structured scenario:', error);
    res.status(500).json({ error: 'Failed to generate structured scenario' });
  }
});

// Enhanced chat endpoint that uses structured scripts
router.post('/chat-with-script', async (req, res) => {
  try {
    const { 
      message, 
      conversationHistory = [], 
      scenarioData = null,
      currentQuestionIndex = 0 
    } = req.body;

    const aiClient = openrouter || openai;
    const aiService = openrouter ? 'OpenRouter' : 'OpenAI';

    if (!aiClient) {
      return res.status(500).json({ 
        error: 'Geen AI API key geconfigureerd.' 
      });
    }

    let systemPrompt = DUTCH_EMERGENCY_CALLER_PROMPT;
    
    // If we have structured scenario data, enhance the prompt
    if (scenarioData && scenarioData.scriptData) {
      const script = scenarioData.scriptData;
      systemPrompt += `

SCENARIO DETAILS:
- Type incident: ${script.classificatie}
- Categorie: ${script.categorie} > ${script.subcategorie}
- Melder type: ${script.melder.type}
- Urgentie: ${script.spoed ? 'Spoed' : 'Niet spoed'}

Je speelt de rol van een ${script.melder.type} die belt over een ${script.classificatie.toLowerCase()}.

GEDRAGSINSTRUCTIES:
- Wees realistisch emotioneel (paniek bij spoed, bezorgdheid bij niet-spoed)
- Geef informatie geleidelijk prijs zoals een echte burger
- Gebruik Nederlandse uitdrukkingen en taalgebruik
- Reageer natuurlijk op vragen van de meldkamer`;
    }

    console.log(`🤖 Using ${aiService} for structured 112 conversation`);

    const messages = [
      {
        role: 'system',
        content: systemPrompt
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

    const model = openrouter ? 'anthropic/claude-3.5-sonnet' : 'gpt-4';
    
    const completion = await aiClient.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 150,
      temperature: 0.8,
      timeout: 2500,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Ik kan u niet goed verstaan...';

    res.json({ 
      response: aiResponse,
      scenarioData: scenarioData // Pass back scenario data for continuity
    });
    
  } catch (error) {
    const service = openrouter ? 'OpenRouter' : 'OpenAI';
    console.error(`${service} API error:`, error);
    res.status(500).json({ 
      error: `Er ging iets mis met de ${service} AI response. Probeer opnieuw.` 
    });
  }
});
