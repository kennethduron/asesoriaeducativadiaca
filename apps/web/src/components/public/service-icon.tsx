import type { ServiceIconName } from "@/features/public-site/data/services";

export function ServiceIcon({ name }: { name: ServiceIconName }) {
  const commonProps = { viewBox: "0 0 24 24", "aria-hidden": true } as const;

  if (name === "graduation") {
    return (
      <svg {...commonProps}>
        <path d="M3 8l9-4 9 4-9 4-9-4Z" />
        <path d="M7 10v5c2.8 2 7.2 2 10 0v-5" />
        <path d="M21 8v6" />
      </svg>
    );
  }
  if (name === "scale") {
    return (
      <svg {...commonProps}>
        <path d="M12 4v16M5 20h14M6 7h12" />
        <path d="M7 7l-4 7h8L7 7Zm10 0-4 7h8l-4-7Z" />
      </svg>
    );
  }
  if (name === "pen") {
    return (
      <svg {...commonProps}>
        <path d="M4 20h4l11-11-4-4L4 16v4Z" />
        <path d="M13 7l4 4" />
      </svg>
    );
  }
  if (name === "file") {
    return (
      <svg {...commonProps}>
        <path d="M6 3h9l3 3v15H6V3Z" />
        <path d="M14 3v4h4M9 12h6M9 16h6" />
      </svg>
    );
  }
  if (name === "device") {
    return (
      <svg {...commonProps}>
        <path d="M4 5h16v11H4V5Z" />
        <path d="M8 21h8M12 16v5" />
      </svg>
    );
  }
  return (
    <svg {...commonProps}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </svg>
  );
}
