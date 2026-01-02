import { Star } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

import customer1 from "@/assets/customer1.jpg";
import customer2 from "@/assets/customer2.jpg";
import customer3 from "@/assets/customer3.jpg";

const testimonials = [
  {
    name: "Marcus Johnson",
    location: "Atlanta, GA",
    photo: customer1,
    rating: 5,
    text: "These guys brought my Jordan 1s back to life. I thought they were done for but the restoration was incredible. Highly recommend!",
  },
  {
    name: "Emily Chen",
    location: "Los Angeles, CA",
    photo: customer2,
    rating: 5,
    text: "Fast turnaround and amazing quality. My Yeezys look brand new. Will definitely be back for all my sneaker cleaning needs.",
  },
  {
    name: "David Rodriguez",
    location: "Miami, FL",
    photo: customer3,
    rating: 5,
    text: "The deep clean service is worth every penny. My white AF1s were looking rough but now they're fresh out the box clean.",
  },
];

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? "fill-primary text-primary" : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
};

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-20 md:py-32 bg-background">
      <div className="container px-4">
        <ScrollReveal animation="fade-up" className="text-center mb-16">
          <span className="text-primary font-body text-sm uppercase tracking-widest">
            Testimonials
          </span>
          <h2 className="font-display text-4xl md:text-6xl text-foreground mt-4">
            WHAT OUR CUSTOMERS SAY
          </h2>
          <p className="font-body text-muted-foreground max-w-2xl mx-auto mt-4">
            Don't just take our word for it. Hear from sneakerheads who trust us with their kicks.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal
              key={testimonial.name}
              animation="fade-up"
              delay={index * 100}
            >
              <div className="bg-card border border-border rounded-2xl p-8 hover:border-primary/50 transition-all duration-300 h-full">
                {/* Header with photo and info */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <img
                      src={testimonial.photo}
                      alt={testimonial.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground text-xs">✓</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-display text-foreground text-lg">
                      {testimonial.name}
                    </h4>
                    <p className="font-body text-muted-foreground text-sm">
                      {testimonial.location}
                    </p>
                  </div>
                </div>

                {/* Star Rating */}
                <div className="mb-4">
                  <StarRating rating={testimonial.rating} />
                </div>

                {/* Testimonial Text */}
                <p className="font-body text-muted-foreground leading-relaxed">
                  "{testimonial.text}"
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
