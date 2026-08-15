// Server-side OpenAI client. Mirrors lib/groq.ts pattern.
// Only import this from server code (API routes) - it is not client-safe.
// Initializes with empty key if not provided; specific routes handle missing key error.

import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});