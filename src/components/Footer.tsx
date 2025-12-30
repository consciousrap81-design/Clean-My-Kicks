import { forwardRef } from "react";
import { Instagram, Twitter, Facebook } from "lucide-react";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  return (
    <footer ref={ref} className="bg-background border-t border-border py-12">
      <div className="container px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <a href="#" className="font-display text-3xl text-gradient">
              CLEAN MY KICKS
            </a>
            <p className="font-body text-muted-foreground mt-4 max-w-md">
              Professional sneaker cleaning, restoration, and customization. 
              Your kicks deserve the best care.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Instagram className="w-5 h-5 text-foreground" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Twitter className="w-5 h-5 text-foreground" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Facebook className="w-5 h-5 text-foreground" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg text-foreground mb-4">QUICK LINKS</h4>
            <ul className="space-y-2">
              <li><a href="#services" className="font-body text-muted-foreground hover:text-primary transition-colors">Services</a></li>
              <li><a href="#shop" className="font-body text-muted-foreground hover:text-primary transition-colors">Shop</a></li>
              <li><a href="#about" className="font-body text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#booking" className="font-body text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-display text-lg text-foreground mb-4">SERVICES</h4>
            <ul className="space-y-2">
              <li><a href="#services" className="font-body text-muted-foreground hover:text-primary transition-colors">Deep Clean</a></li>
              <li><a href="#services" className="font-body text-muted-foreground hover:text-primary transition-colors">Restoration</a></li>
              <li><a href="#services" className="font-body text-muted-foreground hover:text-primary transition-colors">Customization</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-body text-sm text-muted-foreground">
            © 2024 Clean My Kicks. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="font-body text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="font-body text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
