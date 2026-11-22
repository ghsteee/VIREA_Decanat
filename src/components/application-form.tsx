"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Monitor } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  submitApplication,
  type SubmitState,
} from "@/app/(cabinet)/requests/actions";
import type { Field } from "@/server/applications";
import type { PickupSlotOption } from "@/server/pickup";

const titles = {
  fields: "Данные",
  delivery: "Получение",
  review: "Проверка",
} as const;
const methodNames = {
  pickup: "Забрать в дирекции",
  electronic: "Электронно — в кабинете",
} as const;
type Method = keyof typeof methodNames;
type Step = keyof typeof titles;

export function ApplicationForm(props: {
  typeId: string;
  fields: Field[];
  delivery: Method[];
  slots: PickupSlotOption[];
  student: string;
  group: string;
  previousId?: string;
  previousDelivery?: Method;
  defaults?: Record<string, string | number>;
}) {
  const steps: Step[] = [];
  if (props.fields.length) steps.push("fields");
  if (props.delivery.includes("pickup")) steps.push("delivery");
  steps.push("review");
  const [step, setStep] = useState<Step>(steps[0]);
  const index = steps.indexOf(step);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      props.fields.map((f) => [
        f.key,
        String(props.defaults?.[f.key] ?? (f.type === "number" ? 1 : "")),
      ]),
    ),
  );
  const [delivery, setDelivery] = useState<Method>(
    props.previousDelivery && props.delivery.includes(props.previousDelivery)
      ? props.previousDelivery
      : props.delivery.includes("electronic")
        ? "electronic"
        : props.delivery[0],
  );
  const [slotId, setSlot] = useState("");
  const router = useRouter();
  const [state, action, pending] = useActionState<SubmitState, FormData>(
    async (prev, data) => {
      const result = await submitApplication(prev, data);
      if (result.slotUnavailable) {
        setSlot("");
        setStep("delivery");
        router.refresh();
      }
      return result;
    },
    {},
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) heading.current?.focus();
    previousStep.current = step;
  }, [step]);
  const selectedSlot = props.slots.find((slot) => slot.id === slotId);
  const review = [
    ["Студент", props.student],
    ["Группа", props.group],
    ...props.fields
      .filter((f) => values[f.key]?.trim())
      .map((f) => [f.label, values[f.key].trim()]),
    ["Как получить", methodNames[delivery]],
    ...(delivery === "pickup"
      ? [["Время выдачи", selectedSlot?.label ?? "Согласовать с дирекцией"]]
      : []),
  ];
  const input =
    "h-12 w-full rounded-xl border border-border-strong bg-surface px-3 text-base font-normal text-text";
  return (
    <div className="request-wizard">
      <ol aria-label="Шаги оформления" className="wizard-progress">
        {steps.map((key, i) => (
          <li
            key={key}
            data-complete={i < index}
            aria-current={step === key ? "step" : undefined}
          >
            <button
              type="button"
              disabled={pending || i >= index}
              onClick={() => setStep(key)}
              aria-label={`Шаг ${i + 1}. ${titles[key]}`}
            >
              <span aria-hidden>{i < index ? <Check size={16} /> : i + 1}</span>
              {titles[key]}
            </button>
          </li>
        ))}
      </ol>
      <form
        className="wizard-card"
        aria-busy={pending}
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          if (step !== "review") {
            setStep(steps[index + 1]);
            return;
          }
          const data = new FormData();
          data.set("typeId", props.typeId);
          if (props.previousId) data.set("previousId", props.previousId);
          props.fields.forEach((f) => data.set("f_" + f.key, values[f.key]));
          data.set("delivery", delivery);
          if (delivery === "pickup" && selectedSlot)
            data.set("slotId", selectedSlot.id);
          startTransition(() => action(data));
        }}
      >
        <div key={step} className="wizard-step">
          <h2 tabIndex={-1} ref={heading}>
            {step === "fields"
              ? "Данные заявки"
              : step === "delivery"
                ? "Как получить"
                : "Проверь заявку"}
          </h2>
          {step === "fields" &&
            props.fields.map((f) => (
              <label key={f.key} className="grid gap-1.5 text-sm font-semibold">
                {f.label}
                {!f.required && " (необязательно)"}
                <input
                  className={input}
                  name={`f_${f.key}`}
                  type={f.type}
                  min={f.type === "number" ? 1 : undefined}
                  max={f.type === "number" ? (f.max ?? 10) : undefined}
                  pattern={
                    f.type === "text" && f.required ? ".*\\S.*" : undefined
                  }
                  required={f.required}
                  maxLength={300}
                  value={values[f.key]}
                  onChange={(e) =>
                    setValues({ ...values, [f.key]: e.target.value })
                  }
                />
              </label>
            ))}
          {step === "delivery" && (
            <>
              <fieldset aria-label="Способ получения" className="grid gap-2">
                {props.delivery.map((d) => {
                  const Icon = d === "pickup" ? Building2 : Monitor;
                  return (
                    <label key={d} className="wizard-method">
                      <Icon size={20} aria-hidden />
                      <span>{methodNames[d]}</span>
                      <input
                        type="radio"
                        className="size-5 accent-primary"
                        name="delivery"
                        value={d}
                        checked={delivery === d}
                        onChange={() => setDelivery(d)}
                      />
                    </label>
                  );
                })}
              </fieldset>
              {delivery === "pickup" && (
                <label className="grid gap-1.5 text-sm font-semibold">
                  Время выдачи
                  <select
                    className={input}
                    name="slotId"
                    value={selectedSlot?.id ?? ""}
                    onChange={(e) => setSlot(e.target.value)}
                  >
                    <option value="">Согласовать время с дирекцией</option>
                    {props.slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm font-normal text-text-muted">
                    {props.slots.length
                      ? "Показаны свободные окна без пар."
                      : "Свободных окон без пар пока нет."}
                  </span>
                </label>
              )}
            </>
          )}
          {step === "review" && (
            <dl className="wizard-review">
              {review.map(([key, val], i) => (
                <div key={i}>
                  <dt>{key}</dt>
                  <dd>{val}</dd>
                </div>
              ))}
            </dl>
          )}
          {state.error &&
            (state.slotUnavailable
              ? step === "delivery"
              : step === "review") && (
              <p role="alert" className="text-sm font-medium text-danger-text">
                {state.error}
              </p>
            )}
        </div>
        <div className="wizard-actions">
          {index > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => setStep(steps[index - 1])}
            >
              <ArrowLeft size={16} aria-hidden />
              Назад
            </button>
          )}
          <button
            key={step}
            type="submit"
            disabled={pending}
            className="wizard-next"
          >
            {pending
              ? "Отправляем…"
              : step === "review"
                ? "Отправить заявку"
                : steps[index + 1] === "review"
                  ? "Проверить заявку"
                  : "Далее"}
            {step === "review" ? (
              <Check size={17} aria-hidden />
            ) : (
              <ArrowRight size={17} aria-hidden />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
