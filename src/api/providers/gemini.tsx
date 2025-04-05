import Gemini from "gemini-ai";
import fetch from "node-fetch";
import { AskOptions, LLMProvider, LLMError } from "../types";

export default class GeminiProvider implements LLMProvider {
  private client: any;
  public name = "gemini";

  constructor(apiKey: string) {
    this.client = new Gemini(apiKey, { fetch });
  }

  async getModels(): Promise<string[]> {
    // For now, return the static list of models
    // In the future, this could be fetched from the API
    return [
      "gemini-1.5-pro-latest",
      "gemini-1.5-flash-latest",
      "learnlm-1.5-pro-experimental",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
      "gemini-2.0-flash-thinking-exp",
      "gemini-exp-1206",
      "gemini-2.0-pro-exp"
    ];
  }

  async ask(query: string, options: AskOptions): Promise<string> {
    try {
      const response = await this.client.ask(query, {
        model: options.model,
        stream: options.stream,
        data: options.data,
      });
      return response;
    } catch (error: any) {
      const llmError = new Error(error.message) as LLMError;
      llmError.provider = this.name;
      llmError.isRateLimit = error.message.includes("429");
      throw llmError;
    }
  }

  async stream(query: string, callback: (text: string) => void, options: AskOptions): Promise<void> {
    return this.ask(query, { ...options, stream: callback }).then(() => {});
  }
} 