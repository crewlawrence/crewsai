const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateCaptions(imageBase64, style, count = 5) {
  try {
    const stylePrompts = {
      creative: 'creative and engaging social media captions with emojis',
      professional: 'professional and business-appropriate captions',
      funny: 'humorous and witty captions that make people laugh',
      poetic: 'poetic and artistic captions with beautiful language',
      minimalist: 'short, minimalist captions (5 words or less)',
      storytelling: 'narrative-driven captions that tell a story',
    };

    const prompt = `Analyze this image and generate ${count} different ${stylePrompts[style] || stylePrompts.creative}. 
    Return ONLY a JSON array of strings, nothing else. Example: ["caption 1", "caption 2", "caption 3"]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const captions = JSON.parse(response.choices[0].message.content);
    return captions;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to generate captions');
  }
}

module.exports = { generateCaptions };