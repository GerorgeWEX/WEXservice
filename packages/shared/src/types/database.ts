// PLACEHOLDER (M0): hand-written from supabase/migrations/20260101000100_enums.sql.
// Overwritten by `pnpm db:types` once Supabase runs locally (needs Docker).
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: 'admin' | 'subadmin' | 'technician' | 'client';
      company_status: 'invited' | 'pending_approval' | 'active' | 'rejected' | 'no_account';
      report_status: 'draft' | 'pending_signature' | 'signature_expired' | 'finalized' | 'cancelled';
      version_status: 'official' | 'pending_client_approval' | 'rejected' | 'superseded';
      end_state: 'functional' | 'stopped_pending_parts';
      signature_mode: 'onsite' | 'remote';
      token_purpose: 'remote_signature' | 'edit_approval';
      token_status: 'active' | 'used' | 'expired' | 'revoked';
      job_status: 'pending' | 'ok' | 'failed';
    };
  };
};