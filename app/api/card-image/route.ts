import { NextResponse } from "next/server";

const POKEWALLET = "https://api.pokewallet.io";

type Lang = "fr" | "en" | "ja" | "zh-tw";

function norm(v: unknown) {
  return String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function number(v: unknown) {
  return String(v ?? "").trim().split("/")[0].replace(/^0+(?=\d)/, "").toUpperCase();
}
function languageCompatible(item: any, lang: Lang) {
  if (lang === "en") return true;
  const langs = Array.isArray(item?.images?.languages)
    ? item.images.languages.map((v: unknown) => String(v).toLowerCase())
    : [];
  // Les Cardmarket-only JP/CN n'exposent pas toujours images.languages ; dans
  // ce cas le code de set exact reste le verrou principal.
  if (!langs.length) return true;
  if (lang === "fr") return langs.some((v: string) => ["fr", "fra", "french"].includes(v));
  if (lang === "ja") return langs.some((v: string) => ["ja", "jap", "jp", "japanese"].includes(v));
  return langs.some((v: string) => ["zh", "chn", "zh-tw", "chinese"].includes(v));
}

export async function GET(request: Request) {
  const key = process.env.POKEWALLET_API_KEY;
  if (!key) return new NextResponse(null, { status: 404 });

  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId") ?? "";
  const cardNumber = searchParams.get("number") ?? "";
  const name = searchParams.get("name") ?? "";
  const lang = (searchParams.get("lang") ?? "en") as Lang;
  if (!setId || !cardNumber) return new NextResponse(null, { status: 400 });

  try {
    // Ne jamais rendre le nom obligatoire : PokéWallet indexe souvent les cartes
    // JP/CN sous un nom différent de TCGdex. set + numéro sont l'identité forte.
    const queries = Array.from(new Set([
      `${setId} ${cardNumber}`,
      name ? `${name} ${cardNumber}` : "",
    ].filter(Boolean)));

    let match: any = null;
    for (const q of queries) {
      const search = await fetch(`${POKEWALLET}/search?q=${encodeURIComponent(q)}&limit=100`, {
        headers: { "X-API-Key": key, Accept: "application/json" },
        next: { revalidate: 86400 },
      });
      if (!search.ok) continue;
      const json = await search.json();
      const items = Array.isArray(json?.results) ? json.results : [];
      match = items.find((item: any) =>
        norm(item?.card_info?.set_code) === norm(setId) &&
        number(item?.card_info?.card_number) === number(cardNumber) &&
        languageCompatible(item, lang)
      );
      if (match?.id) break;
    }
    if (!match?.id) return new NextResponse(null, { status: 404 });

    const image = await fetch(`${POKEWALLET}/images/${encodeURIComponent(match.id)}?size=high`, {
      headers: { "X-API-Key": key },
      next: { revalidate: 86400 },
    });
    if (!image.ok) return new NextResponse(null, { status: 404 });
    const bytes = await image.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": image.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
