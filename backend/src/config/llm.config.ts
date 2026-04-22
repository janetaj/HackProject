/**
 * LLM Configuration
 * OpenAI and Groq API settings and model configurations
 */

export interface LLMProviderConfig {
  apiKey: string;
  baseUrl?: string;
  requestTimeoutMs: number;
  maxRetries: number;
  backoffDelayMs: {
    base: number;
    max: number;
  };
}

export interface OpenAIConfig extends LLMProviderConfig {
  model: string;
  generationModel: string;
  chatbotModel: string;
  maxTokens: number;
  temperature: number;
  costPer1kInputTokens: number; // in EUR
  costPer1kOutputTokens: number; // in EUR
}

export interface GroqConfig extends LLMProviderConfig {
  parsingModel: string;
  fallbackModel: string;
  maxTokens: number;
  temperature: number;
  costPer1kInputTokens: number; // in EUR
  costPer1kOutputTokens: number; // in EUR
}

export interface LLMConfig {
  primaryProvider: 'openai' | 'groq';
  fallbackProvider: 'groq' | 'openai';
  openai: OpenAIConfig;
  groq: GroqConfig;
  caching: {
    enabledForGeneration: boolean;
    enabledForParsing: boolean;
    ttlHours: number;
  };
}

export const getLLMConfig = (): LLMConfig => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
  }

  return {
    primaryProvider: (process.env.LLM_PRIMARY_PROVIDER as any) || 'openai',
    fallbackProvider: (process.env.LLM_FALLBACK_PROVIDER as any) || 'groq',
    openai: {
      apiKey: openaiApiKey,
      baseUrl: process.env.OPENAI_BASE_URL,
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      generationModel: process.env.OPENAI_GENERATION_MODEL || 'gpt-4o',
      chatbotModel: process.env.OPENAI_CHATBOT_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
      requestTimeoutMs: parseInt(process.env.OPENAI_TIMEOUT_MS || '60000', 10),
      maxRetries: 2,
      backoffDelayMs: { base: 1000, max: 10000 },
      costPer1kInputTokens: 0.003, // Approx. EUR equivalent
      costPer1kOutputTokens: 0.015, // Approx. EUR equivalent
    },
    groq: {
      apiKey: groqApiKey,
      baseUrl: process.env.GROQ_BASE_URL,
      parsingModel: process.env.GROQ_PARSING_MODEL || 'llama-3.1-70b',
      fallbackModel: process.env.GROQ_FALLBACK_MODEL || 'mixtral-8x7b',
      maxTokens: parseInt(process.env.GROQ_MAX_TOKENS || '1024', 10),
      temperature: parseFloat(process.env.GROQ_TEMPERATURE || '0.1'),
      requestTimeoutMs: parseInt(process.env.GROQ_TIMEOUT_MS || '15000', 10),
      maxRetries: 2,
      backoffDelayMs: { base: 500, max: 5000 },
      costPer1kInputTokens: 0.0002, // Approx. EUR equivalent (free tier)
      costPer1kOutputTokens: 0.0003, // Approx. EUR equivalent (free tier)
    },
    caching: {
      enabledForGeneration: process.env.LLM_CACHE_GENERATION !== 'false',
      enabledForParsing: process.env.LLM_CACHE_PARSING !== 'false',
      ttlHours: parseInt(process.env.LLM_CACHE_TTL_HOURS || '24', 10),
    },
  };
};

export const validateLLMConfig = (config: LLMConfig): void => {
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  if (!config.groq.apiKey) {
    throw new Error('GROQ_API_KEY is required');
  }

  if (!config.primaryProvider) {
    throw new Error('LLM_PRIMARY_PROVIDER must be set to openai or groq');
  }

  if (!config.fallbackProvider) {
    throw new Error('LLM_FALLBACK_PROVIDER must be set to openai or groq');
  }

  if (config.primaryProvider === config.fallbackProvider) {
    throw new Error('Primary and fallback providers must be different');
  }
};
