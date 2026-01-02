import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import shop1 from "@/assets/shop-1.jpg";
import shop2 from "@/assets/shop-2.jpg";
import shop3 from "@/assets/shop-3.jpg";

const products = [
  {
    name: "Jordan 4 Military Blue",
    condition: "Restored",
    size: "10.5",
    price: "$220",
    image: shop1,
  },
  {
    name: "Nike Dunk Low Panda",
    condition: "Restored",
    size: "9",
    price: "$145",
    image: shop2,
  },
  {
    name: "Jordan 1 Chicago",
    condition: "Restored",
    size: "11",
    price: "$285",
    image: shop3,
  },
];

const Shop = () => {
  return (
    <section id="shop" className="py-20 md:py-32 bg-slate-100">
      <div className="container px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16">
          <div>
            <span className="text-primary font-body text-sm uppercase tracking-widest">Shop</span>
            <h2 className="font-display text-4xl md:text-6xl text-foreground mt-4">RESTORED KICKS</h2>
            <p className="font-body text-muted-foreground max-w-xl mt-4">
              Premium restored sneakers ready to ship. Each pair professionally cleaned and restored by our team.
            </p>
          </div>
          <Button variant="outline" className="mt-6 md:mt-0">
            View All
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {products.map((product, index) => (
            <div
              key={product.name}
              className="group bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-500 animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-secondary">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-4 left-4 bg-primary text-primary-foreground text-xs font-body uppercase tracking-wider px-3 py-1 rounded-full">
                  {product.condition}
                </span>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display text-xl text-foreground">{product.name}</h3>
                  <span className="font-display text-xl text-primary">{product.price}</span>
                </div>
                <p className="font-body text-sm text-muted-foreground mb-4">Size: {product.size}</p>
                
                <Button variant="default" className="w-full">
                  <ShoppingBag className="w-4 h-4 mr-2" />
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
