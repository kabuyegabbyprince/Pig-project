"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

type SubmitButtonProps = {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  pendingText = "Processing...",
  className = "",
  name,
  value,
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={isDisabled}
      className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>{pendingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
