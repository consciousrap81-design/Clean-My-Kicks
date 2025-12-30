import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    service: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you soon.");
    setFormData({ name: "", email: "", service: "", message: "" });
  };

  return (
    <section id="contact" className="py-20 md:py-32 bg-secondary/30">
      <div className="container px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Info */}
          <div>
            <span className="text-primary font-body text-sm uppercase tracking-widest">Get In Touch</span>
            <h2 className="font-display text-4xl md:text-6xl text-foreground mt-4 mb-6">
              READY TO RESTORE
              <span className="block text-gradient">YOUR KICKS?</span>
            </h2>
            <p className="font-body text-muted-foreground mb-8">
              Drop us a message with details about your sneakers and what service you're looking for. 
              We'll get back to you with a quote within 24 hours.
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
                  <p className="font-body text-foreground">(555) 123-4567</p>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                  Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                  required
                  className="bg-card border-border focus:border-primary"
                />
              </div>
              <div>
                <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                  className="bg-card border-border focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                Service Interested In
              </label>
              <select
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-card border border-border text-foreground focus:border-primary focus:outline-none font-body"
                required
              >
                <option value="">Select a service</option>
                <option value="cleaning">Deep Clean</option>
                <option value="restoration">Restoration</option>
                <option value="customization">Customization</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="font-body text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                Message
              </label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Tell us about your sneakers and what you're looking for..."
                rows={5}
                required
                className="bg-card border-border focus:border-primary resize-none"
              />
            </div>

            <Button type="submit" variant="hero" className="w-full sm:w-auto">
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
