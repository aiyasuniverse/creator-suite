exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const { concept, scenes, production, outfitProduct, contentGoal, platform } = JSON.parse(event.body || "{}");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          { role: "system", content: "You are The Creator Stylist's TikTok content strategist. You turn premium visual direction into ready-to-post short-form content packaging. Avoid repetition. Make every line commercially relevant." },
          { role: "user", content: `Create TikTok-ready content packaging.\n\nCONCEPT:\n${concept}\n\nSCENES:\n${scenes}\n\nPRODUCTION OUTPUT:\n${production}\n\nProduct/Outfit: ${outfitProduct}\nContent Goal: ${contentGoal}\nPlatform: ${platform||"TikTok"}\n\nOutput:\nHOOK OPTIONS: (5 scroll-stopping hooks)\nON-SCREEN TEXT OPTIONS: (5 options)\nCAPTION: (1 polished caption)\nPINNED COMMENT: (1 comment driving purchase intent)\nHASHTAGS: (15 relevant)\nHIDDEN SEO WORDS:` }
        ]
      })
    });
    const data = await response.json();
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ result: data.choices[0].message.content }) };
  } catch(e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
};
