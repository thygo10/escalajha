// TEMPLATE DE CONFIGURAÇÃO — EscalaJHA v2.0
// Copie este arquivo para environment.ts e preencha com suas credenciais reais.
// NUNCA commite o environment.ts com dados reais!
//
// Passo a passo:
// 1. cp src/environments/environment.example.ts src/environments/environment.ts
// 2. Preencha supabaseUrl e supabaseAnonKey com os dados do seu projeto Supabase
// 3. Defina demoMode: false para usar o banco real
export const environment = {
  production: false,
  supabaseUrl: 'https://SEU_PROJETO.supabase.co',
  supabaseAnonKey: 'SUA_CHAVE_ANON_AQUI',
  demoMode: true,
  demoEmail: 'demo@joaohenrique.com',
  demoPassword: 'DEMO_2026_JH'
};
