"use client";

import { useEffect, useState } from "react";

const heroImages = [
  { desktop: "/assets/cristian.jpg", mobile: "/assets/cristian_vertical.jpg" },
  {
    desktop: "/assets/cristian_2.jpg",
    mobile: "/assets/cristian_vertical2.jpg",
  },
  {
    desktop: "/assets/cristian3.jpg",
    mobile: "/assets/cristian_vertical3.jpg",
  },
] as const;

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroImages.length);
    }, 5600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hero-carousel" aria-hidden="true">
      {heroImages.map((image, index) => (
        <picture
          className={`hero-slide${index === activeIndex ? " is-active" : ""}`}
          key={image.desktop}
        >
          <source media="(max-width: 720px)" srcSet={image.mobile} />
          <img
            src={image.desktop}
            alt=""
            width={1536}
            height={1024}
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
            decoding="async"
          />
        </picture>
      ))}
    </div>
  );
}
