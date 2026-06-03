import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function getFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

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
    const npcFiles = await fs.promises.readdir(npcDir);
    
    console.log(`Calculating hashes for ${npcFiles.length} files in npc...`);
    const npcHashMap = new Map(); // hash -> array of filenames (since multiple files might have the same hash)
    for (const file of npcFiles) {
        const filePath = path.join(npcDir, file);
        try {
            const hash = getFileHash(filePath);
            if (!npcHashMap.has(hash)) {
                npcHashMap.set(hash, []);
            }
            npcHashMap.get(hash).push(file);
        } catch (e) {
            console.error(`Error hashing NPC file ${file}:`, e.message);
        }
    }
    
    console.log(`Calculating hashes for ${trainersFiles.length} files in trainers and matching...`);
    const matches = [];
    const unmatched = [];
    
    for (const file of trainersFiles) {
        const filePath = path.join(trainersDir, file);
        try {
            const hash = getFileHash(filePath);
            if (npcHashMap.has(hash)) {
                matches.push({
                    trainerFile: file,
                    npcFiles: npcHashMap.get(hash),
                    hash
                });
            } else {
                unmatched.push({
                    trainerFile: file,
                    hash
                });
            }
        } catch (e) {
            console.error(`Error hashing trainer file ${file}:`, e.message);
        }
    }
    
    console.log(`\n--- RESULTS ---`);
    console.log(`Matches found: ${matches.length} / ${trainersFiles.length}`);
    console.log(`Unmatched: ${unmatched.length} / ${trainersFiles.length}`);
    
    if (matches.length > 0) {
        console.log(`\nSample Matches:`);
        matches.slice(0, 15).forEach(m => {
            console.log(`  ${m.trainerFile}  ==>  ${m.npcFiles.join(', ')}`);
        });
    }
    
    if (unmatched.length > 0) {
        console.log(`\nSample Unmatched:`);
        unmatched.slice(0, 15).forEach(u => {
            console.log(`  ${u.trainerFile} (hash: ${u.hash})`);
        });
    }
    
    // Save report in scratch
    const reportPath = path.join(process.cwd(), 'scratch', 'hash_compare_report.json');
    const reportData = {
        totalTrainers: trainersFiles.length,
        totalNPCs: npcFiles.length,
        matchesCount: matches.length,
        unmatchedCount: unmatched.length,
        matches,
        unmatched
    };
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\nFull report saved to: ${reportPath}`);
}

main().catch(console.error);
