"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const trpc = useTRPC();
  const { data: messages } = useQuery(trpc.messages.getMany.queryOptions());
  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (project) => {
        toast.success("Project created and background job started!");
        router.push(`/projects/${project.id}`);
      },
      onError: (error) => {
        toast.error(`Failed to create project: ${error.message}`);
      },
    })
  );
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
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="max-w-7xl mx-auto flex items-center flex-col gap-y-4 justify-center">
        <Input value={value} onChange={(e) => setValue(e.target.value)} />
        <Button disabled={createProject.isPending} onClick={() => createProject.mutate({ value })}>
          Submit
        </Button>
      </div>
    </div>
  );
}
