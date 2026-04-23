
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!OPENAI_KEY) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: 'OPENAI_API_KEY is not set' }) };
  }
  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid request body' }) }; }
  const { niche, brand, audience, offer, platform, tone } = body;
  if (!niche || !brand || !audience || !offer || !platform || !tone) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required fields' }) };
  }
  try {
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
      } catch (e) { trendContext = ''; }
    }
    const prompt = `You are an expert content strategist for ${niche} creators. Generate exactly 40 content prompts.\n\nBrand: ${brand}\nPlatform: ${platform}\nAudience: ${audience}\nWhat they sell: ${offer}\nTone: ${tone}${trendContext ? `\nTrends: ${trendContext}` : ''}\n\n5 prompts each across 8 categories:\n1. Hook & attention-grabbing openers\n2. Educational / value posts\n3. Personal story & behind the scenes\n4. Audience engagement & questions\n5. Social proof & results\n6. Selling & conversion posts\n7. Trending formats\n8. Mindset & motivation\n\nFormat: [NUMBER]. [CATEGORY] — [prompt]\nNo intro or outro. Just 40 numbered prompts.`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `OpenAI error: ${res.status}`);
    }
    const data = await res.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, result: data.choices[0].message.content })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message || 'Vault generation failed' }) };
  }
};
