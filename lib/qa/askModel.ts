export const askModel = async (prompt: string) => {
    const OLLAMA_URL = "http://localhost:11434/api/generate";
    const MODEL = "llama3.1"; // Or whatever model the user has

    // Create a fetch request to Ollama
    const response = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL,
            prompt: prompt,
            stream: true, // Enable streaming
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
    }

    return response;
};
