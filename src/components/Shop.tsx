import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import shop1 from "@/assets/shop-1.jpg";
import shop4 from "@/assets/shop-4.png";
import shop5 from "@/assets/shop-5.png";

const products = [
  {
    name: "Jordan 4 Military Blue",
    condition: "Restored",
    size: "10.5",
    price: "$220",
    image: shop1,
  },
  {
    name: "Jordan 4 Oxidized Green",
    condition: "Restored",
    size: "10",
    price: "$265",
    image: shop4,
  },
  {
    name: "Jordan 3 J Balvin",
    condition: "Restored",
    size: "9.5",
    price: "$310",
    image: shop5,
  },
];

const Shop = () => {
  return (
    <section id="shop" className="py-16 md:py-32 bg-slate-100">
      <div className="container px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 md:mb-16">
          <div>
            <span className="text-primary font-body text-xs md:text-sm uppercase tracking-widest">Shop</span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-6xl text-foreground mt-3 md:mt-4">RESTORED KICKS</h2>
            <p className="font-body text-sm md:text-base text-muted-foreground max-w-xl mt-3 md:mt-4">
              Premium restored sneakers ready to ship. Each pair professionally cleaned and restored by our team.
            </p>
          </div>
          <Button variant="outline" className="mt-4 md:mt-0 w-fit">
            View All
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 lg:gap-8">
          {products.map((product, index) => (
            <div
              key={product.name}
              className="group bg-card rounded-xl md:rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-500 animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-secondary">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-2 left-2 md:top-4 md:left-4 bg-primary text-primary-foreground text-[10px] md:text-xs font-body uppercase tracking-wider px-2 py-0.5 md:px-3 md:py-1 rounded-full">
                  {product.condition}
                </span>
              </div>

              {/* Content */}
              <div className="p-3 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-1 md:mb-2 gap-0.5">
                  <h3 className="font-display text-sm sm:text-base md:text-xl text-foreground leading-tight">{product.name}</h3>
                  <span className="font-display text-base md:text-xl text-primary shrink-0">{product.price}</span>
                </div>
                <p className="font-body text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">Size: {product.size}</p>
                
                <Button variant="default" className="w-full h-9 md:h-10 text-xs md:text-sm">
                  <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Shop;
