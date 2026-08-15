import Groq from "groq-sdk";

// Initialize Groq client only if API key is provided.
// This allows the application to start even if GROQ_API_KEY is not configured.
// Specific routes that require Groq will handle the missing key error.
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});