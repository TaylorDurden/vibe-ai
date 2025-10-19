import OpenAI from "openai";

import Sandbox from "@e2b/code-interpreter";

export async function getSandbox(sandboxId: string) {
  const sandbox = await Sandbox.connect(sandboxId);
  return sandbox;
}

/**
 * Create an OpenAI client configured from environment variables.
 *
 * Chooses `DEEPSEEK_API_KEY` if present; otherwise uses `OPENAI_API_KEY`. When `DEEPSEEK_API_KEY` is used, the client is configured with `baseURL` from `DEEPSEEK_BASE_URL`. When `OPENAI_API_KEY` is used, the client is configured with `model: "gpt-4o"`.
 *
 * @returns An `OpenAI` client configured with the selected API key and corresponding options (`baseURL` for DeepSeek, otherwise `model: "gpt-4o"`).
 */
export function getAIClient() {
  const isDeepSeek = !!process.env.DEEPSEEK_API_KEY;
  return new OpenAI({
    apiKey: isDeepSeek ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY,
    ...(isDeepSeek ? { baseURL: process.env.DEEPSEEK_BASE_URL } : { model: "gpt-4o" }),
  });
}
