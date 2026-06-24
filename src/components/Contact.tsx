import { forwardRef, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send, Loader2, CheckCircle, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xvzojebk";
const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const ACCEPTED_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;

type PendingPhoto = { file: File; previewUrl: string };

const Contact = forwardRef<HTMLElement>((_, ref) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const accepted: PendingPhoto[] = [];
    for (const file of incoming) {
      if (photos.length + accepted.length >= MAX_PHOTOS) {
        toast.error(`You can upload up to ${MAX_PHOTOS} photos.`);
        break;
      }
      const validType = ACCEPTED_MIME.has(file.type) || ACCEPTED_EXT.test(file.name);
      if (!validType) {
        toast.error(`${file.name}: unsupported file type. Use JPG, PNG, HEIC or WEBP.`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        toast.error(`${file.name}: file is larger than 10 MB.`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (accepted.length) setPhotos((p) => [...p, ...accepted]);
  }

  function removePhoto(idx: number) {
    setPhotos((p) => {
      const next = [...p];
      const [removed] = next.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function clearPhotos() {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
  }

  async function uploadPhotos(): Promise<string[]> {
    if (!photos.length) return [];
    const folder = crypto.randomUUID();
    const paths: string[] = [];
    for (const { file } of photos) {
      const extMatch = file.name.match(/\.([A-Za-z0-9]+)$/);
      const ext = (extMatch?.[1] || "jpg").toLowerCase();
      const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${safeExt}`;
      const { error } = await supabase.storage
        .from("request-photos")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (error) {
        console.error("photo upload failed", error);
        throw new Error(`Photo upload failed: ${file.name}`);
      }
      paths.push(path);
    }
    return paths;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      // Upload photos first so we can attach paths to the request record
      let photoPaths: string[] = [];
      try {
        photoPaths = await uploadPhotos();
      } catch (err: any) {
        toast.error(err?.message ?? "Photo upload failed");
        setIsSubmitting(false);
        return;
      }

      // Fire admin dashboard request creation in parallel (non-blocking for Formspree)
      const payload = {
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        serviceLevel: formData.get("serviceLevel"),
        shoeBrand: formData.get("shoeBrand"),
        shoeModel: formData.get("shoeModel"),
        shoeSize: formData.get("shoeSize"),
        dropOffMethod: formData.get("dropOffMethod"),
        notes: formData.get("notes"),
        photos: photoPaths,
      };
      supabase.functions
        .invoke("submit-booking", { body: payload })
        .catch((err) => console.error("submit-booking failed", err));

      // Attach photo count to Formspree for visibility
      if (photoPaths.length) {
        formData.set("photoCount", String(photoPaths.length));
      }

      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast.success("Request sent — we'll contact you soon.");
        formRef.current?.reset();
        clearPhotos();
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
    clearPhotos();
  };

  return (
    <section ref={ref} id="booking" className="py-16 md:py-32 bg-background">
      <div className="container px-4">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20">
          {/* Info */}
          <div>
            <span className="text-primary font-body text-xs md:text-sm uppercase tracking-widest">
              Book Your Service
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-6xl text-foreground mt-3 md:mt-4 mb-4 md:mb-6">
              LET'S RESTORE
              <span className="block text-gradient">YOUR KICKS</span>
            </h2>
            <p className="font-body text-sm md:text-base text-muted-foreground mb-6 md:mb-8">
              Fill out the booking form with your sneaker details and preferred service. 
              We'll get back to you within 24 hours with a quote and next steps.
            </p>

            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div>
                  <p className="font-body text-xs md:text-sm text-muted-foreground">Email</p>
                  <p className="font-body text-sm md:text-base text-foreground break-all">questions@cleanmykicks.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div>
                  <p className="font-body text-xs md:text-sm text-muted-foreground">Phone</p>
                  <a href="tel:+19402814277" className="font-body text-sm md:text-base text-foreground hover:text-primary transition-colors">
                    (940) 281-4277
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div>
                  <p className="font-body text-xs md:text-sm text-muted-foreground">Location</p>
                  <p className="font-body text-sm md:text-base text-foreground">Local Pickup Available</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form or Success State */}
          {isSubmitted ? (
            <div className="flex flex-col items-center justify-center text-center p-6 md:p-8 rounded-xl md:rounded-2xl bg-card border border-border">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 md:mb-6">
                <CheckCircle className="w-7 h-7 md:w-8 md:h-8 text-primary" />
              </div>
              <h3 className="font-display text-xl md:text-2xl text-foreground mb-2 md:mb-3">
                Request Received
              </h3>
              <p className="font-body text-sm md:text-base text-muted-foreground mb-4 md:mb-6 max-w-md">
                Thanks for booking with Clean My Kicks. Your request is in — a team member
                will follow up within 24 hours with a quote and next steps.
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
              className="space-y-4 md:space-y-5"
            >
              {/* Hidden Fields */}
              <input type="hidden" name="_subject" value="New Clean My Kicks Booking Request" />
              <input type="text" name="_gotcha" className="sr-only" tabIndex={-1} autoComplete="off" />

              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="font-body text-xs md:text-sm text-muted-foreground uppercase tracking-wider block mb-1.5 md:mb-2">
                    Full Name *
                  </label>
                  <Input
                    name="fullName"
                    placeholder="Your full name"
                    required
                    className="bg-card border-border focus:border-primary h-10 md:h-11 text-sm md:text-base"
                  />
                </div>
                <div>
                  <label className="font-body text-xs md:text-sm text-muted-foreground uppercase tracking-wider block mb-1.5 md:mb-2">
                    Phone *
                  </label>
                  <Input
                    name="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    required
                    className="bg-card border-border focus:border-primary h-10 md:h-11 text-sm md:text-base"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="font-body text-xs md:text-sm text-muted-foreground uppercase tracking-wider block mb-1.5 md:mb-2">
                  Email *
                </label>
                <Input
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  className="bg-card border-border focus:border-primary h-10 md:h-11 text-sm md:text-base"
                />
              </div>

              {/* Service Level */}
              <div>
                <label className="font-body text-xs md:text-sm text-muted-foreground uppercase tracking-wider block mb-1.5 md:mb-2">
                  Service Level *
                </label>
                <select
                  name="serviceLevel"
                  required
                  className="w-full h-10 md:h-11 px-3 rounded-md bg-card border border-border text-foreground focus:border-primary focus:outline-none font-body text-sm md:text-base"
                >
                  <option value="">Select a service</option>
                  <option value="Basic">Basic Clean</option>
                  <option value="Deep">Deep Clean</option>
                  <option value="Restoration">Restoration</option>
                </select>
              </div>

              {/* Shoe Brand & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="font-body text-xs md:text-sm text-muted-foreground uppercase tracking-wider block mb-1.5 md:mb-2">
                    Shoe Brand *
                  </label>
                  <Input
                    name="shoeBrand"
                    placeholder="e.g., Nike, Jordan, Adidas"
                    required
                    className="bg-card border-border focus:border-primary h-10 md:h-11 text-sm md:text-base"
                  />
                </div>
                <div>
                  <label className="font-body text-xs md:text-sm text-muted-foreground uppercase tracking-wider block mb-1.5 md:mb-2">
                    Shoe Model/Name *
                  </label>
                  <Input
                    name="shoeModel"
                    placeholder="e.g., Air Jordan 1 Retro"
                    required
                    className="bg-card border-border focus:border-primary h-10 md:h-11 text-sm md:text-base"
                  />
                </div>
              </div>

              {/* Shoe Size & Drop-off Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="font-body text-xs md:text-sm text-muted-foreground uppercase tracking-wider block mb-1.5 md:mb-2">
                    Shoe Size *
                  </label>
                  <Input
                    name="shoeSize"
                    placeholder="e.g., Men's 10.5"
                    required
                    className="bg-card border-border focus:border-primary h-10 md:h-11 text-sm md:text-base"
                  />
                </div>
                <div>
                  <label className="font-body text-xs md:text-sm text-muted-foreground uppercase tracking-wider block mb-1.5 md:mb-2">
                    Drop-off Method *
                  </label>
                  <select
                    name="dropOffMethod"
                    required
                    className="w-full h-10 md:h-11 px-3 rounded-md bg-card border border-border text-foreground focus:border-primary focus:outline-none font-body text-sm md:text-base"
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
                <label className="font-body text-xs md:text-sm text-muted-foreground uppercase tracking-wider block mb-1.5 md:mb-2">
                  Notes / Special Requests
                </label>
                <Textarea
                  name="notes"
                  placeholder="Describe the condition of your sneakers, any specific issues, or special requests..."
                  rows={3}
                  className="bg-card border-border focus:border-primary resize-none text-sm md:text-base"
                />
              </div>

              {/* Photo uploads */}
              <div>
                <label className="font-body text-xs md:text-sm text-muted-foreground uppercase tracking-wider block mb-1.5 md:mb-2">
                  Upload Photos of Your Shoes
                </label>
                <p className="font-body text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">
                  Clear photos help us assess the condition of your shoes and provide an accurate quote.
                </p>
                <p className="font-body text-[11px] md:text-xs text-muted-foreground mb-3">
                  Suggested views: left side, right side, front, back/heel, soles, and any damage areas.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photos.length >= MAX_PHOTOS}
                  className="w-full flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-card hover:border-primary hover:bg-card/80 transition-colors p-5 md:p-6 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ImagePlus className="w-6 h-6 text-primary" />
                  <span className="font-body text-sm text-foreground">
                    {photos.length === 0 ? "Tap to add photos" : "Add more photos"}
                  </span>
                  <span className="font-body text-[11px] text-muted-foreground">
                    JPG, PNG, HEIC or WEBP · up to 10 MB each · {photos.length}/{MAX_PHOTOS}
                  </span>
                </button>

                {photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {photos.map((p, i) => (
                      <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-muted border border-border">
                        <img
                          src={p.previewUrl}
                          alt={`Upload preview ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={`Remove photo ${i + 1}`}
                          className="absolute top-1 right-1 bg-background/90 hover:bg-background border border-border rounded-full p-1 shadow"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="hero"
                className="w-full sm:w-auto h-11 md:h-12"
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

              <p className="font-body text-[10px] md:text-xs text-muted-foreground">
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
