import { Menu, X, Phone, MessageCircle, Instagram } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import heroK from "@/assets/hero-k.png";
const navItems = [
  { label: "Services", href: "#services" },
  { label: "Shop", href: "#shop" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#booking" },
];

const scrollToBooking = () => {
  document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 nav-dark backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a href="#" className="flex items-center group">
            <div className="relative">
              <img 
                src={heroK} 
                alt="K" 
                className="h-12 md:h-16 w-auto origin-center group-hover:animate-kick [filter:drop-shadow(0_2px_2px_rgba(0,0,0,0.9))_drop-shadow(0_6px_12px_rgba(0,0,0,0.6))]" 
              />
              <span className="absolute -top-1 -right-1 text-[8px] md:text-[10px] text-foil font-bold [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.9))]">®</span>
            </div>
            <span className="font-anton text-xl md:text-2xl text-foil tracking-tight group-hover:animate-kickedBounce -ml-5 [filter:drop-shadow(0_2px_2px_rgba(0,0,0,0.9))_drop-shadow(0_6px_12px_rgba(0,0,0,0.6))]">
              CLEAN MY KICKS
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="font-body text-sm uppercase tracking-widest text-white/70 hover:text-primary transition-colors duration-300"
              >
                {item.label}
              </a>
            ))}
            <div className="flex items-center gap-4">
              <a
                href="tel:+19402814277"
                className="flex items-center gap-2 font-body text-sm text-white/70 hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4" />
                (940) 281-4277
              </a>
              {/* Mobile: Text SMS link */}
              <a
                href="sms:+19402814277&body=Hi%20Clean%20My%20Kicks%2C%20I%27d%20like%20a%20quote%20for%20a%20cleaning.%20My%20shoes%20are%3A%20"
                className="flex sm:hidden items-center gap-2 font-body text-sm text-white/70 hover:text-primary transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Text
              </a>
              {/* Desktop: DM on Instagram */}
              <a
                href="https://www.instagram.com/cleanmykicksdotcom/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 font-body text-sm text-white/70 hover:text-primary transition-colors"
              >
                <Instagram className="w-4 h-4" />
                DM on Instagram
              </a>
            </div>
            <Button variant="hero" size="sm" onClick={scrollToBooking}>
              Book Now
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-white"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/10 animate-fade-in">
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="font-body text-sm uppercase tracking-widest text-white/70 hover:text-primary transition-colors py-2"
                >
                  {item.label}
                </a>
              ))}
              <Button
                variant="hero"
                size="sm"
                className="w-fit"
                onClick={() => {
                  setIsOpen(false);
                  scrollToBooking();
                }}
              >
                Book Now
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
