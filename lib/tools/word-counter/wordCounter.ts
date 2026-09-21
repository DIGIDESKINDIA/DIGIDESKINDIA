export const READING_WORDS_PER_MINUTE = 200;

export type WordCountResult = {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTimeMinutes: number;
  averageWordsPerSentence: number;
  averageCharactersPerWord: number;
};

const EMPTY_RESULT: WordCountResult = {
  words: 0,
  characters: 0,
  charactersNoSpaces: 0,
  sentences: 0,
  paragraphs: 0,
  readingTimeMinutes: 0,
  averageWordsPerSentence: 0,
  averageCharactersPerWord: 0,
};

const FALLBACK_WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}\p{M}\p{Join_Control}'\u2019-]*/gu;
const SENTENCE_BOUNDARY_PATTERN = /[.!?\u0964\u0965]+/u;
const WORD_CONTENT_PATTERN = /[\p{L}\p{N}]/u;

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function segmentText(text: string, granularity: Intl.SegmenterOptions["granularity"]): Intl.SegmentData[] | null {
  if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") {
    return null;
  }

  return Array.from(new Intl.Segmenter(undefined, { granularity }).segment(text));
}

function countWords(text: string): number {
  const segments = segmentText(text, "word");
  if (segments) {
    return segments.filter((segment) => segment.isWordLike).length;
  }

  return text.match(FALLBACK_WORD_PATTERN)?.length ?? 0;
}

function getCharacterCounts(text: string): Pick<WordCountResult, "characters" | "charactersNoSpaces"> {
  const segments = segmentText(text, "grapheme");
  if (segments) {
    return {
      characters: segments.length,
      charactersNoSpaces: segments.filter((segment) => !/^\s$/u.test(segment.segment)).length,
    };
  }

  const characters = Array.from(text);
  return {
    characters: characters.length,
    charactersNoSpaces: characters.filter((character) => !/\s/u.test(character)).length,
  };
}

function countSentences(text: string): number {
  return text
    .split(SENTENCE_BOUNDARY_PATTERN)
    .filter((segment) => WORD_CONTENT_PATTERN.test(segment)).length;
}

function countParagraphs(text: string): number {
  return text.split(/\r?\n/u).filter((line) => WORD_CONTENT_PATTERN.test(line)).length;
}

export function analyzeText(text: string): WordCountResult {
  const words = countWords(text);
  const characterCounts = getCharacterCounts(text);
  if (words === 0) {
    return { ...EMPTY_RESULT, ...characterCounts };
  }

  const sentences = countSentences(text);

  return {
    words,
    ...characterCounts,
    sentences,
    paragraphs: countParagraphs(text),
    readingTimeMinutes: Math.ceil(words / READING_WORDS_PER_MINUTE),
    averageWordsPerSentence: sentences ? roundToTwoDecimals(words / sentences) : 0,
    averageCharactersPerWord: roundToTwoDecimals(characterCounts.charactersNoSpaces / words),
  };
}