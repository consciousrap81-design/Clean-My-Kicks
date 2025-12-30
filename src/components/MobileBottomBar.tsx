import { Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const MobileBottomBar = () => {
  const scrollToBooking = () => {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border p-3 pb-safe">
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-12"
          asChild
        >
          <a href="tel:+19402814277">
            <Phone className="w-4 h-4 mr-2" />
            Call
          </a>
        </Button>
        <Button
          variant="hero"
          className="flex-1 h-12"
          onClick={scrollToBooking}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Book
        </Button>
      </div>
    </div>
  );
};

export default MobileBottomBar;