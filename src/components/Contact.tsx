import { forwardRef, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xvzojebk";

const Contact = forwardRef<HTMLElement>((_, ref) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast.success("Request sent — we'll contact you soon.");
        formRef.current?.reset();
      } else {
        toast.error("Something went wrong. Please try again or call us directly.");
      }
    } catch {
      toast.error("Failed to submit. Please try again or call us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSubmitted(false);
    formRef.current?.reset();
  };

  return (
    <section ref={ref} id="booking" className="py-20 md:py-32 bg-background">
      <div className="container px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Info */}
          <div>
            <span className="text-primary font-body text-sm uppercase tracking-widest">
              Book Your Service
            </span>
            <h2 className="font-display text-4xl md:text-6xl text-foreground mt-4 mb-6">
              LET'S RESTORE
              <span className="block text-gradient">YOUR KICKS</span>
            </h2>
            <p className="font-body text-muted-foreground mb-8">
              Fill out the booking form with your sneaker details and preferred service. 
              We'll get back to you within 24 hours with a quote and next steps.
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-body text-sm text-muted-foreground">Email</p>
                  <p className="font-body text-foreground">questions@cleanmykicks.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-body text-sm text-muted-foreground">Phone</p>
                  <a href="tel:+19402814277" className="font-body text-foreground hover:text-primary transition-colors">
                    (940) 281-4277
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-body text-sm text-muted-foreground">Location</p>
                  <p className="font-body text-foreground">Local Pickup Available</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form or Success State */}
          {isSubmitted ? (
            <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-card border border-border">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display text-2xl text-foreground mb-3">Request Sent!</h3>
              <p className="font-body text-muted-foreground mb-6 max-w-md">
                Request sent — we'll contact you soon.
              </p>
              <Button variant="outline" onClick={resetForm}>
                Submit Another Request
              </Button>
            </div>
          ) : (
            <form
              ref={formRef}
              method="POST"
              action={FORMSPREE_ENDPOINT}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Hidden Fields */}
              <input type="hidden" name="_subject" value="New Clean My Kicks Booking Request" />
              <input type="text" name="_gotcha" className="sr-only" tabIndex={-1} autoComplete="off" />

              {/* Full Name & Phone */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                    Full Name *
                  </label>
                  <Input
                    name="fullName"
                    placeholder="Your full name"
                    required
                    className="bg-card border-border focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                    Phone *
                  </label>
                  <Input
                    name="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    required
                    className="bg-card border-border focus:border-primary"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                  Email *
                </label>
                <Input
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  className="bg-card border-border focus:border-primary"
                />
              </div>

              {/* Service Level */}
              <div>
                <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                  Service Level *
                </label>
                <select
                  name="serviceLevel"
                  required
                  className="w-full h-10 px-3 rounded-md bg-card border border-border text-foreground focus:border-primary focus:outline-none font-body"
                >
                  <option value="">Select a service</option>
                  <option value="Basic">Basic Clean</option>
                  <option value="Deep">Deep Clean</option>
                  <option value="Restoration">Restoration</option>
                </select>
              </div>

              {/* Shoe Brand & Model */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                    Shoe Brand *
                  </label>
                  <Input
                    name="shoeBrand"
                    placeholder="e.g., Nike, Jordan, Adidas"
                    required
                    className="bg-card border-border focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                    Shoe Model/Name *
                  </label>
                  <Input
                    name="shoeModel"
                    placeholder="e.g., Air Jordan 1 Retro"
                    required
                    className="bg-card border-border focus:border-primary"
                  />
                </div>
              </div>

              {/* Shoe Size & Drop-off Method */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                    Shoe Size *
                  </label>
                  <Input
                    name="shoeSize"
                    placeholder="e.g., Men's 10.5"
                    required
                    className="bg-card border-border focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                    Drop-off Method *
                  </label>
                  <select
                    name="dropOffMethod"
                    required
                    className="w-full h-10 px-3 rounded-md bg-card border border-border text-foreground focus:border-primary focus:outline-none font-body"
                  >
                    <option value="">Select method</option>
                    <option value="Drop-off">Drop-off</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Mail-in">Mail-in</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                  Notes / Special Requests
                </label>
                <Textarea
                  name="notes"
                  placeholder="Describe the condition of your sneakers, any specific issues, or special requests..."
                  rows={4}
                  className="bg-card border-border focus:border-primary resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="hero"
                className="w-full sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Booking Request
                  </>
                )}
              </Button>

              <p className="font-body text-xs text-muted-foreground">
                * Required fields. We'll respond within 24 hours with a quote.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
});

Contact.displayName = "Contact";
export default Contact;
