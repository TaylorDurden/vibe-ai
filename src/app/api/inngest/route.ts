import { serve } from "inngest/next";
import { codeAgent } from "@/inngest/functions";
import { inngest } from "@/inngest/client";

if (process.env.NODE_ENV === "production" && !process.env.INNGEST_SIGNING_KEY) {
  throw new Error("INNGEST_SIGNING_KEY is not set in production");
}

// Create an API that serves the Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    /* your functions will be passed here later! */
    codeAgent,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
