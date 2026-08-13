import { ServiceIcon } from "@/components/public/service-icon";
import { serviceSummaries } from "@/features/public-site/data/services";

export function ServiceGrid() {
  return (
    <div className="service-grid">
      {serviceSummaries.map((service) => (
        <article className="service-card" data-reveal key={service.title}>
          <span className="service-icon">
            <ServiceIcon name={service.icon} />
          </span>
          <h3>{service.title}</h3>
          <p>{service.description}</p>
          <ul>
            {service.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
