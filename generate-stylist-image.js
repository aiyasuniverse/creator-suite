exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: 'OPENAI_API_KEY is not set.' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid request body' }) }; }

  const { sections, style, productFocus } = body;

  if (!sections || !sections.mainPrompt) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing sections or mainPrompt' }) };
  }

  // Translate style into prompt wording for gpt-image-1
  const styleWording = style === 'natural'
    ? 'natural soft lighting, realistic skin texture, editorial photography, soft colour tones, true-to-life'
    : 'vivid high-contrast lighting, bold saturated colours, cinematic quality, sharp crisp detail, striking visual impact';

  // Build enhanced combined prompt for image generation
  // This is internal only — never shown to user
  const enhancedPrompt = [
    sections.lookBreakdown ? `LOOK: ${sections.lookBreakdown}` : '',
    sections.sceneDirection ? `SCENE: ${sections.sceneDirection}` : '',
    sections.cameraDirection ? `CAMERA: ${sections.cameraDirection}` : '',
    `SUBJECT: ${sections.mainPrompt}`,
    `STYLE: ${styleWording}`,
    productFocus ? 'PRODUCT: product is clearly visible, in sharp focus, legible branding, correct proportions' : '',
    'QUALITY: consistent identity, realistic human proportions, no distortion, no warping, correct facial features, professional photography, photorealistic'
  ].filter(Boolean).join('\n\n');

  const negativePrompt = sections.negativePrompt || 
    'blurry, distorted, warped face, bad anatomy, extra limbs, duplicate, watermark, text, overexposed, underexposed, artificial plastic skin, cartoon, illustration';

  // Try gpt-image-1 first
  try {
    const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1536',
        quality: 'high'
      })
    });

    if (imgRes.ok) {
      const imgData = await imgRes.json();
      const base64 = imgData.data?.[0]?.b64_json;
      if (base64) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ success: true, image: base64, format: 'base64', model: 'gpt-image-1' })
        };
      }
    }

    // gpt-image-1 failed — fall through to dall-e-3
    console.log('gpt-image-1 failed, falling back to dall-e-3');

  } catch (e) {
    console.log('gpt-image-1 error:', e.message, '— falling back to dall-e-3');
  }

  // Fallback: dall-e-3
  try {
    const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1792',
        quality: 'hd',
        style: style === 'natural' ? 'natural' : 'vivid',
        response_format: 'url'
      })
    });

    if (!dalleRes.ok) {
      const err = await dalleRes.json();
      throw new Error(err.error?.message || `DALL-E 3 error: ${dalleRes.status}`);
    }

    const dalleData = await dalleRes.json();
    const url = dalleData.data?.[0]?.url;
    if (!url) throw new Error('No image returned from DALL-E 3');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, image: url, format: 'url', model: 'dall-e-3' })
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: e.message || 'Image generation failed' })
    };
  }
};
