import OpenAI from "openai";

import { inngest } from "./client";

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
        const completion = await openai.chat.completions.create({
          messages: [
            { role: "system", content: system_prompt },
            { role: "user", content: input },
          ],
          model: "deepseek-reasoner",
        });
        const content = completion.choices[0].message.content;

        return content;
      },
      event.data.value
    );
    return { output: result };
  }
);
