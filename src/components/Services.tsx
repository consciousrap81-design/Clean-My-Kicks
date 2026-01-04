import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import serviceClean from "@/assets/service-clean.jpg";
import serviceRestore from "@/assets/service-restore.jpg";
import serviceCustom from "@/assets/service-custom.jpg";

const services = [
  {
    title: "Basic Clean",
    price: "Starting at $40",
    turnaround: "3–5 day turnaround",
    description: "A thorough exterior clean to remove surface dirt and bring back that fresh look.",
    image: serviceClean,
    features: [
      "Full exterior wipe-down & brush clean",
      "Sole and midsole cleaning",
      "Lace cleaning included",
    ],
  },
  {
    title: "Deep Clean",
    price: "Starting at $60",
    turnaround: "2–3 day turnaround",
    description: "Complete deep cleaning inside and out for kicks that need extra attention.",
    image: serviceRestore,
    features: [
      "Everything in Basic Clean",
      "Interior deep clean & deodorizing",
      "Stain treatment & conditioning",
    ],
    popular: true,
  },
  {
    title: "Restoration",
    price: "Quote Required",
    turnaround: "Varies by project",
    description: "Full restoration services for worn, yellowed, or damaged sneakers.",
    image: serviceCustom,
    features: [
      "Sole whitening & unyellowing",
      "Paint touch-ups & repainting",
      "Structural repairs & sole regluing",
    ],
  },
];

const scrollToBooking = () => {
  document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
};

const Services = () => {
  return (
    <section id="services" className="py-16 md:py-32 bg-background">
      <div className="container px-4">
        <ScrollReveal animation="fade-up" className="text-center mb-10 md:mb-16">
          <span className="text-primary font-body text-xs md:text-sm uppercase tracking-widest">
            Pricing
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-6xl text-foreground mt-3 md:mt-4">
            OUR SERVICES
          </h2>
          <p className="font-body text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mt-3 md:mt-4">
            From a quick refresh to a complete transformation, we have got your kicks covered.
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {services.map((service, index) => (
            <ScrollReveal
              key={service.title}
              animation="fade-up"
              delay={index * 100}
            >
              <div
                className={`group relative card-gradient rounded-xl md:rounded-2xl overflow-hidden border transition-all duration-500 h-full ${
                  service.popular
                    ? "border-primary shadow-lg shadow-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
              {/* Popular Badge */}
              {service.popular && (
                <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10 bg-primary text-primary-foreground text-[10px] md:text-xs font-body uppercase tracking-wider px-2 py-0.5 md:px-3 md:py-1 rounded-full">
                  Most Popular
                </div>
              )}

              {/* Image */}
              <div className="relative h-40 md:h-48 overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent" />
              </div>

              {/* Content */}
              <div className="p-4 md:p-6">
                <h3 className="font-display text-xl md:text-2xl text-foreground mb-1">
                  {service.title}
                </h3>
                <p className="font-display text-lg md:text-xl text-primary mb-0.5 md:mb-1">
                  {service.price}
                </p>
                <p className="font-body text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                  {service.turnaround}
                </p>
                <p className="font-body text-muted-foreground text-xs md:text-sm mb-4 md:mb-5">
                  {service.description}
                </p>

                {/* What's Included */}
                <div className="mb-4 md:mb-6">
                  <p className="font-body text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground mb-2 md:mb-3">
                    What&apos;s Included
                  </p>
                  <ul className="space-y-1.5 md:space-y-2">
                    {service.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-xs md:text-sm text-foreground"
                      >
                        <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="font-body">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Book Now Button */}
                <Button
                  variant={service.popular ? "hero" : "outline"}
                  className="w-full h-10 md:h-11 text-sm"
                  onClick={scrollToBooking}
                >
                  Book Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;