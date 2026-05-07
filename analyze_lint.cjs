
const fs = require('fs');
const path = require('path');

const results = JSON.parse(fs.readFileSync('lint-results.json', 'utf8'));

const fileSummary = results.map(res => ({
    filePath: path.relative(process.cwd(), res.filePath),
    errorCount: res.errorCount,
    warningCount: res.warningCount,
    messages: res.messages.reduce((acc, msg) => {
        acc[msg.ruleId] = (acc[msg.ruleId] || 0) + 1;
        return acc;
    }, {})
})).filter(f => f.errorCount > 0 || f.warningCount > 0)
  .sort((a, b) => b.errorCount - a.errorCount);

console.log(JSON.stringify(fileSummary.slice(0, 20), null, 2));
