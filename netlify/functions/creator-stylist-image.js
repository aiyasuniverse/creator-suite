exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const { imagePrompt } = JSON.parse(event.body || "{}");
    if (!imagePrompt) return { statusCode: 400, body: JSON.stringify({ error: "Missing image prompt." }) };
    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "gpt-image-1", prompt: imagePrompt, size: "1024x1536", quality: "high" })
      });
      const data = await response.json();
      if (data.data && data.data[0]) {
        return { statusCode: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ image: `data:image/png;base64,${data.data[0].b64_json}` }) };
      }
      throw new Error("No image returned from gpt-image-1");
    } catch(e1) {
      const fallback = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "dall-e-3", prompt: imagePrompt, size: "1024x1792", quality: "hd", style: "vivid", response_format: "url" })
      });
      const fallbackData = await fallback.json();
      return { statusCode: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ image: fallbackData.data[0].url }) };
    }
  } catch(e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
};
