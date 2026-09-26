import { renderAppIcon } from "@/lib/icon-response";

export function GET() {
  return renderAppIcon(512, { maskable: true });
}
