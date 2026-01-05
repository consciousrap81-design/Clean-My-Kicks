import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustStrip from "@/components/TrustStrip";
import HowItWorks from "@/components/HowItWorks";
import Services from "@/components/Services";
import Gallery from "@/components/Gallery";
import ShopGallery from "@/components/ShopGallery";
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
      <Navbar />
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <Services />
      <Gallery />
      <ShopGallery />
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
