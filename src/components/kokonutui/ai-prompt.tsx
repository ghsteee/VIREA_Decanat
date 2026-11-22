"use client";

/**
 * @author: @kokonutui
 * @description: AI Prompt Input
 * @version: 2.0.0
 * @date: 2026-10-15
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { ArrowUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

type PromptProps = {
  action: (data: FormData) => void;
  pending: boolean;
  placeholder?: string;
};

export default function AI_Prompt({
  action,
  pending,
  placeholder = "Спроси про учёбу или кабинет",
}: PromptProps) {
  const id = useId();
  const [hasText, setHasText] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 180,
  });

  useEffect(() => {
    if (pending) return;
    setHasText(Boolean(textareaRef.current?.value.trim()));
    adjustHeight();
  }, [pending, adjustHeight, textareaRef]);

  return (
    <div>
      <div className="rounded-[22px] bg-bg p-1">
        <form
          action={action}
          aria-busy={pending}
          className="relative flex flex-col rounded-[18px] bg-surface shadow-sm ring-1 ring-border transition-shadow focus-within:ring-primary motion-reduce:transition-none"
        >
          <label htmlFor={id} className="sr-only">
            Твой вопрос
          </label>
          <Textarea
            id={id}
            ref={textareaRef}
            name="question"
            required
            maxLength={400}
            readOnly={pending}
            aria-describedby={id + "-privacy"}
            placeholder={placeholder}
            className="block field-sizing-fixed min-h-[72px] resize-none overflow-y-auto rounded-none border-0 bg-transparent px-4 pb-1 pt-3.5 text-base leading-relaxed text-text shadow-none placeholder:text-text-muted focus-visible:ring-0 md:text-base dark:bg-transparent"
            onChange={(event) => {
              setHasText(Boolean(event.currentTarget.value.trim()));
              adjustHeight();
            }}
            onKeyDown={(event) => {
              if (
                event.key !== "Enter" ||
                event.shiftKey ||
                event.nativeEvent.isComposing
              )
                return;
              event.preventDefault();
              if (!pending && hasText)
                event.currentTarget.form?.requestSubmit();
            }}
          />
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
            <Link
              href="/assistant/rules"
              className="inline-flex min-h-11 items-center rounded-full px-2.5 text-sm font-semibold text-primary"
            >
              Открыть демо-положение
            </Link>
            <button
              type="submit"
              aria-label="Спросить"
              disabled={pending || !hasText}
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-full transition-colors motion-reduce:transition-none",
                hasText && !pending
                  ? "bg-action text-on-action hover:opacity-85"
                  : "bg-bg text-text-muted",
              )}
            >
              <ArrowUp size={21} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </form>
      </div>
      <p
        id={id + "-privacy"}
        className="px-1 pt-2 text-xs leading-relaxed text-text-muted"
      >
        Вопрос передаётся GigaChat. Используй учебные примеры без личных данных.
      </p>
    </div>
  );
}
