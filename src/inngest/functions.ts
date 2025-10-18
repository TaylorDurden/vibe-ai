import { Sandbox } from "@e2b/code-interpreter";

import { inngest } from "./client";
import { getAIClient, getSandbox } from "./utils";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get sandbox id", async () => {
      const sandbox = await Sandbox.create("vibeai-nextjs-test-01");
      return sandbox.sandboxId;
    });
    const system_prompt =
      "You are an expert next.js developer. You write readable, maintainable, testable and runnable code. You write simple Next.js & React code snippets.";
    const user_prompt = `Write following code snippet: ${event.data.value}`;
    const openai = getAIClient();

    const result = await step.run("summarizer-agent", async () => {
      const model = process.env.DEEPSEEK_API_KEY ? "deepseek-reasoner" : "gpt-4o";
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: user_prompt },
        ],
        model,
      });
      const content = completion.choices?.[0]?.message?.content ?? "";
      return content;
    });

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });
    return { output: result, sandboxUrl };
  }
);
