import { Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const MobileBottomBar = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border p-3">
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <a href="tel:+19402814277">
            <Phone className="w-4 h-4 mr-2" />
            Call
          </a>
        </Button>
        <Button variant="hero" className="flex-1" asChild>
          <a href="#booking">
            <Calendar className="w-4 h-4 mr-2" />
            Book
          </a>
        </Button>
      </div>
    </div>
  );
};

export default MobileBottomBar;
