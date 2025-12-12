import { cosineSimilarity } from "./cosineSimilarity";
import { Chunk } from "../types";

export const retrieveTopChunks = (
    queryEmbedding: number[],
    chunks: Chunk[],
    k: number = 5
): Chunk[] => {
    // 1. Calculate similarity score for each chunk
    const scoredChunks = chunks.map((chunk) => {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding);
        return { ...chunk, score };
    });

    // 2. Sort by score (descending)
    scoredChunks.sort((a, b) => b.score - a.score);

    // 3. Return top k
    return scoredChunks.slice(0, k);
};
