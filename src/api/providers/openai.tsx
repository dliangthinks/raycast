import OpenAI from "openai";
import { AskOptions, LLMProvider, LLMError } from "../types";

export default class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  public name = "openai";

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data
        .map(model => model.id)
        .filter(id => id.startsWith("gpt-")); // Only return GPT models
    } catch (error: any) {
      console.error("Failed to fetch OpenAI models:", error);
      return [
        "gpt-4-turbo-preview",
        "gpt-4",
        "gpt-3.5-turbo"
      ];
    }
  }

  async ask(query: string, options: AskOptions): Promise<string> {
    try {
      if (options.stream) {
        const response = await this.client.chat.completions.create({
          model: options.model || "gpt-3.5-turbo",
          messages: [{ role: "user", content: query }],
          stream: true,
        });
        
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || "";
          options.stream(content);
        }
        return ""; // Content already streamed
      } else {
        const response = await this.client.chat.completions.create({
          model: options.model || "gpt-3.5-turbo",
          messages: [{ role: "user", content: query }],
          stream: false,
        });
        
        return response.choices[0]?.message?.content || "";
      }
    } catch (error: any) {
      const llmError = new Error(error.message || "Unknown OpenAI error") as LLMError;
      llmError.provider = this.name;
      llmError.isRateLimit = error.status === 429 || 
                            (error.error && error.error.type === "rate_limit_exceeded") ||
                            error.message?.includes("rate limit");
                            
      // Extract error info from OpenAI format
      if (!this.client.apiKey || this.client.apiKey === "undefined" || this.client.apiKey === "") {
        llmError.message = "API key is missing or empty. Please add your OpenAI API key in Raycast preferences.";
      } else if (error.status === 401 || error.message?.includes("authentication")) {
        llmError.message = "Invalid API key or authentication error. Please check your OpenAI API key.";
      } else if (error.status === 400 || error.message?.includes("model")) {
        llmError.message = `Model error: ${error.message}. The specified model may be invalid or unavailable.`;
      } else if (error.status === 404) {
        llmError.message = "Resource not found. The model you requested may not exist.";
      } else if (error.status === 500) {
        llmError.message = "OpenAI server error. Please try again later.";
      } else if (error.message?.includes("content filter") || error.message?.includes("moderation")) {
        llmError.message = `Content policy violation: ${error.message}. Your prompt was flagged by OpenAI's content filters.`;
      }
      
      throw llmError;
    }
  }

  async stream(query: string, callback: (text: string) => void, options: AskOptions): Promise<void> {
    await this.ask(query, { ...options, stream: callback });
  }
} 