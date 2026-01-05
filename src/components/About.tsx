import { CheckCircle } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import ceoImage from "@/assets/ceo.png";

const features = [
  "Premium cleaning solutions safe for all materials",
  "Expert technicians with years of experience",
  "Quick turnaround times (3-5 business days)",
  "Satisfaction guarantee on all services",
  "Specialized in Jordan, Nike, and all major brands",
  "Before & after photos for every restoration",
];

const About = () => {
  return (
    <section id="about" className="py-16 md:py-32 bg-background">
      <div className="container px-4">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          <ScrollReveal animation="fade-right">
            <div>
              <span className="text-primary font-body text-xs md:text-sm uppercase tracking-widest">About Us</span>
              <h2 className="font-display text-3xl sm:text-4xl md:text-6xl text-foreground mt-3 md:mt-4 mb-4 md:mb-6">
                WHY CHOOSE
                <span className="block text-gradient">CLEAN MY KICKS</span>
              </h2>
              <p className="font-body text-sm md:text-base text-muted-foreground mb-6 md:mb-8">
                We're passionate sneakerheads who understand the value of your collection. 
                Every pair that comes through our doors is treated with the care and attention it deserves. 
                Whether you're looking to refresh your daily drivers or restore a vintage grail, we've got the skills and dedication to make it happen.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 md:gap-3"
                  >
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0 mt-0.5" />
                    <span className="font-body text-xs md:text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-left" delay={200}>
            <div className="relative">
              <div className="aspect-square rounded-2xl md:rounded-3xl overflow-hidden border border-primary/20">
                <img 
                  src={ceoImage} 
                  alt="CEO of Clean My Kicks" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-6 text-center">
                <p className="font-display text-lg md:text-xl text-foreground">Founder & CEO</p>
                <p className="font-body text-sm md:text-base text-muted-foreground mt-3 italic">
                  "Walking by faith, not by sight. My mission is to serve our community with excellence, 
                  restore what others consider lost, and glorify God through every pair we bring back to life."
                </p>
                <p className="font-body text-xs text-primary mt-2 uppercase tracking-widest">— 2 Corinthians 5:7</p>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-2 -right-2 md:-top-4 md:-right-4 w-16 h-16 md:w-24 md:h-24 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 md:-bottom-8 md:-left-8 w-20 h-20 md:w-32 md:h-32 bg-primary/10 rounded-full blur-3xl" />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default About;
