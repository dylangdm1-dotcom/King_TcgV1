import { NextResponse } from "next/server";

const TCGDEX = "https://api.tcgdex.net/v2";

function locales(locale: string): string[] {
  if (locale === "zh-tw") return ["zh-tw", "zh-cn"];
  if (locale === "zh-cn") return ["zh-cn", "zh-tw"];
  if (["fr", "en", "ja"].includes(locale)) return [locale];
  return ["en"];
}

function imageUrls(baseValue: unknown): string[] {
  const raw = String(baseValue ?? "").trim();
  if (!raw) return [];
  const base = raw
    .replace(/\/(high|low)(\.(png|webp|jpg|jpeg))?$/i, "")
    .replace(/\.(png|webp|jpg|jpeg)$/i, "");
  return Array.from(new Set([raw, `${base}/high.webp`, `${base}/high.png`, `${base}/low.webp`]));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = String(url.searchParams.get("locale") || "en").toLowerCase();
  const id = String(url.searchParams.get("id") || "").trim();
  if (!id) return new NextResponse(null, { status: 404 });

  for (const candidateLocale of locales(locale)) {
    try {
      const response = await fetch(`${TCGDEX}/${candidateLocale}/cards/${encodeURIComponent(id)}`, {
        cache: "force-cache",
      });
      if (!response.ok) continue;
      const card = await response.json();
      for (const imageUrl of imageUrls(card?.image)) {
        try {
          const imageResponse = await fetch(imageUrl, { cache: "force-cache" });
          if (!imageResponse.ok) continue;
          const contentType = imageResponse.headers.get("content-type") || "image/webp";
          return new NextResponse(imageResponse.body, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            },
          });
        } catch {}
      }
    } catch {}
  }

  return NextResponse.redirect(new URL("/placeholder.png", request.url), 307);
}
