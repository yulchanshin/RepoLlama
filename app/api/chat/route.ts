import { NextResponse } from 'next/server';
import { embedChunks } from '@/lib/ingest/embedChunks';
import { retrieveTopChunks } from '@/lib/search/retrieveTopChunks';
import { buildPrompt } from '@/lib/qa/buildPrompt';
import { askModel } from '@/lib/qa/askModel';
import { Chunk } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { messages, contextName } = body;

        if (!messages || !contextName) {
            return NextResponse.json({ error: 'Messages and contextName required' }, { status: 400 });
        }

        const lastMessage = messages[messages.length - 1];
        const query = lastMessage.content;

        // 1. Load context chunks
        const dataDir = path.join(process.cwd(), 'data');
        const filePath = path.join(dataDir, `${contextName}.json`);

        // Quick check if exists
        try { await fs.access(filePath); }
        catch { return NextResponse.json({ error: 'Context not found' }, { status: 404 }); }

        const fileContent = await fs.readFile(filePath, 'utf-8');
        const chunks: Chunk[] = JSON.parse(fileContent);

        // 2. Embed Query & Retrieve Context
        const embeddings = await embedChunks([query]);
        const queryEmbedding = embeddings[0];
        const topChunks = retrieveTopChunks(queryEmbedding, chunks, 5);

        // 3. Build Prompt
        const prompt = buildPrompt(query, topChunks);

        // 4. Call Model (Stream)
        const ollamaResponse = await askModel(prompt);

        // 5. Create a TransformStream to pass-through the Ollama stream
        // We want to send the sources as a header, so the client knows where the info came from
        const sourcesJson = JSON.stringify(topChunks.map(c => ({ source: c.source })));

        // Create a new response based on the Ollama stream
        // We can just return the stream directly, but we need to handle the format
        // Ollama returns JSON objects like { "response": "word", "done": false }
        // We can pipe this to the client.

        const stream = ollamaResponse.body;

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'application/json', // It sends separate JSON objects
                'x-sources': sourcesJson
            }
        });

    } catch (error: any) {
        console.error('Chat error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
