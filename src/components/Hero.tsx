import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-sneaker.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Premium sneaker cleaning"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 mb-6 animate-fade-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-body uppercase tracking-wider text-primary">
              Premium Sneaker Care
            </span>
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-foreground leading-none mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            RESTORE YOUR
            <span className="block text-gradient">KICKS TO GLORY</span>
          </h1>
          
          <p className="font-body text-lg md:text-xl text-muted-foreground max-w-xl mb-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Professional sneaker cleaning, restoration, and customization services. 
            From Jordans to Dunks, we bring your grails back to life.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Button
              variant="hero"
              size="xl"
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
            >
              Book Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="xl"
              onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Services
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-border animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <div>
              <p className="font-display text-3xl md:text-4xl text-primary">500+</p>
              <p className="font-body text-sm text-muted-foreground uppercase tracking-wider">Kicks Restored</p>
            </div>
            <div>
              <p className="font-display text-3xl md:text-4xl text-primary">100%</p>
              <p className="font-body text-sm text-muted-foreground uppercase tracking-wider">Satisfaction</p>
            </div>
            <div>
              <p className="font-display text-3xl md:text-4xl text-primary">5★</p>
              <p className="font-body text-sm text-muted-foreground uppercase tracking-wider">Rated Service</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
