
import { GoogleGenAI } from "@google/genai";
import { WeeklySchedule } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getScheduleAdvice = async (schedule: WeeklySchedule, retries = 2): Promise<string> => {
  // Check if API_KEY is available in the environment
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "undefined") {
    console.warn("Gemini API Key missing. Tactical Intel is currently in offline mode.");
    return "Mission Control is currently offline. Follow your standard protocols and stay consistent, Commander!";
  }

  // Fix: Always use the process.env.API_KEY string directly when initializing the client
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const scheduleSummary = Object.entries(schedule)
    .filter(([_, items]) => items.length > 0)
    .map(([day, items]) => {
      return `${day}: ${items.map(i => `${i.label} (${i.category}) at ${i.startTime}`).join(', ')}`;
    }).join('\n');

  if (!scheduleSummary) {
    return "Your mission board is empty. Head to the Blueprint tab to draft your first operations!";
  }

  const prompt = `
    As an expert student coach, analyze this weekly schedule and provide 3 concise, encouraging tips.
    Schedule:
    ${scheduleSummary}
    
    Make it punchy, student-friendly, and use space exploration metaphors. Max 150 characters.
  `;

  for (let i = 0; i <= retries; i++) {
    try {
      // Fix: Use ai.models.generateContent to query the model with the prompt
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      // Fix: Access the text output via the .text property (not a method)
      return response.text?.trim() || "Optimal trajectory achieved. Proceed with mission.";
    } catch (error) {
      if (i === retries) {
        console.error("Final Gemini Error:", error);
        return "Tactical link unstable. Rely on your core training for now!";
      }
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
  return "Keep following your goals! Consistency is key.";
};
