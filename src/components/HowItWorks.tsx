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
    <section id="how-it-works" className="py-16 md:py-32 bg-background">
      <div className="container px-4">
        <ScrollReveal animation="fade-up" className="text-center mb-10 md:mb-16">
          <span className="text-primary font-body text-xs md:text-sm uppercase tracking-widest">
            Simple Process
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-6xl text-foreground mt-3 md:mt-4">
            HOW IT WORKS
          </h2>
          <p className="font-body text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mt-3 md:mt-4">
            Getting your sneakers cleaned is easy. Just three simple steps.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {steps.map((item, index) => (
            <ScrollReveal
              key={item.step}
              animation="fade-up"
              delay={index * 100}
            >
              <div className="relative flex md:flex-col items-start md:items-center text-left md:text-center gap-4 md:gap-0">
                {/* Connector Line (hidden on mobile and last item) */}
                {index < steps.length - 1 && (
                  <>
                    <div className="hidden md:block absolute top-12 left-1/2 w-full h-px bg-gradient-to-r from-primary/50 to-primary/10 z-0" />
                    <div className="md:hidden absolute left-[2.75rem] top-[4.5rem] w-px h-[calc(100%+0.5rem)] bg-gradient-to-b from-primary/50 to-primary/10 z-0" />
                  </>
                )}

                {/* Icon */}
                <div className="relative z-10 w-[5.5rem] h-[5.5rem] md:w-24 md:h-24 shrink-0 rounded-xl md:rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center md:mb-6">
                  <item.icon className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                  <span className="absolute -top-2 -right-2 md:-top-3 md:-right-3 w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary text-primary-foreground font-display text-xs md:text-sm flex items-center justify-center">
                    {item.step}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 md:flex-none">
                  <h3 className="font-display text-lg md:text-xl text-foreground mb-1 md:mb-3">
                    {item.title}
                  </h3>
                  <p className="font-body text-muted-foreground text-xs md:text-sm leading-relaxed max-w-xs">
                    {item.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal animation="fade-up" delay={300} className="text-center mt-10 md:mt-16">
          <Button variant="hero" size="lg" className="md:h-14 md:px-8" onClick={scrollToBooking}>
            Book Now
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default HowItWorks;
