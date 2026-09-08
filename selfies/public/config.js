/* Browser-side settings for selfies.lol.
 *
 * The publishable (anon) key is meant to be public: what it can reach is
 * decided by row level security in the project, not by hiding the key. The
 * service-role key is never put here -- it lives in the Worker as a secret.
 */
window.SELFIES = {
  supabaseUrl: "https://uwpsdbymmwwoeltlvtic.supabase.co",
  supabaseKey: "sb_publishable_ydvDd1G0I_yqDUULMlitzw_G3XDxikW",
};
