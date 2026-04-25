exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const { concept, scenes, modelType, skinTone, undertone, hairColour, hairFinish, hairStyle, outfitProduct, visualStyle } = JSON.parse(event.body || "{}");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.65,
        messages: [
          { role: "system", content: "You are The Creator Stylist, a premium production director. You convert scenes into complete image prompts and video prompts. Every scene must include camera, lighting, movement, environment, styling and negative prompts. Be extremely precise." },
          { role: "user", content: `Create full production outputs.\n\nCONCEPT:\n${concept}\n\nSCENES:\n${scenes}\n\nModel Type: ${modelType}\nSkin Tone: ${skinTone}\nUndertone: ${undertone}\nHair Colour: ${hairColour}\nHair Finish: ${hairFinish}\nHair Style: ${hairStyle}\nOutfit/Product: ${outfitProduct}\nVisual Style: ${visualStyle}\n\nFor each scene:\nSCENE TITLE:\nIMAGE PROMPT:\nVIDEO PROMPT:\nCAMERA DIRECTION:\nLIGHTING:\nSTYLING:\nMOVEMENT:\nNEGATIVE PROMPT:\nStrictly prohibit: identity drift, outfit changes, morphing, floating products, extra fingers, distorted limbs, robotic motion, camera warping, text errors, product scale errors, unrealistic skin, plastic texture, sudden lighting changes, background changes and duplicated bodies. Be explicit.\nGLOBAL CONTINUITY LOCK:` }
        ]
      })
    });
    const data = await response.json();
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ result: data.choices[0].message.content }) };
  } catch(e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
};
