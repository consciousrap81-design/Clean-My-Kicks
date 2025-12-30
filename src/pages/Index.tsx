import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Shop from "@/components/Shop";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import MobileBottomBar from "@/components/MobileBottomBar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <Hero />
      <Services />
      <Shop />
      <About />
      <Contact />
      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default Index;
