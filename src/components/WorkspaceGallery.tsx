import ScrollReveal from "@/components/ScrollReveal";

import shop1 from "@/assets/shop-1.jpg";
import shop2 from "@/assets/shop-2.jpg";
import shop3 from "@/assets/shop-3.jpg";
import shop4 from "@/assets/shop-4.jpg";
import shop5 from "@/assets/shop-5.jpg";

const workspaceImages = [
  { src: shop1, alt: "Clean My Kicks workspace", span: "col-span-2 row-span-2" },
  { src: shop2, alt: "Sneaker cleaning station", span: "col-span-1 row-span-1" },
  { src: shop3, alt: "Restoration in progress", span: "col-span-1 row-span-1" },
  { src: shop4, alt: "Premium cleaning supplies", span: "col-span-1 row-span-2" },
  { src: shop5, alt: "Finished restorations", span: "col-span-1 row-span-1" },
];

const WorkspaceGallery = () => {
  return (
    <section className="py-16 md:py-32 bg-muted/30">
      <div className="container px-4">
        <ScrollReveal animation="fade-up" className="text-center mb-10 md:mb-16">
          <span className="text-primary font-body text-xs md:text-sm uppercase tracking-widest">
            Behind The Scenes
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-6xl text-foreground mt-3 md:mt-4">
            OUR WORKSPACE
          </h2>
          <p className="font-body text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mt-3 md:mt-4">
            Take a look inside our studio where the magic happens. Every pair gets the VIP treatment.
          </p>
        </ScrollReveal>

        {/* Masonry-style Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[150px] md:auto-rows-[200px]">
          {workspaceImages.map((image, index) => (
            <ScrollReveal
              key={index}
              animation="fade-up"
              delay={index * 75}
              className={image.span}
            >
              <div className="relative group h-full overflow-hidden rounded-xl md:rounded-2xl border border-border">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="font-body text-xs md:text-sm text-white/90">
                    {image.alt}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkspaceGallery;
