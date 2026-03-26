const fs = require('fs');

function fix(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // 1. Remove duplicate close:
    const closeStr = file.includes('pt-BR') ? "'Fechar'" : "'Close'";
    const closeRegex = new RegExp(`\\n\\s*close:\\s*${closeStr},`, 'g');
    let matchCount = 0;
    content = content.replace(closeRegex, (match) => {
        matchCount++;
        return matchCount === 1 ? match : '';
    });

    // 2. Extract social block
    const startStr = '    // Social Hub\r\n';
    const endStr = '    // Achievements\r\n';
    
    // Try with \r\n
    let startIndex = content.indexOf(startStr);
    let endIndex = content.indexOf(endStr);
    
    if (startIndex === -1 || endIndex === -1) {
       // try \n
       const startStr2 = '    // Social Hub\n';
       const endStr2 = '    // Achievements\n';
       startIndex = content.indexOf(startStr2);
       endIndex = content.indexOf(endStr2);
    }
    
    if (startIndex !== -1 && endIndex !== -1) {
        const socialBlock = content.substring(startIndex, endIndex);
        content = content.substring(0, startIndex) + content.substring(endIndex);
        
        // Append it before the final };
        const finalBracket = '\n};\n';
        const finalBracketWin = '\r\n};\r\n';
        if (content.endsWith(finalBracket)) {
            content = content.replace(/\n\};\n$/, '\n' + socialBlock + '\n};\n');
        } else if (content.endsWith(finalBracketWin)) {
            content = content.replace(/\r\n\};\r\n$/, '\r\n' + socialBlock + '\r\n};\r\n');
        } else {
            content = content.replace(/\n\};?\s*$/, '\n' + socialBlock + '\n};\n');
        }
        
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed', file);
    } else {
        console.log('Could not find boundaries in', file);
    }
}

fix('./i18n/translations/pt-BR.ts');
fix('./i18n/translations/en-US.ts');
