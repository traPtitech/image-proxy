import { Context, Hono } from "hono";
import { getCfImageOptions } from "./cf-image";
import { ResponseHeader } from "hono/utils/headers";
import { BlankEnv, BlankInput } from "hono/types";
import { optimizeImage } from "wasm-image-optimization";

const app = new Hono();

app.get("/icon/:username", (c) =>
	responseImageWithCacheControl(
		c,
		`https://q.trap.jp/api/v3/public/icon/${c.req.param("username")}`,
	));
app.get("/ex-icon/:username", (c) =>
	responseImageWithCacheControl(
		c,
		`https://q.ex.trap.jp/api/v3/public/icon/${c.req.param("username")}`,
	));
app.get("/stamp/:stampId", (c) =>
	responseImageWithCacheControl(
		c,
		`https://q.trap.jp/api/1.0/public/emoji/${c.req.param("stampId")}`,
	));

const responseImageWithCacheControl = async (
	c: Context<BlankEnv, "", BlankInput>,
	requestUrl: string,
) => {
	const imageOptions = getCfImageOptions(c.req.url);
	const requestHeaders = new Headers();
	requestHeaders.set("User-Agent", "traP Image Proxy");

	const imageRequest = new Request(requestUrl, { headers: requestHeaders });

	const options: RequestInit<CfProperties> = {
		cf: { image: imageOptions },
	};

	const res = await fetch(imageRequest, options);
	if (!res.ok) {
		// Image Transformation limit exceeded
		if (res.status === 429 && res.headers.get("cf-resized") === "err=9422") {
			const cache = await caches.open("img");

			const cacheKey = requestUrl + JSON.stringify(imageOptions);
			const cachedResponse = await cache.match(cacheKey);
			if (cachedResponse) return cachedResponse;

			const originalResponse = await fetch(imageRequest, {
				cf: { cacheKey },
				redirect: "manual",
			});
			console.log(originalResponse.status, [
				...originalResponse.headers.entries(),
			]);

			const body = await originalResponse.arrayBuffer();
			const responseHeaders: Partial<Record<ResponseHeader, string>> = {
				"Cache-Control": "public, max-age=3600, s-maxage=3600",
				"Content-Type": originalResponse.headers.get("Content-Type") ??
					undefined,
			};

			const image = await optimizeImage({
				image: body,
				width: imageOptions.width,
				height: imageOptions.height,
				quality: typeof imageOptions.quality === "number"
					? imageOptions.quality
					: undefined,
				format:
					["jpeg", "png", "webp", "avif"].includes(imageOptions.format ?? "")
						? (imageOptions.format as "jpeg" | "png" | "webp" | "avif")
						: undefined,
			});

			const response = new Response(image, { headers: responseHeaders });
			c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
			return response;
		}

		return c.body(null, res.status === 404 ? 404 : 500);
	}

	const responseHeaders: Partial<Record<ResponseHeader, string>> = {
		"Cache-Control": "public, max-age=3600, s-maxage=3600",
		"Content-Type": res.headers.get("Content-Type") ?? undefined,
	};

	if (res.status === 304) {
		return c.body(null, 304, responseHeaders);
	}

	return c.body(await res.arrayBuffer(), 200, responseHeaders);
};

export default app;
