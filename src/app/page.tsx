"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";

/**
 * Renders the home page and prepares client-side data hydration for tRPC queries.
 *
 * Prefetches the `trpc.hello` query, dehydrates the query client into a HydrationBoundary,
 * and renders the `Client` component inside a React Suspense boundary with a loading fallback.
 *
 * @returns A React element that wraps the app in a HydrationBoundary and Suspense, with prefetched query state available to the client.
 */
export default function Home() {
  const [value, setValue] = useState<string>("");
  const trpc = useTRPC();
  const { data: messages } = useQuery(trpc.messages.getMany.queryOptions());
  const createMessage = useMutation(
    trpc.messages.create.mutationOptions({
      onSuccess: () => {
        toast.success("Background job started!");
      },
      onError: (error) => {
        toast.error(`Failed to start job: ${error.message}`);
      },
    })
  );
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Input value={value} onChange={(e) => setValue(e.target.value)} />
      <Button disabled={createMessage.isPending} onClick={() => createMessage.mutate({ value })}>
        Invoke Background Job
      </Button>
      {JSON.stringify(messages, null, 2)}
    </div>
  );
}
