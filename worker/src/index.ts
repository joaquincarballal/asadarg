export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

/**
 * Cron de keep-alive: hace una consulta real contra Postgres (vía PostgREST) para que
 * cuente como "actividad de base de datos" y Supabase no pause el proyecto free tier
 * por inactividad (ver research.md §2 — el pause trigger es por DB activity, no HTTP).
 */
export default {
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const url = `${env.SUPABASE_URL}/rest/v1/perfil?select=id&limit=1`;
    const response = await fetch(url, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(`Keep-alive ping falló: ${response.status} ${response.statusText}`);
    }
  },
};
