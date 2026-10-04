import '../.astro/types.d.ts';

declare global {
  interface ImportMetaEnv {
    readonly PUBLIC_SUPABASE_URL: string;
    readonly PUBLIC_SUPABASE_ANON_KEY: string;
    readonly PUBLIC_APP_URL: string;
  }
}
