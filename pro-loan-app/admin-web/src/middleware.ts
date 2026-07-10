import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/bootstrap"];

export function middleware(req: NextRequest) {
  const token = req.cookies.get("admin_auth_token")?.value;
  const isPublicPage = PUBLIC_PATHS.includes(req.nextUrl.pathname);

  if (!token && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && isPublicPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
