
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
  const { category, platform, gender, ageRange, ethnicity, skin, undertone, hairColor, hairHighlights, hairStyle, outfit, location, aesthetic, goal, extra } = body;
  if (!category || !platform || !gender || !ageRange || !ethnicity || !skin || !aesthetic || !goal) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required fields' }) };
  }
  const hairDesc = [hairColor, hairHighlights && hairHighlights !== 'None' ? hairHighlights : null, hairStyle].filter(Boolean).join(', ');
  const skinDesc = undertone ? `${skin} with ${undertone.toLowerCase()} undertone` : skin;
  try {
    let trendContext = '';
    if (GEMINI_KEY) {
      try {
        const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: `Current visual trends for ${ethnicity} ${gender} creators on ${platform} in 2025. Two sentences only.` }] }] })
        });
        const gemData = await gemRes.json();
        if (gemData.candidates) trendContext = gemData.candidates[0].content.parts[0].text;
      } catch (e) { trendContext = ''; }
    }
    const prompt = `You are a master AI image prompt writer. Write one hyper-detailed image generation prompt ready to paste into Midjourney, Leonardo, Kling or OpenArt. Zero editing needed.\n\nSUBJECT:\n- Creating: ${category}\n- Platform: ${platform}\n- Model: ${ageRange} ${gender}\n- Ethnicity: ${ethnicity}\n- Skin: ${skinDesc}\n- Hair: ${hairDesc}\n- Outfit: ${outfit || 'stylish'}\n- Setting: ${location || 'studio'}\n- Aesthetic: ${aesthetic}\n- Feeling: ${goal}${extra ? `\n- Extra: ${extra}` : ''}${trendContext ? `\n\nTrend context: ${trendContext}` : ''}\n\nWrite ONE complete prompt. Start with the visual description. Include ethnicity, skin, hair in full detail, outfit, pose, setting, lighting, camera angle, lens, depth of field, colour grade, mood. No intro — just the prompt.`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
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
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message || 'Stylist generation failed' }) };
  }
};
