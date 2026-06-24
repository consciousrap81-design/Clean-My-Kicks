import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ShopOrderSuccess() {
  const [search] = useSearchParams();
  const sessionId = search.get("session_id");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-32 pb-20 max-w-xl text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="font-display text-3xl md:text-5xl mb-3">Order Confirmed</h1>
        <p className="text-muted-foreground mb-6">
          Thanks for picking up a pair. We're packing them up and you'll get
          tracking by email as soon as they ship. Check your inbox for a
          confirmation and a link to set up your account.
        </p>
        {sessionId && (
          <p className="text-xs text-muted-foreground mb-6">Reference: {sessionId.slice(-12)}</p>
        )}
        <div className="flex gap-3 justify-center">
          <Button asChild variant="outline"><Link to="/#shop">Keep Browsing</Link></Button>
          <Button asChild><Link to="/account">View Account</Link></Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}