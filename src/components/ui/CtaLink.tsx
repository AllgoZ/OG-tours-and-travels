import { MessageCircle, Phone } from "lucide-react";
import { buildEnquiryMessage, buildTopicMessage, telHref, whatsappHref } from "@/lib/enquiry";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./buttonStyles";

interface CtaLinkProps {
  kind: "whatsapp" | "call";
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** WhatsApp only: what the enquiry is about, e.g. "the Force Urbania". */
  topic?: string;
  /** WhatsApp only: a fully custom message (overrides topic). */
  message?: string;
  onClick?: () => void;
  hideIcon?: boolean;
}

/**
 * Reusable enquiry link used by every WhatsApp / phone call-to-action on the site.
 * If the number is not configured it never renders a link: WhatsApp renders a disabled
 * button, Call renders nothing. No dead or invalid hrefs, ever.
 */
export function CtaLink({
  kind,
  children,
  variant = "lime",
  size = "lg",
  className = "",
  topic,
  message,
  onClick,
  hideIcon,
}: CtaLinkProps) {
  const Icon = kind === "whatsapp" ? MessageCircle : Phone;
  const icon = hideIcon ? null : <Icon aria-hidden="true" className="size-[1.15em] shrink-0" />;
  const classes = buttonClass(variant, size, className);

  const href =
    kind === "whatsapp"
      ? whatsappHref(message ?? (topic ? buildTopicMessage(topic) : buildEnquiryMessage({})))
      : telHref();

  if (!href && kind === "call") return null;

  if (!href) {
    return (
      <button type="button" disabled className={classes} title="Contact details are not configured yet">
        {icon}
        {children}
      </button>
    );
  }

  return (
    <a
      href={href}
      className={classes}
      onClick={onClick}
      {...(kind === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {icon}
      {children}
      {kind === "whatsapp" && <span className="sr-only"> (opens WhatsApp in a new tab)</span>}
    </a>
  );
}
