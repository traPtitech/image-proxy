import { Hono } from "hono";
import { getCfImageOptions } from "./cf-image";
import { ResponseHeader } from "hono/utils/headers";

const app = new Hono();

const wrapResponseWithCacheHeader = (
	response: Response,
	cacheStatus: "HIT" | "MISS",
): Response => {
	const headers = new Headers(response.headers);
	headers.set("X-Image-Proxy-Cache", cacheStatus);
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
};

const fetchOrCache = async (
	request: Request,
	fetcher: (request: Request) => Promise<Response>,
) => {
	const cacheResponse = await caches.default.match(request);
	if (cacheResponse) {
		return wrapResponseWithCacheHeader(cacheResponse, "HIT");
	}
	const response = await fetcher(request);
	if (200 <= response.status && response.status < 300) {
		await caches.default.put(request, response.clone());
	}
	return wrapResponseWithCacheHeader(response, "MISS");
};

app.get("/icon/:username", async (c) => {
	const username = c.req.param("username");
	const requestUrl = `https://q.trap.jp/api/v3/public/icon/${username}`;

	const imageOptions = getCfImageOptions(c.req.url);
	const requestHeaders = new Headers();
	requestHeaders.set("User-Agent", "traP Image Proxy");

	const imageRequest = new Request(requestUrl, { headers: requestHeaders });

	const options: RequestInit<CfProperties> = {
		cf: { image: imageOptions },
	};

	const res = await fetchOrCache(imageRequest, (req) => fetch(req, options));

	if (res.status === 304) {
		return c.body(null, 304);
	}

	const responseHeaders: Partial<Record<ResponseHeader, string>> = {
		"Cache-Control": "public, max-age=3600, s-maxage=3600",
		"Content-Type": res.headers.get("Content-Type") ?? undefined,
	};

	return c.body(await res.arrayBuffer(), 200, responseHeaders);
});

export default app;
