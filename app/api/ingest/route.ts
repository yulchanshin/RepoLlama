import { NextResponse } from 'next/server';
import { walkRepo } from '@/lib/ingest/walkRepo';
import { chunkFile } from '@/lib/ingest/chunkFile';
import { embedChunks } from '@/lib/ingest/embedChunks';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { path: repoPath, name: contextName } = body;

        if (!repoPath) {
            return NextResponse.json({ error: 'Path is required' }, { status: 400 });
        }

        // Determine context name
        let name = contextName;
        if (!name) {
            name = path.basename(repoPath);
        }

        // Sanitize name to prevent path traversal or invalid chars
        name = name.replace(/[^a-zA-Z0-9-_]/g, '_');

        // 1. Walk the repo
        const files = await walkRepo(repoPath);
        console.log(`Found ${files.length} files in ${repoPath}`);

        // 2. Read and chunk files
        const allChunks: { source: string; text: string }[] = [];

        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                const chunks = chunkFile(content);

                for (const chunk of chunks) {
                    allChunks.push({
                        source: file,
                        text: chunk,
                    });
                }
            } catch (err) {
                console.error(`Error reading/chunking file ${file}:`, err);
                // Continue to next file
            }
        }

        console.log(`Generated ${allChunks.length} chunks. Starting embedding...`);

        // 3. Generate embeddings
        // Extract just the text for embedding
        const rawTexts = allChunks.map(c => c.text);
        const embeddings = await embedChunks(rawTexts);

        // 4. Combine data
        if (embeddings.length !== allChunks.length) {
            throw new Error('Mismatch between chunk count and embedding count');
        }

        const dataToSave = allChunks.map((chunk, i) => ({
            ...chunk,
            embedding: embeddings[i],
        }));

        // 5. Save to disk (named context)
        const dataDir = path.join(process.cwd(), 'data');
        // Ensure data dir exists
        try {
            await fs.mkdir(dataDir, { recursive: true });
        } catch (e) {
            // Ignore if exists
        }

        const fileName = `${name}.json`;
        const outputPath = path.join(dataDir, fileName);
        await fs.writeFile(outputPath, JSON.stringify(dataToSave, null, 2));

        return NextResponse.json({
            status: 'success',
            name: name,
            fileName: fileName,
            filesProcessed: files.length,
            chunksGenerated: allChunks.length,
            dbPath: outputPath
        });

    } catch (error: any) {
        console.error('Ingestion error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
