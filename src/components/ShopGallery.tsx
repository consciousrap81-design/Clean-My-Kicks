import ScrollReveal from "./ScrollReveal";
import shopProcess1 from "@/assets/shop-process-1.jpg";
import shopProcess2 from "@/assets/shop-process-2.jpg";
import shopProcess3 from "@/assets/shop-process-3.jpg";
import shopProcess4 from "@/assets/shop-process-4.jpg";

const galleryImages = [
  {
    src: shopProcess1,
    title: "Deep Cleaning",
    description: "Careful hand cleaning with premium foam solutions"
  },
  {
    src: shopProcess2,
    title: "Leather Conditioning",
    description: "Restoring suppleness with professional treatments"
  },
  {
    src: shopProcess3,
    title: "Our Collection",
    description: "Beautifully restored kicks ready to ship"
  },
  {
    src: shopProcess4,
    title: "Sole Restoration",
    description: "Detailed cleaning for that fresh-out-the-box look"
  }
];

const ShopGallery = () => {
  return (
    <section id="shop-gallery" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="text-primary font-semibold tracking-wider uppercase text-sm">
              Behind The Scenes
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
              OUR PROCESS
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Take a look inside our workshop where every sneaker gets the premium treatment it deserves.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {galleryImages.map((image, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <div className="group relative overflow-hidden rounded-2xl aspect-square">
                <img
                  src={image.src}
                  alt={image.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-white font-bold text-xl mb-1">{image.title}</h3>
                  <p className="text-white/80 text-sm">{image.description}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShopGallery;
