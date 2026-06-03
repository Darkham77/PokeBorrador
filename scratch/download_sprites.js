import fs from 'node:fs';
import path from 'node:path';

const TARGET_DIR = path.join(process.cwd(), '_raw-assets', 'public', 'assets', 'npc');
const BASE_URL = 'https://play.pokemonshowdown.com/sprites/trainers/';
const CONCURRENCY_LIMIT = 20;

async function downloadFile(url, destPath) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(destPath, buffer);
}

async function main() {
    console.log("Fetching trainers page...");
    const pageRes = await fetch(`${BASE_URL}?view=sprites`);
    const html = await pageRes.text();
    
    // Create target directory if it doesn't exist
    await fs.promises.mkdir(TARGET_DIR, { recursive: true });
    
    const figureRegex = /<figure[^>]*>([\s\S]*?)<\/figure>/g;
    let match;
    const items = [];
    
    while ((match = figureRegex.exec(html)) !== null) {
        const block = match[1];
        const srcMatch = block.match(/src="([^"]+)"/);
        const linkMatch = block.match(/<a href="([^"]+)">([\s\S]*?)<\/a>/);
        
        if (srcMatch && linkMatch) {
            const src = srcMatch[1];
            const text = linkMatch[2].trim();
            const ext = path.extname(src) || '.png';
            
            // Clean text to avoid invalid filename characters just in case
            const cleanText = text.replace(/[\/\\?%*:|"<>]/g, '_');
            const filename = `${cleanText}${ext}`;
            
            items.push({
                url: new URL(src, BASE_URL).toString(),
                filename,
                destPath: path.join(TARGET_DIR, filename)
            });
        }
    }
    
    console.log(`Found ${items.length} trainer sprites to download.`);
    
    let activeDownloads = 0;
    let completed = 0;
    let index = 0;
    
    return new Promise((resolve, reject) => {
        function next() {
            if (index >= items.length) {
                if (activeDownloads === 0) {
                    console.log(`\nDownload completed successfully! Total downloaded: ${completed}`);
                    resolve();
                }
                return;
            }
            
            const item = items[index++];
            activeDownloads++;
            
            downloadFile(item.url, item.destPath)
                .then(() => {
                    completed++;
                    if (completed % 50 === 0 || completed === items.length) {
                        process.stdout.write(`Progress: ${completed}/${items.length}\r`);
                    }
                })
                .catch(err => {
                    console.error(`Error downloading ${item.url}:`, err.message);
                })
                .finally(() => {
                    activeDownloads--;
                    next();
                });
        }
        
        for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
            next();
        }
    });
}

main().catch(console.error);
