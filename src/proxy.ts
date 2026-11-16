import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  const isAuthPage =
    pathname === "/login" || pathname === "/register";

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/sales/:path*",
    "/payments/:path*",
    "/products/:path*",
    "/customers/:path*",
    "/expenses/:path*",
    "/assistant/:path*",
    "/settings/:path*",
    "/more/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
  ],
};
