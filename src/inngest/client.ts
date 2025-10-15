import { Inngest } from "inngest";

if (process.env.NODE_ENV !== "development" && !process.env.INNGEST_EVENT_KEY) {
  throw new Error("INNGEST_EVENT_KEY is not set in non-development environment");
}

// Create a client to send and receive events
export const inngest = new Inngest({
  id: process.env.INNGEST_APP_ID || "vibe-ai-dev",
  eventKey: process.env.INNGEST_EVENT_KEY,
});