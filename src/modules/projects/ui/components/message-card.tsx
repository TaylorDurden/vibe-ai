import { Fragment, MessageRole, MessageType } from "@/generated/prisma";
import React from "react";

interface Props {
  content: string;
  role: MessageRole;
  fragment: Fragment | null;
  createdAt: Date;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
  type: MessageType;
}

export const MessageCard = ({
  content,
  role,
  fragment,
  createdAt,
  isActiveFragment,
  onFragmentClick,
  type,
}: Props) => {
  if (role === "ASSISTANT") {
    return <p>ASSISTANT</p>;
  }
  return <div>USER</div>;
};
