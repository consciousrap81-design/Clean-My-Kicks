import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, Facebook, Share2, Twitter } from "lucide-react";
import { toast } from "sonner";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title, url }); } catch {}
    } else {
      copy();
    }
  }

  const enc = encodeURIComponent;
  const tw = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1">Share:</span>
      <Button type="button" variant="outline" size="sm" onClick={nativeShare} aria-label="Share">
        <Share2 className="w-4 h-4" />
      </Button>
      <Button type="button" variant="outline" size="sm" asChild aria-label="Share on X">
        <a href={tw} target="_blank" rel="noopener noreferrer"><Twitter className="w-4 h-4" /></a>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild aria-label="Share on Facebook">
        <a href={fb} target="_blank" rel="noopener noreferrer"><Facebook className="w-4 h-4" /></a>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={copy} aria-label="Copy link">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}