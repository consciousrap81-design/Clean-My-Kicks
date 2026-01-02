import { ClipboardList, Truck, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";

const steps = [
  {
    icon: ClipboardList,
    step: "01",
    title: "Book & Describe Your Shoes",
    description: "Fill out our quick booking form with your shoe details and preferred service level.",
  },
  {
    icon: Truck,
    step: "02",
    title: "Drop Off / Pickup / Mail-In",
    description: "Choose your preferred method—drop off locally, schedule a pickup, or ship to us.",
  },
  {
    icon: Sparkles,
    step: "03",
    title: "Cleaned & Ready",
    description: "We work our magic and notify you when your fresh kicks are ready for pickup or delivery.",
  },
];

const scrollToBooking = () => {
  document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
};

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-background">
      <div className="container px-4">
        <ScrollReveal animation="fade-up" className="text-center mb-16">
          <span className="text-primary font-body text-sm uppercase tracking-widest">
            Simple Process
          </span>
          <h2 className="font-display text-4xl md:text-6xl text-foreground mt-4">
            HOW IT WORKS
          </h2>
          <p className="font-body text-muted-foreground max-w-2xl mx-auto mt-4">
            Getting your sneakers cleaned is easy. Just three simple steps.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((item, index) => (
            <ScrollReveal
              key={item.step}
              animation="fade-up"
              delay={index * 100}
            >
              <div className="relative text-center">
                {/* Connector Line (hidden on mobile and last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-px bg-gradient-to-r from-primary/50 to-primary/10 z-0" />
                )}

                {/* Icon */}
                <div className="relative z-10 w-24 h-24 mx-auto rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-6">
                  <item.icon className="w-10 h-10 text-primary" />
                  <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground font-display text-sm flex items-center justify-center">
                    {item.step}
                  </span>
                </div>

                {/* Content */}
                <h3 className="font-display text-xl text-foreground mb-3">
                  {item.title}
                </h3>
                <p className="font-body text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                  {item.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal animation="fade-up" delay={300} className="text-center mt-16">
          <Button variant="hero" size="xl" onClick={scrollToBooking}>
            Book Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default HowItWorks;
