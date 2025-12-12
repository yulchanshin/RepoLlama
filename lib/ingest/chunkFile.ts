export const chunkFile = (
    text: string,
    chunkSize: number = 1000,
    overlap: number = 200
): string[] => {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = start + chunkSize;
        chunks.push(text.slice(start, end));
        // Move window forward, respecting overlap
        start += chunkSize - overlap;
    }

    return chunks;
};
