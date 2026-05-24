import fs from 'node:fs';
import path from 'node:path';

// Read the list of transition violations
const violationsText = fs.readFileSync('scratch/transitions_list.txt', 'utf-8');
const lines = violationsText.split('\n');

// Extract unique Vue files
const vueFiles = new Set();
for (const line of lines) {
  const match = line.match(/src\\[^\s:]+\.vue/);
  if (match) {
    vueFiles.add(match[0].replace(/\\/g, '/'));
  }
}

console.log(`Found ${vueFiles.size} unique Vue files to clean.`);

// Regex to match transition properties in CSS
const transitionRegex = /\btransition(-property|-duration|-timing-function|-delay)?\s*:[^;}]*;?/gi;

let cleanedCount = 0;

for (const file of vueFiles) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find all <style> blocks
  // We match <style ...> ... </style> non-greedily
  const styleBlockRegex = /(<style[\s\S]*?>)([\s\S]*?)(<\/style>)/gi;
  
  let modified = false;
  const newContent = content.replace(styleBlockRegex, (match, openTag, styleContent, closeTag) => {
    // Clean transitions only inside the style content
    const cleanedStyle = styleContent.replace(transitionRegex, (prop) => {
      modified = true;
      return '';
    });
    return openTag + cleanedStyle + closeTag;
  });

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Cleaned style block transitions in: ${file}`);
    cleanedCount++;
  } else {
    console.log(`No transitions found in style blocks of: ${file}`);
  }
}

console.log(`Successfully cleaned transitions in ${cleanedCount} files.`);
