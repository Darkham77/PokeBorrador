import fs from 'node:fs';
import path from 'node:path';

async function main() {
    console.log("Fetching trainers page...");
    const res = await fetch("https://play.pokemonshowdown.com/sprites/trainers/?view=sprites");
    const html = await res.text();
    console.log(`Fetched HTML. Length: ${html.length} characters.`);
    
    // Find all figure blocks
    const figureRegex = /<figure[^>]*>([\s\S]*?)<\/figure>/g;
    let match;
    const items = [];
    
    while ((match = figureRegex.exec(html)) !== null) {
        const block = match[1];
        
        // Find src
        const srcMatch = block.match(/src="([^"]+)"/);
        // Find anchor tag text inside figcaption
        const linkMatch = block.match(/<a href="([^"]+)">([\s\S]*?)<\/a>/);
        
        if (srcMatch && linkMatch) {
            const src = srcMatch[1];
            const href = linkMatch[1];
            const text = linkMatch[2].trim();
            items.push({ src, href, text });
        }
    }
    
    console.log(`Found ${items.length} trainer sprites.`);
    if (items.length > 0) {
        console.log("First 5 items parsed:", items.slice(0, 5));
        console.log("Last 5 items parsed:", items.slice(-5));
    }
}

main().catch(console.error);
