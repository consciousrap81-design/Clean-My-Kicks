export type ProductTemplate = {
  id: string;
  label: string;
  brand: string;
  model: string;
  size: string;
  condition: string;
  price: number;
  description: string;
};

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  // Jordan
  { id: "aj1-high-og", label: "Air Jordan 1 High OG", brand: "Jordan", model: "1 High OG", size: "10", condition: "Like New", price: 220,
    description: "Restored Air Jordan 1 High OG. Full midsole repaint, lace swap, deep clean of leather uppers, and sole edge re-blacked. Disclosed flaws (if any) in photos." },
  { id: "aj1-mid", label: "Air Jordan 1 Mid", brand: "Jordan", model: "1 Mid", size: "10", condition: "Lightly Used", price: 140,
    description: "Restored Air Jordan 1 Mid. Cleaned uppers, fresh laces, and midsole touch-up. Ready to wear." },
  { id: "aj3-retro", label: "Air Jordan 3 Retro", brand: "Jordan", model: "3 Retro", size: "10", condition: "Lightly Used", price: 200,
    description: "Restored Air Jordan 3 Retro. Elephant print cleaned, midsole repainted, and outsole detailed." },
  { id: "aj4-retro", label: "Air Jordan 4 Retro", brand: "Jordan", model: "4 Retro", size: "10", condition: "Like New", price: 230,
    description: "Restored Air Jordan 4 Retro. Mesh refreshed, midsole repaint, and wings re-detailed." },
  { id: "aj5-retro", label: "Air Jordan 5 Retro", brand: "Jordan", model: "5 Retro", size: "10", condition: "Lightly Used", price: 210,
    description: "Restored Air Jordan 5 Retro. Shark-tooth midsole repainted and reflective tongue cleaned." },
  { id: "aj11-retro", label: "Air Jordan 11 Retro", brand: "Jordan", model: "11 Retro", size: "10", condition: "Like New", price: 260,
    description: "Restored Air Jordan 11 Retro. Patent leather polished, mesh cleaned, and icy soles brightened where possible." },
  { id: "aj12-retro", label: "Air Jordan 12 Retro", brand: "Jordan", model: "12 Retro", size: "10", condition: "Lightly Used", price: 190,
    description: "Restored Air Jordan 12 Retro. Tumbled leather conditioned and midsole touched up." },
  { id: "aj13-retro", label: "Air Jordan 13 Retro", brand: "Jordan", model: "13 Retro", size: "10", condition: "Lightly Used", price: 200,
    description: "Restored Air Jordan 13 Retro. Holographic eye cleaned and quilted side panels detailed." },

  // Nike
  { id: "af1-low", label: "Nike Air Force 1 Low", brand: "Nike", model: "Air Force 1 Low", size: "10", condition: "Like New", price: 130,
    description: "Restored Air Force 1 Low. Full leather clean, midsole repaint, and fresh laces. Ready to wear." },
  { id: "af1-mid", label: "Nike Air Force 1 Mid", brand: "Nike", model: "Air Force 1 Mid", size: "10", condition: "Lightly Used", price: 140,
    description: "Restored Air Force 1 Mid. Strap and ankle collar cleaned, midsole repainted." },
  { id: "dunk-low", label: "Nike Dunk Low", brand: "Nike", model: "Dunk Low", size: "10", condition: "Lightly Used", price: 160,
    description: "Restored Nike Dunk Low. Panels cleaned, midsole repainted, and lace swap." },
  { id: "dunk-high", label: "Nike Dunk High", brand: "Nike", model: "Dunk High", size: "10", condition: "Lightly Used", price: 170,
    description: "Restored Nike Dunk High. Ankle collar cleaned, midsole touched up, and outsole detailed." },
  { id: "blazer-mid", label: "Nike Blazer Mid '77", brand: "Nike", model: "Blazer Mid '77", size: "10", condition: "Good Used", price: 110,
    description: "Restored Blazer Mid '77. Vintage suede brushed, swoosh cleaned, and outsole detailed." },
  { id: "airmax90", label: "Nike Air Max 90", brand: "Nike", model: "Air Max 90", size: "10", condition: "Lightly Used", price: 140,
    description: "Restored Air Max 90. Mesh refreshed, mudguard cleaned, and visible air unit detailed." },
  { id: "airmax95", label: "Nike Air Max 95", brand: "Nike", model: "Air Max 95", size: "10", condition: "Lightly Used", price: 160,
    description: "Restored Air Max 95. Gradient panels cleaned and midsole repainted where needed." },
  { id: "airmax97", label: "Nike Air Max 97", brand: "Nike", model: "Air Max 97", size: "10", condition: "Lightly Used", price: 170,
    description: "Restored Air Max 97. Reflective uppers cleaned and full-length air unit detailed." },
];