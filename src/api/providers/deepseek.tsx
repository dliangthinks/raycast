import { AskOptions, LLMProvider, LLMError } from "../types";

export default class DeepSeekProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl = "https://api.deepseek.com/v1";
  public name = "deepseek";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data.map((model: any) => model.id);
    } catch (error: any) {
      console.error("Failed to fetch DeepSeek models:", error);
      return [
        "deepseek-chat",
        "deepseek-coder",
        "deepseek-math"
      ];
    }
  }

  async ask(query: string, options: AskOptions): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.model || "deepseek-chat",
          messages: [{ role: "user", content: query }],
          stream: Boolean(options.stream),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (options.stream) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n").filter(line => line.trim() !== "");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              const content = data.choices[0]?.delta?.content || "";
              options.stream(content);
            }
          }
        }
        return "";
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    } catch (error: any) {
      const llmError = new Error(error.message) as LLMError;
      llmError.provider = this.name;
      llmError.isRateLimit = error.status === 429;
      throw llmError;
    }
  }

  async stream(query: string, callback: (text: string) => void, options: AskOptions): Promise<void> {
    await this.ask(query, { ...options, stream: callback });
  }
} 