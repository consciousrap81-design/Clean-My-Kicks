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
        <div className="flex flex-col items-center text-center">
          <span className="text-primary font-body text-sm uppercase tracking-widest">Shop</span>
          <h2 className="font-display text-4xl md:text-6xl text-foreground mt-4">RESTORED KICKS</h2>
          <div className="mt-8 inline-flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-full px-6 py-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="font-display text-lg md:text-xl text-foreground uppercase tracking-wider">Coming Soon</span>
          </div>
          <p className="font-body text-muted-foreground max-w-xl mt-6">
            We're curating a collection of premium restored sneakers. Sign up to be notified when our shop launches.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Shop;
