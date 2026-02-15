"use client";

import { createContext, useContext, type ReactNode } from "react";

export type SendFollowUp = (text: string) => void;

const FollowUpContext = createContext<SendFollowUp | null>(null);

export function FollowUpProvider({
  sendFollowUp,
  children,
}: {
  sendFollowUp: SendFollowUp | null;
  children: ReactNode;
}) {
  return (
    <FollowUpContext.Provider value={sendFollowUp}>
      {children}
    </FollowUpContext.Provider>
  );
}

export function useSendFollowUp(): SendFollowUp | null {
  return useContext(FollowUpContext);
}
