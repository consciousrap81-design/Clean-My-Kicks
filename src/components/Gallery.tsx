import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import before1 from "@/assets/before1.jpg";
import after1 from "@/assets/after1.jpg";
import before2 from "@/assets/before2.jpg";
import after2 from "@/assets/after2.jpg";
import before3 from "@/assets/before3.jpg";
import after3 from "@/assets/after3.jpg";
import before4 from "@/assets/before4.jpg";
import after4 from "@/assets/after4.jpg";

const galleryItems = [
  { before: before1, after: after1, label: "Jordan 1 Restoration" },
  { before: before2, after: after2, label: "Dunk Low Deep Clean" },
  { before: before3, after: after3, label: "Yeezy 350 Refresh" },
  { before: before4, after: after4, label: "New Balance Revival" },
];

const scrollToBooking = () => {
  document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
};

const Gallery = () => {
  return (
    <section id="gallery" className="py-20 md:py-32 bg-slate-100">
      <div className="container px-4">
        <div className="text-center mb-16">
          <span className="text-primary font-body text-sm uppercase tracking-widest">
            Our Work
          </span>
          <h2 className="font-display text-4xl md:text-6xl text-foreground mt-4">
            BEFORE & AFTER
          </h2>
          <p className="font-body text-muted-foreground max-w-2xl mx-auto mt-4">
            See the transformation. Real results from real kicks.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {galleryItems.map((item, index) => (
            <div
              key={item.label}
              className="space-y-4 animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Before */}
              <div className="relative group overflow-hidden rounded-xl border border-border bg-white">
                <img
                  src={item.before}
                  alt={`${item.label} - Before`}
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent p-4">
                  <span className="font-body text-xs uppercase tracking-wider text-slate-300">
                    Before
                  </span>
                </div>
              </div>

              {/* After */}
              <div className="relative group overflow-hidden rounded-xl border border-primary/30 bg-white">
                <img
                  src={item.after}
                  alt={`${item.label} - After`}
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent p-4">
                  <span className="font-body text-xs uppercase tracking-wider text-primary">
                    After
                  </span>
                </div>
              </div>

              {/* Label */}
              <p className="font-body text-sm text-center text-muted-foreground">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Button variant="hero" size="xl" onClick={scrollToBooking}>
            Book a Cleaning
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Gallery;