import { getPreferenceValues } from "@raycast/api";
import { LLMProvider, getCachedModels, setCachedModels } from "./types";
import GeminiProvider from "./providers/gemini";
import OpenAIProvider from "./providers/openai";
import DeepSeekProvider from "./providers/deepseek";

export type ProviderType = "gemini" | "openai" | "deepseek";

class LLMManager {
  private static instance: LLMManager;
  private providers: Map<ProviderType, LLMProvider>;
  private modelCache: Map<ProviderType, Promise<string[]>>;

  private constructor() {
    this.providers = new Map();
    this.modelCache = new Map();
    this.initializeProviders();
  }

  public static getInstance(): LLMManager {
    if (!LLMManager.instance) {
      LLMManager.instance = new LLMManager();
    }
    return LLMManager.instance;
  }

  private initializeProviders() {
    const prefs = getPreferenceValues();
    
    // Initialize providers with their respective API keys
    this.providers.set("gemini", new GeminiProvider(prefs.geminiApiKey));
    this.providers.set("openai", new OpenAIProvider(prefs.openaiApiKey));
    this.providers.set("deepseek", new DeepSeekProvider(prefs.deepseekApiKey));
  }

  public getProvider(type: ProviderType): LLMProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Provider ${type} not found`);
    }
    return provider;
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

    // Fetch and cache models
    const modelPromise = this.getProvider(type).getModels()
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