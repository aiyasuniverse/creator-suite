exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const { concept, modelType, outfitProduct, sceneLocation, numberOfScenes } = JSON.parse(event.body || "{}");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: "You are The Creator Stylist, a high-end scene director. You take a concept and build structured scenes. Each scene must be clear, premium, human, realistic and commercially useful. Maintain continuity across all scenes." },
          { role: "user", content: `Build the scene structure from this concept:\n${concept}\n\nModel Type: ${modelType}\nOutfit/Product: ${outfitProduct}\nScene Location: ${sceneLocation}\nNumber of Scenes: ${numberOfScenes||3}\n\nFor each scene:\nSCENE [N]:\nPurpose:\nLocation:\nInfluencer Position:\nAction:\nProduct/Outfit Visibility:\nCamera Framing:\nContinuity Notes:\n\nRules: Each scene must feel different. No robotic movement. Build for 9:16 vertical TikTok.` }
        ]
      })
    });
    const data = await response.json();
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ result: data.choices[0].message.content }) };
  } catch(e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
};
