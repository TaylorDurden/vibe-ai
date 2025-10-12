import { Suspense } from "react";

import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { Client } from "./client";

/**
 * Renders the home page and prepares client-side data hydration for tRPC queries.
 *
 * Prefetches the `trpc.hello` query, dehydrates the query client into a HydrationBoundary,
 * and renders the `Client` component inside a React Suspense boundary with a loading fallback.
 *
 * @returns A React element that wraps the app in a HydrationBoundary and Suspense, with prefetched query state available to the client.
 */
export default function Home() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.hello.queryOptions({ text: "from tRPC" }));
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<div>Loading...</div>}>
        <Client />
      </Suspense>
    </HydrationBoundary>
  );
}