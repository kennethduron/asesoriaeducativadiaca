"use client";

import { useEffect, useState } from "react";

const timeFormatter = new Intl.DateTimeFormat("es-HN", {
  timeZone: "America/Tegucigalpa",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

const isoFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Tegucigalpa",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function getHondurasTime() {
  const now = new Date();
  return {
    label: timeFormatter
      .format(now)
      .replace(" a. m.", " AM")
      .replace(" p. m.", " PM"),
    dateTime: isoFormatter.format(now).replace(" ", "T"),
  };
}

export function HondurasClock() {
  const [time, setTime] = useState<{ label: string; dateTime: string } | null>(
    null,
  );

  useEffect(() => {
    const update = () => setTime(getHondurasTime());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time
      className="honduras-time"
      dateTime={time?.dateTime ?? ""}
      title="Hora actual de Honduras"
    >
      HN {time?.label ?? "--:--:--"}
    </time>
  );
}
