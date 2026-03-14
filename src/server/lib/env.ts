type AppEnv = {
  apiKey: string | null;
  modelCandidates: string[];
};

function parseModelCandidates(value: string | undefined) {
  if (!value) {
    return ["gemini-3.1-flash-lite-preview", "gemini-3-flash-preview"];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getAppEnv(): AppEnv {
  return {
    apiKey: process.env.GEMINI_API_KEY ?? null,
    modelCandidates: parseModelCandidates(process.env.GEMINI_MODEL_CANDIDATES ?? process.env.GEMINI_MODEL),
  };
}
