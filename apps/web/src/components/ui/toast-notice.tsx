"use client";

import { useEffect } from "react";

import { useToast } from "@/components/ui/toast";

export function ToastNotice({
  tone,
  message,
}: {
  tone: "success" | "error" | "info";
  message?: string | null;
}) {
  const { notify } = useToast();
  useEffect(() => {
    if (message) notify({ tone, message });
  }, [message, notify, tone]);
  return null;
}
