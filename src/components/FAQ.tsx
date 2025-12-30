import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What's included in the Basic Clean?",
    answer:
      "Our Basic Clean includes exterior wipe-down, light stain removal, lace cleaning, and deodorizing. It's perfect for regular maintenance and keeping your kicks fresh between deeper cleans.",
  },
  {
    question: "How long does each service take?",
    answer:
      "Basic Clean takes 3-5 business days, Deep Clean takes 2-3 business days, and Restoration timelines vary based on the work needed—typically 5-10 business days. Rush services are available for an additional fee.",
  },
  {
    question: "Do you clean all sneaker brands?",
    answer:
      "Yes! We clean all major brands including Nike, Jordan, Adidas, Yeezy, New Balance, Asics, Puma, and more. We're experienced with all materials including leather, suede, nubuck, mesh, and knit.",
  },
  {
    question: "What's the difference between Deep Clean and Restoration?",
    answer:
      "Deep Clean is a thorough cleaning of all surfaces including soles and insoles. Restoration goes further with services like sole whitening, paint touch-ups, re-gluing, and repairing damaged areas to bring worn sneakers back to life.",
  },
  {
    question: "How do I drop off my sneakers?",
    answer:
      "You have three options: Drop-off at our location during business hours, schedule a pickup service in the local area, or mail your sneakers to us using our prepaid shipping label. Select your preference when booking.",
  },
  {
    question: "What if I'm not satisfied with the results?",
    answer:
      "Your satisfaction is our priority. If you're not happy with the results, let us know within 48 hours of receiving your sneakers and we'll re-clean them at no additional charge.",
  },
  {
    question: "Do you offer any discounts for multiple pairs?",
    answer:
      "Yes! We offer a 10% discount when you bring in 3+ pairs at once. We also have a loyalty program—every 5th clean is 20% off. Follow us on social media for exclusive promotions.",
  },
  {
    question: "Are my sneakers insured while in your care?",
    answer:
      "Absolutely. All sneakers are insured up to $500 while in our possession. For high-value sneakers, please let us know at drop-off so we can arrange additional coverage if needed.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-20 md:py-32 bg-secondary/30">
      <div className="container px-4">
        <div className="text-center mb-16">
          <span className="text-primary font-body text-sm uppercase tracking-widest">
            FAQ
          </span>
          <h2 className="font-display text-4xl md:text-6xl text-foreground mt-4">
            COMMON QUESTIONS
          </h2>
          <p className="font-body text-muted-foreground max-w-2xl mx-auto mt-4">
            Got questions? We've got answers. Here's everything you need to know.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/50 transition-colors"
              >
                <AccordionTrigger className="font-display text-foreground text-left hover:no-underline hover:text-primary py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="font-body text-muted-foreground pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
