import { Clock, ShieldCheck, MapPin } from "lucide-react";

const trustItems = [
  {
    icon: Clock,
    text: "Fast Turnaround",
  },
  {
    icon: ShieldCheck,
    text: "Trusted Care",
  },
  {
    icon: MapPin,
    text: "Denton/DFW Service",
  },
];

const TrustStrip = () => {
  return (
    <section className="bg-primary/10 border-y border-primary/20 py-4">
      <div className="container px-4">
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12">
          {trustItems.map((item, index) => (
            <div
              key={item.text}
              className="flex items-center gap-2 text-foreground"
            >
              <item.icon className="w-5 h-5 text-primary" />
              <span className="font-body text-sm uppercase tracking-wider">
                {item.text}
              </span>
              {index < trustItems.length - 1 && (
                <span className="hidden md:inline text-primary/50 ml-6">•</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;
