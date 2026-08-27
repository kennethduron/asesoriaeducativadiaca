"use client";

import { useEffect, useId, useRef } from "react";

import { useToast } from "@/components/ui/toast";

export function ActionFeedback({
  pending,
  pendingMessage,
  status,
  message,
}: {
  pending: boolean;
  pendingMessage: string;
  status?: "success" | "error" | "info";
  message?: string;
}) {
  const { dismiss, notify } = useToast();
  const actionId = useId();
  const id = useRef(`action-${actionId}`);
  const previousMessage = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (pending) {
      notify({
        id: id.current,
        tone: "loading",
        message: pendingMessage,
        duration: null,
      });
      return;
    }
    dismiss(id.current);
    if (message && message !== previousMessage.current) {
      notify({ tone: status ?? "info", message });
      previousMessage.current = message;
    }
  }, [dismiss, message, notify, pending, pendingMessage, status]);

  useEffect(() => () => dismiss(id.current), [dismiss]);
  return null;
}
