export const toTitleCase = (str: string): string => {
    if (!str) return '';

    // Set of small words that should remain in lowercase unless they are the first word.
    const smallWords = new Set(['a', 'o', 'e', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'por', 'para', 'com', 's/']);
    
    return str.toLowerCase().split(' ').map((word, index) => {
        // Handle words with hyphens, like 'multi-word'
        if (word.includes('-')) {
            return word.split('-').map(subWord => 
                subWord.charAt(0).toUpperCase() + subWord.slice(1)
            ).join('-');
        }
        // Check if the word is a small word and not the first word in the sentence.
        if (index > 0 && smallWords.has(word)) {
            return word;
        }
        // Capitalize the first letter of other words.
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};
