import { APP_BRAND } from "@/config/app-brand";
import { buildPwaManifest } from "@/lib/pwa-manifest";

// Keep the public manifest payload unchanged; the root server layout owns its
// single link, independent of streamed metadata on dynamic booking pages.
export function GET() {
  return Response.json(buildPwaManifest({ appName: APP_BRAND.appName }), {
    headers: { "Content-Type": "application/manifest+json" }
  });
}
