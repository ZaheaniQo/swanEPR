
import { supabase } from "./supabaseClient";

export const aiService = {
  /**
   * Generates content using Supabase Edge Function
   */
  async generateContent(prompt: string, model: string = "gemini-2.5-flash") {
    try {
      const { data, error } = await supabase.functions.invoke('gemini-generate', {
        body: { prompt, model }
      });

      if (error) throw error;
      return data.text;
    } catch (error) {
      console.error("AI Generation Error:", error);
      // Fallback or mock for demo if function is not deployed
      return "AI Service unavailable (Supabase Edge Function not deployed). Mock response: " + prompt;
    }
  },

  /**
   * Analyzes an image
   */
  async analyzeImage(base64Image: string, prompt: string) {
    try {
      const { data, error } = await supabase.functions.invoke('gemini-analyze-image', {
        body: { image: base64Image, prompt }
      });

      if (error) throw error;
      return data.text;
    } catch (error) {
      console.error("Image Analysis Error:", error);
      throw error;
    }
  }
};
