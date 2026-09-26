// src/utils/groq.js
const axios = require('axios');

function applyStyle(prompt, style) {
  switch (style) {
    case 'casual':
      return `Talk casually: ${prompt}`;
    case 'formal':
      return `Respond formally: ${prompt}`;
    case 'sarcastic':
      return `Respond sarcastically: ${prompt}`;
    case 'poetic':
      return `Respond poetically: ${prompt}`;
    case 'friendly':
      return `Respond in a friendly tone: ${prompt}`;
    default:
      return prompt;
  }
}

/**
 * Calls Groq API to generate text based on prompt, style, and model.
 * Returns a string (user-facing text) or a fallback message on error.
 */
async function callGroq(prompt, style = 'default', model = 'llama-3.1-8b-instant') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[groq] Missing GROQ_API_KEY environment variable.');
    return '⚠️ AI is not configured on this server. Please contact the admin.';
  }

  const styledPrompt = applyStyle(prompt, style);

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful and safe AI assistant integrated into a Discord bot called Uranium Bot. ' +
              'Answer concisely and format output suitable for Discord messages. ' +
              'Always adhere strictly to Discord Community Guidelines and Developer Policy: never generate harmful, abusive, harassing, sexually explicit, hateful, self-harming, or malicious content.'
          },
          {
            role: 'user',
            content: styledPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20_000 // 20s timeout
      }
    );

    // Defensive checks — API shapes vary
    const choices = response?.data?.choices;
    if (!choices || !Array.isArray(choices) || choices.length === 0) {
      console.error('[groq] Unexpected response shape (no choices):', response?.data);
      return '⚠️ AI returned an unexpected response. Please try again later.';
    }

    const message = choices[0]?.message;
    const text = (message?.content ?? choices[0]?.text ?? '').toString().trim();

    if (!text) {
      console.error('[groq] Empty AI response:', response.data);
      return '⚠️ AI returned an empty response. Please try again later.';
    }

    return text;
  } catch (err) {
    // log helpful info (avoid leaking secrets)
    const apiErr = err.response?.data || err.message;
    console.error('❌ Groq API Error:', apiErr);
    return '⚠️ Failed to get a response from the AI. Please try again later.';
  }
}

module.exports = { callGroq };
