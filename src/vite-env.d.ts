/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SCRIPT_URL?: string;
  readonly VITE_LEDGER_GAS_URL?: string;
  readonly VITE_APPS_SCRIPT_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_ENABLE_LOCAL_AUTH_FALLBACK?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
