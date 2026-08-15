import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

export const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});
