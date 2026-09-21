export const OCR_LANGUAGES = ["eng", "hin", "eng+hin"] as const;
export type OcrLanguage = (typeof OCR_LANGUAGES)[number];
