import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'config', 'email.config');

export async function GET() {
    try {
        await fs.access(CONFIG_FILE);
        return NextResponse.json({ exists: true });
    } catch {
        return NextResponse.json({ exists: false }, { status: 404 });
    }
}
