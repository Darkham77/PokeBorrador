const fs = require('fs');
let cssStr = fs.readFileSync('style_v5.css', 'utf8');
let lines = cssStr.split('\n');
lines.splice(-2);
lines.push('@keyframes slideUp {');
lines.push('  from { transform: translateY(20px); opacity: 0; }');
lines.push('  to { transform: translateY(0); opacity: 1; }');
lines.push('}');
fs.writeFileSync('style_v5.css', lines.join('\n'), 'utf8');
