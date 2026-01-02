import { forwardRef } from "react";
import { Instagram, MapPin, Phone } from "lucide-react";
import logoFull from "@/assets/logo-full.png";
import sevenLogo from "@/assets/seven-logo.png";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  return (
    <footer ref={ref} className="nav-dark border-t border-white/10 py-12">
      <div className="container px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <a href="#">
              <img src={logoFull} alt="Clean My Kicks" className="h-16 w-auto" />
            </a>
            <p className="font-body text-white/70 mt-4 max-w-md">
              Professional sneaker cleaning, restoration, and customization. 
              Your kicks deserve the best care.
            </p>
            
            {/* Contact Info */}
            <div className="mt-6 space-y-3">
              <a 
                href="tel:+19402814277" 
                className="flex items-center gap-2 font-body text-white/70 hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4 text-primary" />
                (940) 281-4277
              </a>
              <div className="flex items-start gap-2 font-body text-white/70">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span>Denton, TX • Serving the DFW Metroplex</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-4 mt-6">
              {/* Replace href with your actual Instagram URL */}
              <a 
                href="https://instagram.com/cleanmykicks" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="w-5 h-5 text-white" />
              </a>
              {/* Replace href with your actual Google Business URL */}
              <a 
                href="https://g.page/cleanmykicks" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                aria-label="Find us on Google"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg text-white mb-4">QUICK LINKS</h4>
            <ul className="space-y-2">
              <li><a href="#services" className="font-body text-white/70 hover:text-primary transition-colors">Services</a></li>
              <li><a href="#gallery" className="font-body text-white/70 hover:text-primary transition-colors">Gallery</a></li>
              <li><a href="#shop" className="font-body text-white/70 hover:text-primary transition-colors">Shop</a></li>
              <li><a href="#about" className="font-body text-white/70 hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#faq" className="font-body text-white/70 hover:text-primary transition-colors">FAQ</a></li>
              <li><a href="#booking" className="font-body text-white/70 hover:text-primary transition-colors">Book Now</a></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-display text-lg text-white mb-4">SERVICES</h4>
            <ul className="space-y-2">
              <li><a href="#services" className="font-body text-white/70 hover:text-primary transition-colors">Basic Clean</a></li>
              <li><a href="#services" className="font-body text-white/70 hover:text-primary transition-colors">Deep Clean</a></li>
              <li><a href="#services" className="font-body text-white/70 hover:text-primary transition-colors">Restoration</a></li>
            </ul>
            
            <h4 className="font-display text-lg text-white mb-4 mt-8">SERVICE AREA</h4>
            <ul className="space-y-2 font-body text-white/70">
              <li>Denton, TX</li>
              <li>Dallas-Fort Worth Metroplex</li>
              <li>Mail-in service available</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-body text-sm text-white/60 flex items-center gap-1 flex-wrap">
            © {new Date().getFullYear()} Clean My Kicks, a brand of 
            <img src={sevenLogo} alt="7" className="h-4 w-auto inline-block" />
            Seven Loaf Ministries, LLC. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="font-body text-sm text-white/60 hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="font-body text-sm text-white/60 hover:text-primary transition-colors">
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
