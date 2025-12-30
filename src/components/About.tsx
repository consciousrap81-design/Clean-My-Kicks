import { CheckCircle } from "lucide-react";

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
    <section id="about" className="py-20 md:py-32 bg-background">
      <div className="container px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <div>
            <span className="text-primary font-body text-sm uppercase tracking-widest">About Us</span>
            <h2 className="font-display text-4xl md:text-6xl text-foreground mt-4 mb-6">
              WHY CHOOSE
              <span className="block text-gradient">CLEAN MY KICKS</span>
            </h2>
            <p className="font-body text-muted-foreground mb-8">
              We're passionate sneakerheads who understand the value of your collection. 
              Every pair that comes through our doors is treated with the care and attention it deserves. 
              Whether you're looking to refresh your daily drivers or restore a vintage grail, we've got the skills and dedication to make it happen.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 animate-fade-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="font-body text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Element */}
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 flex items-center justify-center">
              <div className="text-center">
                <p className="font-display text-8xl md:text-9xl text-gradient">CMK</p>
                <p className="font-body text-muted-foreground uppercase tracking-widest mt-4">Est. 2024</p>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
