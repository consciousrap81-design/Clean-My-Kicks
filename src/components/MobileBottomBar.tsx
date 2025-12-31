import { Phone, MessageCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const MobileBottomBar = () => {
  const scrollToBooking = () => {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border p-3 pb-safe">
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 h-11 px-2"
          asChild
        >
          <a href="tel:+19402814277">
            <Phone className="w-4 h-4 mr-1.5" />
            Call
          </a>
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-11 px-2"
          asChild
        >
          <a href="sms:+19402814277&body=Hi%20Clean%20My%20Kicks%2C%20I%27d%20like%20a%20quote%20for%20a%20cleaning.%20My%20shoes%20are%3A%20">
            <MessageCircle className="w-4 h-4 mr-1.5" />
            Text
          </a>
        </Button>
        <Button
          variant="hero"
          className="flex-1 h-11 px-2"
          onClick={scrollToBooking}
        >
          <Calendar className="w-4 h-4 mr-1.5" />
          Book
        </Button>
      </div>
    </div>
  );
};

export default MobileBottomBar;