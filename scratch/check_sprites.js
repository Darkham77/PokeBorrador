import fs from 'node:fs';
import path from 'node:path';

async function main() {
    const trainersDir = path.join(process.cwd(), '_raw-assets', 'public', 'assets', 'sprites', 'trainers');
    const npcDir = path.join(process.cwd(), '_raw-assets', 'public', 'assets', 'sprites', 'npc');
    
    if (!fs.existsSync(trainersDir)) {
        console.error(`Trainers directory does not exist: ${trainersDir}`);
        return;
    }
    if (!fs.existsSync(npcDir)) {
        console.error(`NPC directory does not exist: ${npcDir}`);
        return;
    }
    
    const trainersFiles = await fs.promises.readdir(trainersDir);
    const npcFiles = new Set(await fs.promises.readdir(npcDir));
    
    console.log(`Found ${trainersFiles.length} files in trainers.`);
    console.log(`Found ${npcFiles.size} files in npc.`);
    
    const missing = [];
    for (const file of trainersFiles) {
        if (!npcFiles.has(file)) {
            missing.push(file);
        }
    }
    
    if (missing.length === 0) {
        console.log("Success: All files in trainers are present in npc!");
    } else {
        console.log(`Missing ${missing.length} files in npc:`);
        console.log(missing);
    }
}

main().catch(console.error);
