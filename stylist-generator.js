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

    const prompt = `You are a master AI image director and creative stylist. Based on this creator brief, produce a structured styling output with exactly 6 sections. Return ONLY valid JSON — no markdown, no explanation, no backticks.

BRIEF:
- Creating: ${category}
- Platform: ${platform}
- Model: ${ageRange} ${gender}
- Ethnicity: ${ethnicity}
- Skin: ${skinDesc}
- Hair: ${hairDesc || 'natural'}
- Outfit: ${outfit || 'stylish, aesthetic-appropriate'}
- Setting: ${location || 'clean studio'}
- Aesthetic: ${aesthetic}
- Feeling: ${goal}${extra ? `\n- Extra detail: ${extra}` : ''}${trendContext ? `\n- Current trend context: ${trendContext}` : ''}

Return this exact JSON structure:
{
  "lookBreakdown": "Detailed description of the exact look — skin, makeup, hair, outfit, accessories, expression. Be specific about every visible detail.",
  "sceneDirection": "The environment, background, lighting setup, colour palette of the scene, time of day or studio setup. Include atmosphere and mood.",
  "cameraDirection": "Camera angle, lens type, focal length, depth of field, shot type (close-up, mid-shot, full-length), framing and composition.",
  "mainPrompt": "The complete, hyper-detailed image generation prompt combining all of the above. Ready to paste into any AI image tool with zero editing. Start directly with the subject description.",
  "negativePrompt": "A precise negative prompt listing what to avoid — distortion, blur, bad proportions, watermarks, text, duplicate faces, extra limbs, overexposure, bad lighting etc.",
  "variations": "Three short alternative prompt variations of this same look — different angles, moods or settings. Label them Variation 1, Variation 2, Variation 3."
}`;

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
      throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
    }

    const data = await res.json();
    let raw = data.choices[0].message.content.trim();

    // Strip markdown code fences if present
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    let sections;
    try {
      sections = JSON.parse(raw);
    } catch (e) {
      // Fallback: return raw as mainPrompt only
      sections = {
        lookBreakdown: '',
        sceneDirection: '',
        cameraDirection: '',
        mainPrompt: raw,
        negativePrompt: 'blurry, distorted, bad proportions, watermark, text, duplicate, extra limbs, overexposed',
        variations: ''
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, sections })
    };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message || 'Stylist generation failed' }) };
  }
};
