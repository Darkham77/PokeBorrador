const fs = require('fs');
const path = require('path');

const PATTERNS = [
    /\$\{.*emoji\s*\|\|\s*'❓'\}/,
    /this\.nextElementSibling\.style\.display\s*=\s*'block'/,
    /onerror=.*p\.emoji/,
    /onerror=.*pokemon\.emoji/,
    /battle-sprite-emoji/,
    /player-sprite-emoji/,
    /enemy-sprite-emoji/,
    /team-emoji-/
];

const EXCLUDE_FILES = [
    '01_data.js',
    '23_market.js'
];

function verifyFiles(dir) {
    let issues = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            issues = issues.concat(verifyFiles(fullPath));
            continue;
        }

        if (!file.endsWith('.js') || EXCLUDE_FILES.includes(file)) continue;

        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, i) => {
            for (const pattern of PATTERNS) {
                if (pattern.test(line)) {
                    // Ignore legitimate item/icon fallbacks
                    if (line.includes('item.icon') || line.includes('item.sprite') || line.includes('stoneIcon')) continue;
                    issues.push(`[${file}:${i + 1}] ${line.trim()}`);
                }
            }
        });
    }
    return issues;
}

const jsDir = path.join(__dirname, 'js');
const issues = verifyFiles(jsDir);

if (issues.length > 0) {
    console.log(`Found ${issues.length} potential emoji placeholders:`);
    issues.forEach(issue => console.log(issue));
    process.exit(1);
} else {
    console.log("Success: No Pokemon emoji placeholders found in JS files.");
    process.exit(0);
}
