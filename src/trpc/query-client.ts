import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";
import superjson from "superjson";
/**
 * Create a preconfigured React Query client for the application.
 *
 * The client sets sensible defaults for server-state handling:
 * - query results are considered fresh for 30,000 milliseconds.
 * - de/serialization of dehydrated cache uses `superjson`.
 * - queries in `"pending"` status are treated as dehydrable in addition to the default policy.
 *
 * @returns A `QueryClient` instance with the described default options applied.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}