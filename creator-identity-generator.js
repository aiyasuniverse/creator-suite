exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: 'OPENAI_API_KEY is not set in Netlify environment variables.' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid request body' }) }; }

  const { niche, creatorType, visibility, enjoys, values, style, platform, audience, goal, incomeGoal, wontPost } = body;

  if (!niche || !creatorType || !audience) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required fields' }) };
  }

  const prompt = `You are a high-end brand strategist working with creators.

Your task: build a complete Creator Identity Profile from the answers below.

The output must feel personal, precise and premium. It must NOT sound generic, motivational or templated. Write as if you observed patterns in their answers — not just processed them. Validate the user's identity subtly. Make them feel understood without over-praising.

INPUT DATA:
- Space: "${niche}"
- Creator Type: "${creatorType}"
- Presence Style: "${visibility}"
- Interests & lifestyle: "${enjoys}"
- Core values: "${values}"
- Content vibe: "${style}"
- Platform: "${platform}"
- Audience: "${audience}"
- Success goal: "${goal}"
- Monetisation: "${incomeGoal}"
- Boundaries: "${wontPost}"

WRITING RULES:
- Be specific to these inputs
- No vague phrases like "be authentic"
- No repetition
- No fluff
- No emojis
- No motivational tone
- Write with calm authority
- Keep sentences clear and intentional
- This should feel like a £500 brand strategy document

IMPORTANT:
- Do not explain the sections
- Do not add extra commentary
- Do not break format
- Each section must feel distinct and purposeful
- Do not start output with any preamble

Return ONLY valid JSON. No markdown. No backticks. No explanation.

{
  "archetype": {
    "title": "The [Name]",
    "meaning": "2-3 sentences explaining what this archetype means for this specific person based on their answers"
  },
  "insight": "1-2 sharp lines of observation based on patterns across their answers. Make them feel seen.",
  "positioning": "You are not just a [niche]. You are someone who helps [audience] achieve [result] through [method/style].",
  "voice": {
    "tone": "3-4 words",
    "style": "3-4 words",
    "energy": "3-4 words"
  },
  "pillars": [
    { "name": "Pillar name", "explanation": "1-2 sentences specific to this creator" },
    { "name": "Pillar name", "explanation": "1-2 sentences specific to this creator" },
    { "name": "Pillar name", "explanation": "1-2 sentences specific to this creator" },
    { "name": "Pillar name", "explanation": "1-2 sentences specific to this creator" }
  ],
  "doNot": [
    "Specific boundary based on their answers",
    "Specific boundary based on their answers",
    "Specific boundary based on their answers"
  ],
  "audienceClarity": {
    "speaking_to": "Specific description of their audience",
    "they_want": "What this specific audience actually wants"
  },
  "contentDirection": [
    "Specific actionable guidance line",
    "Specific actionable guidance line",
    "Specific actionable guidance line"
  ],
  "bios": {
    "clear": "Direct, benefit-led. Under 15 words.",
    "elevated": "Refined, identity-led. Under 15 words.",
    "minimal": "3-5 words. No explanation needed."
  }
}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `OpenAI error: ${res.status}`);
    }

    const data = await res.json();
    let raw = data.choices[0].message.content.trim();
    raw = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'');

    let identity;
    try { identity = JSON.parse(raw); }
    catch(e) { throw new Error('Failed to parse identity output'); }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, identity })
    };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message || 'Identity generation failed' }) };
  }
};
