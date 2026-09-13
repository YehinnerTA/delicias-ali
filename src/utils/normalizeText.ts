export const normalizeText = (text: string): string => {
    if (!text) return '';

    return text
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .split(' ')
        .map(word => {
            if (word.length === 0) return '';
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
};

export const normalizeTextWithAcronyms = (text: string, acronyms: string[] = []): string => {
    if (!text) return '';

    const normalized = normalizeText(text);

    let result = normalized;
    acronyms.forEach(acronym => {
        const regex = new RegExp(`\\b${acronym}\\b`, 'gi');
        result = result.replace(regex, acronym);
    });

    return result;
};

export const isSameText = (a: string, b: string): boolean => {
    return normalizeText(a) === normalizeText(b);
};