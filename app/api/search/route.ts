import { NextResponse } from 'next/server';
import { embedChunks } from '@/lib/ingest/embedChunks';
import { retrieveTopChunks } from '@/lib/search/retrieveTopChunks';
import { Chunk } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { query, contextName } = body;

        if (!query || !contextName) {
            return NextResponse.json(
                { error: 'Query and contextName are required' },
                { status: 400 }
            );
        }

        // 1. Embed the query
        // embedChunks expects an array of strings
        const embeddings = await embedChunks([query]);
        const queryEmbedding = embeddings[0];

        // 2. Load the context
        const dataDir = path.join(process.cwd(), 'data');
        const filePath = path.join(dataDir, `${contextName}.json`);

        try {
            await fs.access(filePath);
        } catch {
            return NextResponse.json(
                { error: 'Context not found' },
                { status: 404 }
            );
        }

        const fileContent = await fs.readFile(filePath, 'utf-8');
        const chunks: Chunk[] = JSON.parse(fileContent);

        // 3. Retrieve top chunks
        const results = retrieveTopChunks(queryEmbedding, chunks, 5);

        return NextResponse.json({ results });

    } catch (error: any) {
        console.error('Search error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
