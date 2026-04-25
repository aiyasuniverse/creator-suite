const OpenAI = require("openai");
exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { concept, scenes, modelType, skinTone, undertone, hairColour, hairFinish, hairStyle, outfitProduct, visualStyle } = JSON.parse(event.body || "{}");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.65,
      messages: [
        { role: "system", content: "You are The Creator Stylist, a premium production director. You convert scenes into complete image prompts and video prompts. Every scene must include camera, lighting, movement, environment, styling and negative prompts. Be extremely precise." },
        { role: "user", content: `Create full production outputs.\n\nCONCEPT:\n${concept}\n\nSCENES:\n${scenes}\n\nModel Type: ${modelType}\nSkin Tone: ${skinTone}\nUndertone: ${undertone}\nHair Colour: ${hairColour}\nHair Finish: ${hairFinish}\nHair Style: ${hairStyle}\nOutfit/Product: ${outfitProduct}\nVisual Style: ${visualStyle}\n\nFor each scene:\nSCENE TITLE:\nIMAGE PROMPT:\nVIDEO PROMPT:\nCAMERA DIRECTION:\nLIGHTING:\nSTYLING:\nMOVEMENT:\nNEGATIVE PROMPT:
Strictly prohibit: identity drift, outfit changes, morphing, floating products, extra fingers, distorted limbs, robotic motion, camera warping, text errors, product scale errors, unrealistic skin, plastic texture, sudden lighting changes, background changes and duplicated bodies. Be explicit.\nGLOBAL CONTINUITY LOCK:` }
      ]
    });
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ result: completion.choices[0].message.content }) };
  } catch(e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
};
