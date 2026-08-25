"use client";

import { useEffect } from "react";

export function ScrollReveal() {
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (!nodes.length) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    nodes.forEach((node, index) => {
      node.style.setProperty(
        "--reveal-delay",
        `${Math.min(index % 6, 5) * 70}ms`,
      );
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
