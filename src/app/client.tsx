"use client";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import React from "react";

export const Client = () => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.hello.queryOptions({ text: "from taylor" }));
  return <div>{JSON.stringify(data)}</div>;
};
