import { Menu, X, Phone, MessageCircle, Instagram } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a href="#" className="flex flex-col items-start leading-none">
            <span className="font-display text-xs md:text-sm tracking-wider text-foreground/90">CLEAN MY</span>
            <span className="font-display text-2xl md:text-3xl tracking-tight text-foreground relative">
              KICKS
              <svg className="absolute -bottom-1 left-0 w-6 md:w-8 h-4 md:h-5" viewBox="0 0 32 20" fill="none">
                <path d="M4 2C6 8 8 14 10 18M10 18C12 14 14 8 16 2M16 2C18 8 20 14 22 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary"/>
              </svg>
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="font-body text-sm uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors duration-300"
              >
                {item.label}
              </a>
            ))}
            <div className="flex items-center gap-4">
              <a
                href="tel:+19402814277"
                className="flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4" />
                (940) 281-4277
              </a>
              {/* Mobile: Text SMS link */}
              <a
                href="sms:+19402814277&body=Hi%20Clean%20My%20Kicks%2C%20I%27d%20like%20a%20quote%20for%20a%20cleaning.%20My%20shoes%20are%3A%20"
                className="flex sm:hidden items-center gap-2 font-body text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Text
              </a>
              {/* Desktop: DM on Instagram */}
              <a
                href="https://www.instagram.com/cleanmykicksdotcom/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-primary transition-colors"
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
            className="md:hidden p-2 text-foreground"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="font-body text-sm uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors py-2"
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
