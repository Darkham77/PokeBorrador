const fs = require('fs');
let css = fs.readFileSync('style_v5.css', 'utf8');

// Find the mobile block and replace the location-card styles
const mobileBlockStart = css.indexOf('@media (max-width: 600px)');
if (mobileBlockStart === -1) {
    console.error('Could not find mobile block');
    process.exit(1);
}

// Target the specific location-card block within mobile (line 2571 onwards)
// We use a regex that matches the old min-height: 72px
const oldCardRegex = /\.location-card\s*\{\s*padding:\s*14px 14px 14px 60px;\s*display:\s*flex;\s*flex-direction:\s*column;\s*justify-content:\s*center;\s*min-height:\s*72px;\s*\}/;

const newCardStyle = `.location-card {
        padding: 16px;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        text-align: center;
        min-height: 160px;
        gap: 8px;
        width: 100%;
        box-sizing: border-box;
      }`;

if (oldCardRegex.test(css)) {
    css = css.replace(oldCardRegex, newCardStyle);
    console.log('Replaced location-card');
} else {
    console.log('Regex did not match for location-card');
}

// Replace location-icon
const oldIconRegex = /\.location-icon\s*\{\s*font-size:\s*28px;\s*position:\s*absolute;\s*left:\s*14px;\s*top:\s*50%;\s*transform:\s*translateY\(-50%\);\s*margin:\s*0;\s*\}/;
const newIconStyle = `.location-icon {
        font-size: 32px;
        margin: 0 auto 10px;
        display: block;
        position: static;
        transform: none;
      }`;

if (oldIconRegex.test(css)) {
    css = css.replace(oldIconRegex, newIconStyle);
    console.log('Replaced location-icon');
}

// Replace name/desc/tag
const oldTextRegex = /\.location-name\s*\{\s*font-size:\s*9px;\s*margin-bottom:\s*4px;\s*\}\s*\.location-desc\s*\{\s*font-size:\s*11px;\s*\}\s*\.location-tag\s*\{\s*font-size:\s*9px;\s*padding:\s*3px 8px;\s*\}/;
const newTextStyle = `.location-name {
        font-size: 11px;
        margin-bottom: 6px;
        width: 100%;
        color: var(--yellow);
      }

      .location-desc {
        font-size: 11px;
        line-height: 1.3;
        margin-bottom: 10px;
        width: 100%;
        color: #ddd;
      }

      .location-tag {
        font-size: 11px;
        padding: 4px 10px;
        position: absolute;
        top: 10px;
        right: 10px;
      }`;

if (oldTextRegex.test(css)) {
    css = css.replace(oldTextRegex, newTextStyle);
    console.log('Replaced text styles');
}

fs.writeFileSync('style_v5.css', css, 'utf8');
console.log('Done');
