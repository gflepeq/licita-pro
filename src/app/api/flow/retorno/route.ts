import { NextResponse, type NextRequest } from "next/server";
import { flowGetStatus } from "@/lib/flow";

// Retorno del navegador tras el pago (urlReturn). Flow envía el token por POST.
async function handle(req: NextRequest, token: string) {
  const dest = new URL("/dashboard/configuracion", req.nextUrl.origin);
  const status = token ? await flowGetStatus(token) : null;
  dest.searchParams.set("pago", status?.status === 2 ? "ok" : "error");
  return NextResponse.redirect(dest, 303);
}

export async function POST(req: NextRequest) {
  let token = "";
  try {
    token = String((await req.formData()).get("token") ?? "");
  } catch {}
  return handle(req, token);
}

export async function GET(req: NextRequest) {
  return handle(req, req.nextUrl.searchParams.get("token") ?? "");
}
