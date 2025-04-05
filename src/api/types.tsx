import { LocalStorage } from "@raycast/api";

export interface AskOptions {
  model?: string;
  stream?: (text: string) => void;
  data?: Buffer[];
}

export interface LLMProvider {
  name: string;
  getModels(): Promise<string[]>;
  ask(query: string, options: AskOptions): Promise<string>;
  stream(query: string, callback: (text: string) => void, options: AskOptions): Promise<void>;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
}

export interface LLMError extends Error {
  provider: string;
  code?: string;
  isRateLimit?: boolean;
}

// Cache interface for storing model lists
export interface ModelCache {
  timestamp: number;
  models: string[];
}

export const MODEL_CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function getCachedModels(provider: string): Promise<string[] | null> {
  const cache = await LocalStorage.getItem<string>(`${provider}_models`);
  if (!cache) return null;
  
  const parsed = JSON.parse(cache) as ModelCache;
  if (Date.now() - parsed.timestamp > MODEL_CACHE_TTL) return null;
  
  return parsed.models;
}

export async function setCachedModels(provider: string, models: string[]): Promise<void> {
  const cache: ModelCache = {
    timestamp: Date.now(),
    models,
  };
  await LocalStorage.setItem(`${provider}_models`, JSON.stringify(cache));
} 