function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  geminiApiKey: process.env.GEMINI_API_KEY || undefined,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
};
