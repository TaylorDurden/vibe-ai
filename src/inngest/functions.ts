import OpenAI from "openai";

import { inngest } from "./client";

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

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    const system_prompt = "You are a summarizer. You summarize in 2 words.";
    const openai = getAIClient();

    const result = await step.run(
      "summarizer-agent",
      async (input) => {
        const model =
          process.env.DEEPSEEK_API_KEY ? "deepseek-reasoner" : "gpt-4o";
        const userContent =
          typeof input === "string" ? input : JSON.stringify(input);
        const completion = await openai.chat.completions.create({
          messages: [
            { role: "system", content: system_prompt },
            { role: "user", content: userContent },
          ],
          model,
        });
        const content = completion.choices?.[0]?.message?.content ?? "";
        return content;
      },
      event.data.value
    );
    return { output: result };
  }
);