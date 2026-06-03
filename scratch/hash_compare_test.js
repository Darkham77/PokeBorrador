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
    const testDir = path.join(process.cwd(), '_raw-assets', 'public', 'assets', 'sprites', 'test');
    const npcDir = path.join(process.cwd(), '_raw-assets', 'public', 'assets', 'sprites', 'npc');
    
    if (!fs.existsSync(testDir)) {
        console.error(`Test directory does not exist: ${testDir}`);
        return;
    }
    if (!fs.existsSync(npcDir)) {
        console.error(`NPC directory does not exist: ${npcDir}`);
        return;
    }
    
    const testFiles = await fs.promises.readdir(testDir);
    const npcFiles = await fs.promises.readdir(npcDir);
    
    console.log(`Calculating hashes for ${npcFiles.length} files in npc...`);
    const npcHashMap = new Map();
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
    
    console.log(`Calculating hashes for ${testFiles.length} files in test and matching...`);
    const matches = [];
    const unmatched = [];
    
    for (const file of testFiles) {
        const filePath = path.join(testDir, file);
        try {
            const hash = getFileHash(filePath);
            if (npcHashMap.has(hash)) {
                matches.push({
                    testFile: file,
                    npcFiles: npcHashMap.get(hash),
                    hash
                });
            } else {
                unmatched.push({
                    testFile: file,
                    hash
                });
            }
        } catch (e) {
            console.error(`Error hashing test file ${file}:`, e.message);
        }
    }
    
    console.log(`\n--- RESULTS ---`);
    console.log(`Matches found: ${matches.length} / ${testFiles.length}`);
    console.log(`Unmatched: ${unmatched.length} / ${testFiles.length}`);
    
    // Save report in scratch
    const reportPath = path.join(process.cwd(), 'scratch', 'test_compare_report.json');
    const reportData = {
        totalTest: testFiles.length,
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
