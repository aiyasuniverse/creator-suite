exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!OPENAI_KEY) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: 'OPENAI_API_KEY is not set in Netlify environment variables.' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid request body' }) }; }

  const { niche, brand, audience, offer, platform, tone, stylistData } = body;

  if (!niche || !brand || !audience || !offer || !platform || !tone) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required fields' }) };
  }

  try {
    // Optional Gemini context — trends only, short
    let trendContext = '';
    if (GEMINI_KEY) {
      try {
        const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: `Top 3 content trends for ${niche} creators on ${platform} in 2025. One sentence each.` }] }] })
        });
        const gemData = await gemRes.json();
        if (gemData.candidates) trendContext = gemData.candidates[0].content.parts[0].text;
      } catch (e) {
        trendContext = '';
      }
    }

    // Stylist visual context if available
    const stylistContext = stylistData && stylistData.gender
      ? `\nCreator visual identity: ${stylistData.gender}, ${stylistData.ageRange || ''}, ${stylistData.ethnicity || ''}, ${stylistData.aesthetic || ''} aesthetic. Weave this into prompts naturally.`
      : '';

    // Single OpenAI call — final output
    const prompt = `You are an expert content strategist for ${niche} creators. Generate exactly 40 content prompts for this creator.

Brand: ${brand}
Platform: ${platform}
Target audience: ${audience}
What they sell: ${offer}
Content tone: ${tone}${stylistContext}${trendContext ? `\nCurrent trends to weave in: ${trendContext}` : ''}

Requirements:
- Every prompt must feel written specifically for ${brand} — not generic
- 5 prompts each across these 8 categories:
  1. Hook & attention-grabbing openers
  2. Educational / value posts
  3. Personal story & behind the scenes
  4. Audience engagement & questions
  5. Social proof & results
  6. Selling & conversion posts
  7. Trending formats for their niche
  8. Mindset & motivation

Format: [NUMBER]. [CATEGORY] — [The prompt]

No intro, no outro. Just the 40 numbered prompts.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
    }

    const data = await res.json();
    const result = data.choices[0].message.content;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, result })
    };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message || 'Vault generation failed' }) };
  }
};
