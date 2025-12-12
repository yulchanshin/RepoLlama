export type Chunk = {
    id: string;
    filePath: string;
    startLine: number;
    endLine: number;
    text: string;
    embedding: number[];
};
