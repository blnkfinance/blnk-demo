import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const token = req.cookies.get("customer_auth_token")?.value;
  const isPublic = PUBLIC.some((p) => req.nextUrl.pathname === p);

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && isPublic) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
