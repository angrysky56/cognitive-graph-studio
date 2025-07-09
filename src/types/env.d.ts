/**
 * Environment types for Vite application
 * 
 * Defines TypeScript types for environment variables and import.meta
 * to resolve compilation errors in the cognitive graph studio.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_LMSTUDIO_BASE_URL: string
  readonly VITE_LMSTUDIO_MODEL: string
  readonly VITE_OLLAMA_BASE_URL: string
  readonly VITE_OLLAMA_MODEL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly NODE_ENV: 'development' | 'production' | 'test'
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    fs?: {
      readFile: (path: string, options?: { encoding?: string }) => Promise<Uint8Array | string>
    }
  }
}

export {}
