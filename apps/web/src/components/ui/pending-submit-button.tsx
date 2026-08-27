"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

export function PendingSubmitButton({
  idleLabel,
  pendingLabel,
  className,
  name,
  value,
  formAction,
}: {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  name?: string;
  value?: string;
  formAction?: React.ComponentProps<"button">["formAction"];
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 font-semibold transition disabled:cursor-wait disabled:opacity-65",
        className,
      )}
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
