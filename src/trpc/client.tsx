"use client";
// ^-- to make sure we can mount the Provider from a server component
import superjson from "superjson";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState } from "react";
import { makeQueryClient } from "./query-client";
import type { AppRouter } from "./routers/_app";
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();
let browserQueryClient: QueryClient;
/**
 * Provide a React Query client instance appropriate for the current environment.
 *
 * On the server this returns a new QueryClient each call; in the browser it
 * returns a single cached QueryClient instance to preserve client state across renders.
 *
 * @returns A `QueryClient` instance — a fresh instance on the server, a cached singleton in the browser.
 */
function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one
  // This is very important, so we don't re-make a new client if React
  // suspends during the initial render. This may not be needed if we
  // have a suspense boundary BELOW the creation of the query client
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
/**
 * Compute the TRPC API endpoint URL appropriate for the current runtime.
 *
 * @returns The full TRPC API URL. In the browser this returns "/api/trpc"; on the server it prefixes "/api/trpc" with the value of `NEXT_PUBLIC_APP_URL`.
 */
function getUrl() {
  const base = (() => {
    if (typeof window !== "undefined") return "";
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  })();
  return `${base}/api/trpc`;
}
/**
 * Provides React Query and tRPC contexts to its descendant components.
 *
 * Wraps `props.children` with a `QueryClientProvider` and a `TRPCProvider`, supplying a shared React Query client and a stable tRPC client configured for the application's AppRouter.
 *
 * @param props - Component props.
 * @param props.children - React nodes to render inside the providers.
 * @returns The provider element tree that supplies tRPC and React Query clients to descendants.
 */
export function TRPCReactProvider(
  props: Readonly<{
    children: React.ReactNode;
  }>
) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: getUrl(),
        }),
      ],
    })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}