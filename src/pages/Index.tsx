import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import Hero from "@/components/Hero";
import TrustStrip from "@/components/TrustStrip";
import HowItWorks from "@/components/HowItWorks";
import Services from "@/components/Services";
import Gallery from "@/components/Gallery";
import Testimonials from "@/components/Testimonials";
import Shop from "@/components/Shop";
import About from "@/components/About";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import MobileBottomBar from "@/components/MobileBottomBar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Seo
        title="Clean My Kicks | Sneaker Cleaning & Restoration in Denton, TX"
        description="Pro sneaker cleaning, restoration, and customization in Denton, TX. Serving DFW with fast turnaround, mail-in shipping, and trusted care. Book today."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Clean My Kicks",
          url: "https://cleanmykicks.com",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://cleanmykicks.com/shop?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <Navbar />
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <Services />
      <Gallery />
      <Testimonials />
      <Shop />
      <About />
      <FAQ />
      <Contact />
      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default Index;
