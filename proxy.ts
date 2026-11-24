import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isAllowedOrigin(originHeader: string, hostHeader: string): boolean {
	try {
		const originUrl = new URL(originHeader);
		const origin = originUrl.host.toLowerCase();
		if (origin === hostHeader.toLowerCase()) return true;
		// Behind a proxy (Firebase App Hosting, Cloud Run) the Host header is the
		// internal service host, so also accept the canonical BASE_URL host.
		const baseUrl = process.env.BASE_URL;
		return Boolean(baseUrl) && origin === new URL(baseUrl!).host.toLowerCase();
	} catch {
		return false;
	}
}

export function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
	const isStaticAsset =
		pathname.startsWith("/_next/") ||
		pathname === "/favicon.ico" ||
		/\.[^/]+$/.test(pathname);

	if (isStaticAsset) {
		return NextResponse.next();
	}

	if (pathname.startsWith("/api/") && pathname !== "/api/webhook/github" && request.method !== "GET") {
		const originHeader = request.headers.get("Origin");
		const hostHeader = request.headers.get("Host");
		if (!originHeader || !hostHeader || !isAllowedOrigin(originHeader, hostHeader)) {
			return new NextResponse(null, {
				status: 403
			});
		}
	}

	const requestHeaders = new Headers(request.headers);
	const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
	requestHeaders.set("x-return-to", returnTo);

	return NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});
}

export const config = {
	matcher: "/:path*"
}
