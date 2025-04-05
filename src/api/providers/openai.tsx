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
      const response = await this.client.chat.completions.create({
        model: options.model || "gpt-3.5-turbo",
        messages: [{ role: "user", content: query }],
        stream: Boolean(options.stream),
      });

      if (options.stream) {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || "";
          options.stream(content);
        }
        return ""; // Content already streamed
      }

      return response.choices[0]?.message?.content || "";
    } catch (error: any) {
      const llmError = new Error(error.message) as LLMError;
      llmError.provider = this.name;
      llmError.isRateLimit = error.status === 429;
      throw llmError;
    }
  }

  async stream(query: string, callback: (text: string) => void, options: AskOptions): Promise<void> {
    return this.ask(query, { ...options, stream: callback });
  }
} 