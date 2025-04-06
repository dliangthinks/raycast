import { getPreferenceValues } from "@raycast/api";
import { LLMProvider, getCachedModels, setCachedModels } from "./types";
import GeminiProvider from "./providers/gemini";
import OpenAIProvider from "./providers/openai";
import DeepSeekProvider from "./providers/deepseek";

export type ProviderType = "gemini" | "openai" | "deepseek";

class LLMManager {
  private static instance: LLMManager;
  private providers: Map<ProviderType, LLMProvider | null>;
  private modelCache: Map<ProviderType, Promise<string[]>>;

  private constructor() {
    this.providers = new Map();
    this.modelCache = new Map();
    
    // Initialize map with null values - providers will be created on demand
    this.providers.set("gemini", null);
    this.providers.set("openai", null);
    this.providers.set("deepseek", null);
  }

  public static getInstance(): LLMManager {
    if (!LLMManager.instance) {
      LLMManager.instance = new LLMManager();
    }
    return LLMManager.instance;
  }

  private initializeProvider(type: ProviderType): LLMProvider {
    const prefs = getPreferenceValues();
    
    let provider: LLMProvider;
    switch (type) {
      case "gemini":
        provider = new GeminiProvider(prefs.geminiApiKey);
        break;
      case "openai":
        provider = new OpenAIProvider(prefs.openaiApiKey);
        break;
      case "deepseek":
        provider = new DeepSeekProvider(prefs.deepseekApiKey);
        break;
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
    
    this.providers.set(type, provider);
    return provider;
  }

  public getProvider(type: ProviderType): LLMProvider {
    let provider = this.providers.get(type);
    if (!provider) {
      provider = this.initializeProvider(type);
    }
    return provider;
  }

  public getDefaultModel(type: ProviderType): string {
    const prefs = getPreferenceValues();
    switch (type) {
      case "gemini":
        return prefs.geminiModel || "gemini-2.0-flash";
      case "openai":
        return prefs.openaiModel || "gpt-4-0125-preview";
      case "deepseek":
        return prefs.deepseekModel || "deepseek-chat-v3";
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  public async getModels(type: ProviderType): Promise<string[]> {
    // Check if we're already fetching models for this provider
    if (this.modelCache.has(type)) {
      return this.modelCache.get(type)!;
    }

    // Check cache first
    const cached = await getCachedModels(type);
    if (cached) {
      return cached;
    }

    // Initialize provider if needed and fetch models
    const provider = this.getProvider(type);
    const modelPromise = provider.getModels()
      .then(async (models) => {
        await setCachedModels(type, models);
        return models;
      })
      .finally(() => {
        this.modelCache.delete(type);
      });

    this.modelCache.set(type, modelPromise);
    return modelPromise;
  }

  public async getAllModels(): Promise<Record<ProviderType, string[]>> {
    const result: Partial<Record<ProviderType, string[]>> = {};
    
    for (const type of this.providers.keys()) {
      try {
        result[type] = await this.getModels(type);
      } catch (error) {
        console.error(`Failed to fetch models for ${type}:`, error);
        result[type] = [];
      }
    }

    return result as Record<ProviderType, string[]>;
  }
}

export default LLMManager; 