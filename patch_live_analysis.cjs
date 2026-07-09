const fs = require('fs');
let code = fs.readFileSync('src/components/LiveAnalysis.tsx', 'utf8');

code = code.replace(/setTimeout\(\(\) => \{(\s+)try \{(\s+)const engineInstance = new ChessEngine\(config\);(\s+)const res = engineInstance\.search\(currentChess\.fen\(\), 0\.85, currentChess\.history\(\)\);/g, "setTimeout(async () => {$1try {$2const engineInstance = new ChessEngine(config);$3const res = await engineInstance.search(currentChess.fen(), 0.85, currentChess.history());");

fs.writeFileSync('src/components/LiveAnalysis.tsx', code);
