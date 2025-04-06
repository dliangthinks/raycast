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
    console.log("[DeepSeek Debug] Request:", {
      model: options.model,
      inputLength: query.length
    });

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
        const errorData = await response.json().catch(() => ({}));
        const statusText = response.statusText || "";
        let errorMsg = `HTTP error! status: ${response.status} ${statusText}`;
        
        if (errorData && errorData.error) {
          errorMsg += ` - ${errorData.error.message || errorData.error.type || JSON.stringify(errorData.error)}`;
        }
        
        throw new Error(errorMsg);
      }

      if (options.stream) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        let fullContent = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n").filter(line => line.trim() !== "");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const content = line.slice(6);
              // Skip [DONE] message
              if (content.trim() === "[DONE]") continue;
              
              try {
                const data = JSON.parse(content);
                const text = data.choices[0]?.delta?.content || "";
                if (text) {
                  fullContent += text;
                  options.stream(text);
                }
              } catch (e) {
                console.error("[DeepSeek Debug] Error parsing chunk:", content);
                // Skip invalid JSON chunks
                continue;
              }
            }
          }
        }
        return fullContent;
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "";
      
      console.log("[DeepSeek Debug] Response:", {
        outputLength: content.length,
        output: content.slice(0, 100) + (content.length > 100 ? '...' : '')
      });

      return content;
    } catch (error: any) {
      console.error("[DeepSeek Debug] Error:", {
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
      if (!this.apiKey || this.apiKey === "undefined" || this.apiKey === "") {
        llmError.message = "API key is missing or empty. Please add your DeepSeek API key in Raycast preferences.";
      } else if (error.message.includes("400")) {
        llmError.message = `Bad request: ${error.message}. This may be due to an invalid prompt or unsupported model.`;
      } else if (error.message.includes("401") || error.message.includes("403")) {
        llmError.message = `Authentication error: ${error.message}. Please check if your DeepSeek API key is valid.`;
      } else if (error.message.includes("blocked") || error.message.includes("safety")) {
        llmError.message = `Content safety violation: ${error.message}. Your prompt was flagged by DeepSeek's content filters.`;
      } else if (error.message.includes("ENOTFOUND") || error.message.includes("ETIMEDOUT")) {
        llmError.message = `Network error: ${error.message}. Please check your internet connection.`;
      } else if (error.message.includes("500")) {
        llmError.message = `DeepSeek API server error: ${error.message}. Please try again later.`;
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