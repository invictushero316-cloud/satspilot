import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { NavIcon } from "@/lib/navigation";

type IconProps = {
  className?: string;
  title?: string;
};

function base(props: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5 shrink-0", props.className)}
      aria-hidden={props.title ? undefined : true}
      role={props.title ? "img" : undefined}
    >
      {props.title ? <title>{props.title}</title> : null}
      {props.children}
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
      </>
    ),
  });
}

export function IconPlus(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
  });
}

export function IconBolt(props: IconProps) {
  return base({
    ...props,
    children: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  });
}

export function IconBox(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M21 8.5 12 3 3 8.5v7L12 21l9-5.5v-7Z" />
        <path d="M12 12v9M3 8.5l9 3.5 9-3.5" />
      </>
    ),
  });
}

export function IconUsers(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3 3 0 0 1 0 5.74" />
      </>
    ),
  });
}

export function IconReceipt(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
  });
}

export function IconSpark(props: IconProps) {
  return base({
    ...props,
    children: (
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M17.8 6.2l-2.1 2.1M8.3 15.7l-2.1 2.1M12 8l1.5 3.5L17 13l-3.5 1.5L12 18l-1.5-3.5L7 13l3.5-1.5L12 8Z" />
    ),
  });
}

export function IconSettings(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </>
    ),
  });
}

export function IconMenu(props: IconProps) {
  return base({
    ...props,
    children: <path d="M4 7h16M4 12h16M4 17h16" />,
  });
}

export function IconChevronDown(props: IconProps) {
  return base({
    ...props,
    children: <path d="m6 9 6 6 6-6" />,
  });
}

export function IconX(props: IconProps) {
  return base({
    ...props,
    children: <path d="M18 6 6 18M6 6l12 12" />,
  });
}

export function IconAlert(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </>
    ),
  });
}

export function IconCheck(props: IconProps) {
  return base({
    ...props,
    children: <path d="m5 13 4 4L19 7" />,
  });
}

export function NavGlyph({
  name,
  className,
}: {
  name: NavIcon | "menu";
  className?: string;
}) {
  switch (name) {
    case "home":
      return <IconHome className={className} />;
    case "plus":
      return <IconPlus className={className} />;
    case "bolt":
      return <IconBolt className={className} />;
    case "box":
      return <IconBox className={className} />;
    case "users":
      return <IconUsers className={className} />;
    case "receipt":
      return <IconReceipt className={className} />;
    case "spark":
      return <IconSpark className={className} />;
    case "settings":
      return <IconSettings className={className} />;
    case "menu":
      return <IconMenu className={className} />;
    default:
      return null;
  }
}
