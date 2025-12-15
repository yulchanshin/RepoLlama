import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// GET /api/contexts - List all contexts
export async function GET() {
    try {
        // Ensure dir exists
        try {
            await fs.mkdir(DATA_DIR, { recursive: true });
        } catch (e) { }

        const files = await fs.readdir(DATA_DIR);
        const contexts = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(DATA_DIR, file);
                const stats = await fs.stat(filePath);
                contexts.push({
                    name: file.replace('.json', ''),
                    fileName: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                });
            }
        }

        return NextResponse.json(contexts);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/contexts - Delete a context
export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Sanitize
        const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
        const filePath = path.join(DATA_DIR, `${safeName}.json`);

        await fs.unlink(filePath);

        return NextResponse.json({ status: 'success', deleted: safeName });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
