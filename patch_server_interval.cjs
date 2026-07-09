const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/setInterval\(\(\) => \{(\s+)if \(!selfPlayActive\) return;/g, "setInterval(async () => {$1if (!selfPlayActive) return;");
code = code.replace(/const searchRes = engineInstance\.search\(liveGameChess\.fen\(\), trainingProgress\);/g, "const searchRes = await engineInstance.search(liveGameChess.fen(), trainingProgress);");

fs.writeFileSync('server.ts', code);
