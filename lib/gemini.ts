import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyCz0VnIukG2tQzNgo_oYeqG6ZBCI4sjjTs";
const genAI = new GoogleGenerativeAI(API_KEY);

export async function getBusinessInsights(restaurantData: any) {
  if (!API_KEY) {
    return "API Key is missing.";
  }

  const prompt = `
    You are a professional restaurant business consultant. 
    Analyze the following restaurant data and provide 3 actionable, high-impact business improvement tips.
    The data is as follows:
    Restaurant Name: ${restaurantData.name}
    Total Orders Today: ${restaurantData.ordersToday}
    Total Revenue Today: ${restaurantData.revenueToday}
    Most Popular Items: ${restaurantData.popularItems.join(", ")}
    
    Format your response as a bulleted list.
  `;

  try {
    // Attempt with 1.5-flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.warn("Gemini 1.5 Flash failed, attempting Gemini 1.0 Pro fallback...", error.message);
    try {
      // Fallback to gemini-1.0-pro (sometimes named just gemini-pro)
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
      const result = await fallbackModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (fallbackError: any) {
      console.error("Gemini AI Final Error:", fallbackError.message);
      return "I'm having trouble analyzing your data right now. Please try again later.";
    }
  }
}
