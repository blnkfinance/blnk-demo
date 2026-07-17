import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/bootstrap"];

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("admin_auth_token")?.value;
  const isPublicPage = PUBLIC_PATHS.includes(req.nextUrl.pathname);

  if (!token && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && !isPublicPage) {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const redirect = NextResponse.redirect(new URL("/login", req.url));
        redirect.cookies.delete("admin_auth_token");
        return redirect;
      }
    } catch {
      // If API is unreachable, allow through and let pages surface errors.
    }
  }

  if (token && isPublicPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
