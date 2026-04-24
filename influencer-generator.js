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

  const { gender, ageRange, ethnicity, skin, undertone, hairColor, hairHighlights, hairStyle, outfit, location, aesthetic, goal, platform, category, extra } = body;

  if (!gender || !ageRange || !ethnicity || !skin) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Please complete the Creator Stylist profile first — gender, age, ethnicity and skin tone are required.' }) };
  }

  const hairDesc = [hairColor, hairHighlights && hairHighlights !== 'None' ? hairHighlights : null, hairStyle].filter(Boolean).join(', ');
  const skinDesc = undertone ? `${skin} with ${undertone.toLowerCase()} undertone` : skin;

  try {
    // Optional Gemini — influencer trend context only
    let trendContext = '';
    if (GEMINI_KEY) {
      try {
        const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: `Visual trends for ${ethnicity} ${gender} influencers on ${platform || 'Instagram'} in 2025. Two sentences only.` }] }] })
        });
        const gemData = await gemRes.json();
        if (gemData.candidates) trendContext = gemData.candidates[0].content.parts[0].text;
      } catch (e) {
        trendContext = '';
      }
    }

    // Single OpenAI call — three-section influencer prompt package
    const prompt = `You are a master AI image prompt architect for influencer content. Write a complete influencer image prompt package based on this profile. Ready to use in Midjourney, Leonardo, OpenArt or Kling.

SUBJECT PROFILE:
- Gender: ${gender}
- Age: ${ageRange}
- Ethnicity: ${ethnicity}
- Skin: ${skinDesc}
- Hair: ${hairDesc || 'natural'}
- Outfit: ${outfit || 'stylish, brand-appropriate'}
- Setting: ${location || 'clean studio'}
- Aesthetic: ${aesthetic || 'clean and modern'}
- Feeling: ${goal || 'confident and aspirational'}
- Platform: ${platform || 'Instagram'}${category ? `\n- Shot type: ${category}` : ''}${extra ? `\n- Additional details: ${extra}` : ''}${trendContext ? `\n\nCurrent influencer trend context: ${trendContext}` : ''}

Write THREE sections:

1. MAIN IMAGE PROMPT
One detailed paragraph ready to use as an AI image prompt. Include: subject (ethnicity, skin, hair in full detail), outfit, expression, pose, setting, lighting, camera angle, lens, depth of field, colour grade, mood. Specific and cinematic.

2. SCENE DESCRIPTION
2-3 sentences describing the full scene and atmosphere for a photographer or art director.

3. STYLING NOTES
4 bullet points of specific styling details to get exactly right.

No generic outputs. Every detail specific to this person.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1500,
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
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message || 'Influencer generation failed' }) };
  }
};
