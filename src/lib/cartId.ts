const CART_KEY = "cmk_cart_id";

function maybeAdoptResumeCart() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const resume = params.get("resumeCart");
  if (resume && /^[0-9a-f-]{36}$/i.test(resume)) {
    localStorage.setItem(CART_KEY, resume);
    params.delete("resumeCart");
    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState({}, "", newUrl);
  }
}

export function getCartId(): string {
  if (typeof window === "undefined") return "ssr";
  maybeAdoptResumeCart();
  let id = localStorage.getItem(CART_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CART_KEY, id);
  }
  return id;
}

export function clearCartId() {
  if (typeof window !== "undefined") localStorage.removeItem(CART_KEY);
}