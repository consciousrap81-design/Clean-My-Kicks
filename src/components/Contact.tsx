import { forwardRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * FORMSPREE SETUP:
 * 1. Go to https://formspree.io and create a free account
 * 2. Create a new form and copy the form ID (looks like "xwpkpwqv")
 * 3. Replace the ID below with your form ID
 * 
 * Example: If your endpoint is https://formspree.io/f/xwpkpwqv
 * Then FORMSPREE_FORM_ID should be "xwpkpwqv"
 */
const FORMSPREE_FORM_ID = "xwpkpwqv"; // <-- REPLACE WITH YOUR FORMSPREE FORM ID
const FORMSPREE_ENDPOINT = `https://formspree.io/f/${FORMSPREE_FORM_ID}`;

interface BookingFormData {
  fullName: string;
  phone: string;
  email: string;
  serviceLevel: string;
  shoeBrand: string;
  shoeModel: string;
  shoeSize: string;
  dropoffMethod: string;
  notes: string;
}

const initialFormData: BookingFormData = {
  fullName: "",
  phone: "",
  email: "",
  serviceLevel: "",
  shoeBrand: "",
  shoeModel: "",
  shoeSize: "",
  dropoffMethod: "",
  notes: "",
};

const Contact = forwardRef<HTMLElement>((_, ref) => {
  const [formData, setFormData] = useState<BookingFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "Full Name": formData.fullName,
          "Phone": formData.phone,
          "Email": formData.email,
          "Service Level": formData.serviceLevel,
          "Shoe Brand": formData.shoeBrand,
          "Shoe Model/Name": formData.shoeModel,
          "Shoe Size": formData.shoeSize,
          "Drop-off Method": formData.dropoffMethod,
          "Notes": formData.notes,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast.success("Booking request submitted! We'll contact you within 24 hours.");
        setFormData(initialFormData);
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
    setFormData(initialFormData);
  };

  return (
    <section ref={ref} id="booking" className="py-20 md:py-32 bg-secondary/30">
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
                  <p className="font-body text-foreground">hello@cleanmykicks.com</p>
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
              <h3 className="font-display text-2xl text-foreground mb-3">Booking Received!</h3>
              <p className="font-body text-muted-foreground mb-6 max-w-md">
                Thanks for your booking request. We'll review your sneaker details and contact you within 24 hours with a quote.
              </p>
              <Button variant="outline" onClick={resetForm}>
                Submit Another Request
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name & Phone */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                    Full Name *
                  </label>
                  <Input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
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
                    value={formData.phone}
                    onChange={handleChange}
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
                  value={formData.email}
                  onChange={handleChange}
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
                  value={formData.serviceLevel}
                  onChange={handleChange}
                  required
                  className="w-full h-10 px-3 rounded-md bg-card border border-border text-foreground focus:border-primary focus:outline-none font-body"
                >
                  <option value="">Select a service</option>
                  <option value="basic">Basic Clean - $35</option>
                  <option value="deep">Deep Clean - $55</option>
                  <option value="restoration">Full Restoration - $75+</option>
                  <option value="customization">Customization - $150+</option>
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
                    value={formData.shoeBrand}
                    onChange={handleChange}
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
                    value={formData.shoeModel}
                    onChange={handleChange}
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
                    value={formData.shoeSize}
                    onChange={handleChange}
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
                    name="dropoffMethod"
                    value={formData.dropoffMethod}
                    onChange={handleChange}
                    required
                    className="w-full h-10 px-3 rounded-md bg-card border border-border text-foreground focus:border-primary focus:outline-none font-body"
                  >
                    <option value="">Select method</option>
                    <option value="dropoff">Drop-off (Local)</option>
                    <option value="pickup">Pickup (We'll come to you)</option>
                    <option value="mailin">Mail-in (Ship to us)</option>
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
                  value={formData.notes}
                  onChange={handleChange}
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