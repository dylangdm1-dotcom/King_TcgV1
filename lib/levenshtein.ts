import { pokemonNames } from "./pokemonTranslator";

function levenshtein(a: string, b: string): number {
    const matrix = Array.from(
        { length: b.length + 1 },
        () => new Array(a.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i++) {
        matrix[0][i] = i;
    }

    for (let j = 0; j <= b.length; j++) {
        matrix[j][0] = j;
    }

    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {

            const cost = a[i - 1] === b[j - 1] ? 0 : 1;

            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + cost
            );
        }
    }

    return matrix[b.length][a.length];
}

export function findClosestPokemon(name: string): string | null {

    let bestEnglish: string | null = null;
    let bestDistance = Infinity;

    for (const [frenchName, englishName] of Object.entries(pokemonNames)) {

        const distanceFr = levenshtein(name, frenchName);
        const distanceEn = levenshtein(name, englishName);

        const distance = Math.min(distanceFr, distanceEn);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestEnglish = englishName;
        }
    }

    if (bestDistance <= 2) {
        return bestEnglish;
    }

    return null;
}