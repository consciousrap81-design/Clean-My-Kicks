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
    <section className="bg-slate-100 border-y border-slate-200 py-3 md:py-4">
      <div className="container px-4">
        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-12">
          {trustItems.map((item, index) => (
            <div
              key={item.text}
              className="flex items-center gap-1.5 md:gap-2 text-foreground"
            >
              <item.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              <span className="font-body text-xs md:text-sm uppercase tracking-wider">
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
