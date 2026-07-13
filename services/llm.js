const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function evaluateWithGroq(persona, systemInstruction, query) {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are the ${persona} on an executive board. ${systemInstruction} Keep your answer brief, punchy, and under 3-4 sentences. Speak directly from your persona's perspective.`
                },
                {
                    role: "user",
                    content: query
                }
            ],
            model: "llama-3.1-8b-instant", // Using a fast, lightweight model for speed
            temperature: 0.7,
        });
        return completion.choices[0].message.content;
    } catch (err) {
        console.error(`Error with ${persona}:`, err);
        return "_Unavailable for comment._";
    }
}

module.exports = {
    evaluateWithGroq
};
