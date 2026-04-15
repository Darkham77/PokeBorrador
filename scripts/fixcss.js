const fs = require('fs');
let css = fs.readFileSync('style_v5.css', 'utf8');

// Find the last valid bracket
const lastValidIndex = css.lastIndexOf('}');
if (lastValidIndex !== -1) {
    // Truncate
    css = css.substring(0, lastValidIndex + 1);
    
    // Append the correct keyframes
    css += '\n\n@keyframes slideUp {\n  from { transform: translateY(20px); opacity: 0; }\n  to { transform: translateY(0); opacity: 1; }\n}\n';
    
    fs.writeFileSync('style_v5.css', css, 'utf8');
    console.log('Successfully repaired CSS EOF');
} else {
    console.log('Could not find last bracket');
}
