import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import heroImage from "@/assets/hero-sneaker.jpg";
import logoK from "@/assets/logo-k.png";

const useCountUp = (end: number, duration: number = 2000, trigger: boolean) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!trigger) return;
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, trigger]);
  
  return count;
};

const Hero = () => {
  const [scrollY, setScrollY] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const kicksCount = useCountUp(500, 2000, statsVisible);
  const satisfactionCount = useCountUp(100, 1800, statsVisible);
  const ratingCount = useCountUp(5, 1500, statsVisible);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 bg-slate-900">
      {/* Background Image with Parallax */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Premium sneaker cleaning"
          className="w-full h-full object-cover opacity-60 will-change-transform"
          style={{
            transform: `translateY(${scrollY * 0.4}px) scale(1.1)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 rounded-full px-4 py-2 mb-6 animate-fade-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-body uppercase tracking-wider text-primary">
              Premium Sneaker Care
            </span>
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-white leading-none mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            RESTORE YOUR
            <span className="flex items-center gap-2 text-shimmer">
              <img 
                src={logoK} 
                alt="K" 
                className="inline-block h-16 md:h-24 lg:h-32 w-auto animate-kick"
              />
              ICKS TO GLORY
            </span>
          </h1>
          
          <p className="font-body text-lg md:text-xl text-slate-300 max-w-xl mb-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Professional sneaker cleaning, restoration, and customization services. 
            From Jordans to Dunks, we bring your grails back to life.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Button
              variant="hero"
              size="xl"
              onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
            >
              Book a Cleaning
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="border-slate-600 text-white hover:bg-slate-800"
              onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Services
            </Button>
          </div>

          {/* Stats */}
          <div ref={statsRef} className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-slate-700 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <div>
              <p className="font-display text-3xl md:text-4xl text-primary">{kicksCount}+</p>
              <p className="font-body text-sm text-slate-400 uppercase tracking-wider">Kicks Restored</p>
            </div>
            <div>
              <p className="font-display text-3xl md:text-4xl text-primary">{satisfactionCount}%</p>
              <p className="font-body text-sm text-slate-400 uppercase tracking-wider">Satisfaction</p>
            </div>
            <div>
              <p className="font-display text-3xl md:text-4xl text-primary">{ratingCount}★</p>
              <p className="font-body text-sm text-slate-400 uppercase tracking-wider">Rated Service</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
