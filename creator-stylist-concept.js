const OpenAI = require("openai");
exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { modelType, ageRange, ethnicity, skinTone, undertone, hairColour, hairFinish, hairStyle, outfitProduct, sceneLocation, contentGoal, platform, visualStyle, numberOfScenes } = JSON.parse(event.body || "{}");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.75,
      messages: [
        { role: "system", content: "You are The Creator Stylist, a premium private visual director for creators, brands and influencer-led sellers. Your role is to create the premium concept foundation for a visual content shoot. Do not write generic ideas. Do not explain yourself. Deliver a polished creative direction." },
        { role: "user", content: `Create a premium concept.\nModel Type: ${modelType}\nAge Range: ${ageRange}\nEthnicity: ${ethnicity}\nSkin Tone: ${skinTone}\nUndertone: ${undertone}\nHair Colour: ${hairColour}\nHair Finish: ${hairFinish}\nHair Style: ${hairStyle}\nOutfit/Product: ${outfitProduct}\nScene Location: ${sceneLocation}\nContent Goal: ${contentGoal}\nPlatform: ${platform||"TikTok"}\nVisual Style: ${visualStyle}\nNumber of Scenes: ${numberOfScenes}\n\nOutput:\nTITLE:\nCONCEPT OVERVIEW:\nCOMMERCIAL ANGLE:\nVISUAL MOOD:\nTARGET VIEWER:\nCREATOR DIRECTION:` }
      ]
    });
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ result: completion.choices[0].message.content }) };
  } catch(e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
};
