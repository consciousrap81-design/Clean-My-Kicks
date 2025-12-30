import { ArrowRight } from "lucide-react";
import serviceClean from "@/assets/service-clean.jpg";
import serviceRestore from "@/assets/service-restore.jpg";
import serviceCustom from "@/assets/service-custom.jpg";

const services = [
  {
    title: "Deep Clean",
    description: "Professional deep cleaning to remove dirt, stains, and odors. Your kicks will look and smell fresh.",
    price: "From $35",
    image: serviceClean,
    features: ["Sole cleaning", "Upper cleaning", "Deodorizing", "Lace cleaning"],
  },
  {
    title: "Restoration",
    description: "Complete restoration to bring your worn sneakers back to life. We handle sole swaps, repainting, and more.",
    price: "From $75",
    image: serviceRestore,
    features: ["Sole restoration", "Paint touch-ups", "Yellowing removal", "Structural repair"],
  },
  {
    title: "Customization",
    description: "Make your kicks one-of-a-kind with custom artwork, colors, and designs by our skilled artists.",
    price: "From $150",
    image: serviceCustom,
    features: ["Custom painting", "Artwork design", "Color swaps", "Unique finishes"],
  },
];

const Services = () => {
  return (
    <section id="services" className="py-20 md:py-32 bg-background">
      <div className="container px-4">
        <div className="text-center mb-16">
          <span className="text-primary font-body text-sm uppercase tracking-widest">What We Do</span>
          <h2 className="font-display text-4xl md:text-6xl text-foreground mt-4">OUR SERVICES</h2>
          <p className="font-body text-muted-foreground max-w-2xl mx-auto mt-4">
            From a quick refresh to a complete transformation, we've got your kicks covered.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group card-gradient rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-500 animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <span className="absolute bottom-4 left-4 font-display text-2xl text-foreground">{service.price}</span>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="font-display text-2xl text-foreground mb-3">{service.title}</h3>
                <p className="font-body text-muted-foreground text-sm mb-4">{service.description}</p>
                
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 text-primary font-body text-sm uppercase tracking-wider group/link"
                >
                  Book Now
                  <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
