import { GoogleGenAI } from "@google/genai";
import { AskOptions, LLMProvider, LLMError } from "../types";

export default class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;
  public name = "gemini";

  constructor(apiKey: string) {
    console.log("[Gemini Debug] Initializing Gemini provider");
    if (!apiKey) {
      console.error("[Gemini Debug] No API key provided");
      throw new Error("Gemini API key is required");
    }
    this.client = new GoogleGenAI({ apiKey });
    console.log("[Gemini Debug] Gemini client initialized");
  }

  async getModels(): Promise<string[]> {
    return [
      "gemini-2.0-flash",
      "gemini-2.5-pro-preview-03-25"
    ];
  }

  async ask(query: string, options: AskOptions): Promise<string> {
    console.log("[Gemini Debug] Request:", {
      model: options.model,
      inputLength: query.length
    });

    try {
      if (!this.client) {
        throw new Error("Gemini client not initialized");
      }

      // Validate the model is supported
      const supportedModels = await this.getModels();
      if (!supportedModels.includes(options.model || "")) {
        console.error(`[Gemini Debug] Error: Unsupported model ${options.model}`);
        throw new Error(`Model ${options.model} is not supported. Supported models: ${supportedModels.join(", ")}`);
      }

      if (options.stream) {
        let fullContent = "";
        const response = await this.client.models.generateContentStream({
          model: options.model || "gemini-2.0-flash",
          contents: query
        });
        
        for await (const chunk of response) {
          const text = chunk.text;
          if (text) {
            fullContent += text;
            options.stream(text);
          }
        }
        
        console.log("[Gemini Debug] Response:", {
          outputLength: fullContent.length,
          output: fullContent.slice(0, 100) + (fullContent.length > 100 ? '...' : '')
        });
        
        return fullContent;
      } else {
        const response = await this.client.models.generateContent({
          model: options.model || "gemini-2.0-flash",
          contents: query
        });
        
        const text = response.text;
        if (!text) {
          throw new Error("Empty response from Gemini API");
        }

        console.log("[Gemini Debug] Response:", {
          outputLength: text.length,
          output: text.slice(0, 100) + (text.length > 100 ? '...' : '')
        });
        
        return text;
      }
    } catch (error: any) {
      console.error("[Gemini Debug] Error:", {
        message: error.message,
        type: error.message.includes("429") ? "rate_limit" :
              error.message.includes("401") || error.message.includes("403") ? "authentication" :
              error.message.includes("blocked") || error.message.includes("safety") ? "content_policy" :
              error.message.includes("ENOTFOUND") || error.message.includes("ETIMEDOUT") ? "network_error" :
              error.message.includes("500") ? "server_error" : "unknown"
      });
      
      const llmError = new Error(error.message) as LLMError;
      llmError.provider = this.name;
      llmError.isRateLimit = error.message.includes("429") || error.message.toLowerCase().includes("rate limit");
      
      // Add more details to common error types
      if (!this.client) {
        llmError.message = "API key is missing or empty. Please add your Gemini API key in Raycast preferences.";
      } else if (error.message.includes("400")) {
        llmError.message = `Bad request: ${error.message}. This may be due to an invalid prompt or unsupported model.`;
      } else if (error.message.includes("401") || error.message.includes("403")) {
        llmError.message = `Authentication error: ${error.message}. Please check if your Gemini API key is valid.`;
      } else if (error.message.includes("blocked") || error.message.includes("safety")) {
        llmError.message = `Content safety violation: ${error.message}. Your prompt was flagged by Gemini's content filters.`;
      } else if (error.message.includes("ENOTFOUND") || error.message.includes("ETIMEDOUT")) {
        llmError.message = `Network error: ${error.message}. Please check your internet connection.`;
      } else if (error.message.includes("500")) {
        llmError.message = `Gemini API server error: ${error.message}. Please try again later.`;
      }
      
      llmError.errorType = error.message.includes("429") ? "rate_limit" :
                          error.message.includes("401") || error.message.includes("403") ? "authentication" :
                          error.message.includes("blocked") || error.message.includes("safety") ? "content_policy" :
                          error.message.includes("ENOTFOUND") || error.message.includes("ETIMEDOUT") ? "network_error" :
                          error.message.includes("500") ? "server_error" : "unknown";
      
      llmError.details = {
        status: error.status || error.statusCode,
        original: error
      };
      
      throw llmError;
    }
  }

  async stream(query: string, callback: (text: string) => void, options: AskOptions): Promise<void> {
    return this.ask(query, { ...options, stream: callback }).then(() => {});
  }
} 