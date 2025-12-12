// This function takes an array of text chunks and generates embeddings for them using Ollama.
export const embedChunks = async (chunks: string[]) => {
    const embeddings: number[][] = [];
    const OLLAMA_URL = "http://localhost:11434/api/embeddings";
    const MODEL = "nomic-embed-text"; // Ensure this model is pulled in Ollama

    console.log(`Generating embeddings for ${chunks.length} chunks...`);

    for (const [index, chunk] of chunks.entries()) {
        try {
            const response = await fetch(OLLAMA_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: MODEL,
                    prompt: chunk,
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            const data = await response.json();
            embeddings.push(data.embedding);

            //Logging
            if ((index + 1) % 10 === 0) {
                console.log(`Processed ${index + 1}/${chunks.length} chunks`);
            }
        } catch (error) {
            console.error(`Failed to embed chunk index ${index}:`, error);
            throw error;
        }
    }

    return embeddings;
};
