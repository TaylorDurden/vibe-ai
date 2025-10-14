import { serve } from "inngest/next";
import { helloWorld } from "@/inngest/functions";
import { inngest } from "@/inngest/client";

// Create an API that serves the Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    /* your functions will be passed here later! */
    helloWorld,
  ],
});
