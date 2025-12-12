export const cosineSimilarity = (a: number[], b: number[]) => {
    if (a.length !== b.length) {
        throw new Error("Vectors must have the same length");
    }

    const dotProduct = a.reduce((acc, val, idx) => acc + val * b[idx], 0);
    const normA = Math.sqrt(a.reduce((acc, val) => acc + val * val, 0));
    const normB = Math.sqrt(b.reduce((acc, val) => acc + val * val, 0));

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB)
}
