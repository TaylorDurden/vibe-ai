import { inngest } from "./client";
import { Agent, createAgent, openai, grok } from "@inngest/agent-kit";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    const summarizer = createAgent({
      name: "summarizer",
      system: "You are an expert summarizer.  You summarize in 2 words.",
      model: openai({ model: "gpt-4o", baseUrl: "https://api.openai-proxy.com/v1" }),
    });
    const { output } = await summarizer.run(`Summarize the following text: ${event.data.value}`);
    return { output };
  }
);
