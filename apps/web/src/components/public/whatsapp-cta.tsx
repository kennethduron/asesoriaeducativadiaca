import Image from "next/image";

import { siteConfig } from "@/lib/site-config";

export function WhatsappCta() {
  return (
    <a
      className="whatsapp-button floating-whatsapp"
      href={siteConfig.whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribir por WhatsApp"
    >
      <Image
        src="/assets/whatsapp.svg"
        alt=""
        aria-hidden="true"
        width={28}
        height={28}
      />
    </a>
  );
}
