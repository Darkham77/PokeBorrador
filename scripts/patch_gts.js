const fs = require('fs');
const cssPath = 'd:/Documentos/GitHub/PokeBorrador/style_v5.css';

let css = fs.readFileSync(cssPath, 'utf8');

// Use a regex that is more flexible with whitespace and line endings
const oldRule = /\.action-btn\s*\{\s*padding:\s*14px;\s*border:\s*none;\s*border-radius:\s*12px;\s*cursor:\s*pointer;\s*font-family:\s*'Press Start 2P',\s*monospace;\s*font-size:\s*8px;\s*transition:\s*all\s*0\.2s;\s*color:\s*white;\s*\}/;

const newRule = `.action-btn {
      padding: 14px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      cursor: pointer;
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      transition: all 0.2s;
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }

    .action-btn.active {
      background: var(--purple) !important;
      border-color: var(--purple-light) !important;
      color: white !important;
      box-shadow: 0 0 15px rgba(191, 90, 242, 0.4);
    }`;

if (oldRule.test(css)) {
  css = css.replace(oldRule, newRule);
  fs.writeFileSync(cssPath, css);
  console.log('CSS patched successfully.');
} else {
  console.log('Target CSS block not found.');
  // Second attempt: maybe it has background:transparent?
  // Let's just try to find ".action-btn {" and replace the next 10 lines.
}
