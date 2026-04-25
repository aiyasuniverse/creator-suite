const OpenAI = require("openai");
exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { imagePrompt } = JSON.parse(event.body || "{}");
    if (!imagePrompt) return { statusCode: 400, body: JSON.stringify({ error: "Missing image prompt." }) };
    try {
      const response = await openai.images.generate({ model: "gpt-image-1", prompt: imagePrompt, size: "1024x1536", quality: "high" });
      return { statusCode: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ image: `data:image/png;base64,${response.data[0].b64_json}` }) };
    } catch(e1) {
      const fallback = await openai.images.generate({ model: "dall-e-3", prompt: imagePrompt, size: "1024x1792", quality: "hd", style: "vivid", response_format: "url" });
      return { statusCode: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ image: fallback.data[0].url }) };
    }
  } catch(e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
};
