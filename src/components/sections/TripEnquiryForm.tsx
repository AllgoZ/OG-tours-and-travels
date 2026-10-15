"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CircleAlert, MessageCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/buttonStyles";
import { buildEnquiryMessage, hasWhatsApp, whatsappHref } from "@/lib/enquiry";

interface Values {
  pickup: string;
  destination: string;
  date: string;
  time: string;
  passengers: string;
  requirements: string;
}
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { pickup: "", destination: "", date: "", time: "", passengers: "", requirements: "" };

function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${period}`;
}

function validate(v: Values, today: string): Errors {
  const e: Errors = {};
  if (v.pickup.trim().length < 2) e.pickup = "Enter your pickup location.";
  if (v.destination.trim().length < 2) e.destination = "Enter your destination.";
  if (!v.date) e.date = "Choose your travel date.";
  else if (v.date < today) e.date = "Travel date can't be in the past.";
  if (!v.time) e.time = "Choose a pickup time.";
  const n = Number(v.passengers);
  if (!v.passengers.trim()) e.passengers = "Enter the number of passengers.";
  else if (!Number.isInteger(n) || n < 1 || n > 99) e.passengers = "Enter a whole number from 1 to 99.";
  return e;
}

const labelClass = "mb-1.5 block text-sm font-semibold text-ink";
const fieldClass =
  "block w-full rounded-control border bg-white px-3.5 text-base text-ink placeholder:text-ink/40 " +
  "transition-colors focus-visible:border-ink focus-visible:outline-offset-2";

export function TripEnquiryForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const input = formRef.current?.querySelector<HTMLInputElement>('input[name="date"]');
    if (input) input.min = localToday();
  }, []);

  const update = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(values, localToday());
    setErrors(found);
    const firstInvalid = (Object.keys(found) as (keyof Values)[])[0];
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    const message = buildEnquiryMessage({
      pickup: values.pickup.trim(),
      destination: values.destination.trim(),
      date: formatDate(values.date),
      time: formatTime(values.time),
      passengers: values.passengers.trim(),
      requirements: values.requirements.trim(),
    });
    const url = whatsappHref(message);
    if (!url) return;
    setRedirecting(url);
    // Reliable on mobile and desktop: navigate the current tab to WhatsApp.
    window.location.href = url;
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  const Field = (
    key: keyof Values,
    label: string,
    kind: "input" | "textarea",
    props: React.InputHTMLAttributes<HTMLInputElement> & { optional?: boolean } = {},
  ) => {
    const id = `trip-${key}`;
    const error = errors[key];
    const { optional, ...rest } = props;
    return (
      <div className={kind === "textarea" ? "sm:col-span-2" : ""}>
        <label htmlFor={id} className={labelClass}>
          {label}
          {optional && <span className="font-normal text-ink/70"> (optional)</span>}
        </label>
        {kind === "input" ? (
          <input
            id={id}
            name={key}
            value={values[key]}
            onChange={update(key)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            aria-required={optional ? undefined : true}
            className={`${fieldClass} h-12 ${error ? "border-[#b42318]" : "border-ink/15"}`}
            {...rest}
          />
        ) : (
          <textarea
            id={id}
            name={key}
            value={values[key]}
            onChange={update(key)}
            rows={3}
            placeholder="Extra stops, luggage, child seats, timing notes…"
            className={`${fieldClass} resize-y py-2.5 border-ink/15`}
          />
        )}
        {error && (
          <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-[#b42318]">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-midnight p-5 shadow-[0_20px_50px_-30px_rgba(33,56,67,0.3)] sm:p-7">
      <form ref={formRef} onSubmit={onSubmit} noValidate aria-describedby={errorCount ? "trip-summary" : undefined}>
        {errorCount > 0 && (
          <p id="trip-summary" role="alert" className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#b42318]">
            <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
            Please fix {errorCount === 1 ? "1 field" : `${errorCount} fields`} below.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {Field("pickup", "Pickup location", "input", { type: "text", placeholder: "e.g. your city or area" })}
          {Field("destination", "Destination", "input", { type: "text", placeholder: "Where are you heading?" })}
          {Field("date", "Travel date", "input", { type: "date" })}
          {Field("time", "Pickup time", "input", { type: "time" })}
          {Field("passengers", "Passengers", "input", {
            type: "number",
            inputMode: "numeric",
            min: 1,
            max: 99,
            placeholder: "e.g. 8",
          })}
          <div className="hidden sm:block" aria-hidden="true" />
          {Field("requirements", "Additional requirements", "textarea", { optional: true })}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" className={buttonClass("dark", "lg", "w-full sm:w-auto")} disabled={!hasWhatsApp}>
            <MessageCircle aria-hidden="true" className="size-[1.15em]" />
            Send Enquiry
            <ArrowUpRight aria-hidden="true" className="arrow-slide size-[1.15em]" />
          </button>
          <p className="text-sm text-ink/72" aria-live="polite">
            {redirecting ? (
              <>
                Opening WhatsApp…{" "}
                <a href={redirecting} className="font-semibold text-ink underline underline-offset-2">
                  Tap here if it doesn&apos;t open
                </a>
                .
              </>
            ) : (
              "This opens WhatsApp with your details. Nothing is sent until you press Send there."
            )}
          </p>
        </div>
      </form>
    </div>
  );
}
