const OpenAI = require("openai");
exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { concept, scenes, production, outfitProduct, contentGoal, platform } = JSON.parse(event.body || "{}");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        { role: "system", content: "You are The Creator Stylist's TikTok content strategist. You turn premium visual direction into ready-to-post short-form content packaging. Avoid repetition. Make every line commercially relevant." },
        { role: "user", content: `Create TikTok-ready content packaging.\n\nCONCEPT:\n${concept}\n\nSCENES:\n${scenes}\n\nPRODUCTION OUTPUT:\n${production}\n\nProduct/Outfit: ${outfitProduct}\nContent Goal: ${contentGoal}\nPlatform: ${platform||"TikTok"}\n\nOutput:\nHOOK OPTIONS: (5 scroll-stopping hooks)\nON-SCREEN TEXT OPTIONS: (5 options)\nCAPTION: (1 polished caption)\nPINNED COMMENT: (1 comment driving purchase intent)\nHASHTAGS: (15 relevant)\nHIDDEN SEO WORDS:` }
      ]
    });
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ result: completion.choices[0].message.content }) };
  } catch(e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
};
