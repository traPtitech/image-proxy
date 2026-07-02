import { Context, Hono } from "hono";
import { getCfImageOptions } from "./cf-image";
import { ResponseHeader } from "hono/utils/headers";
import { BlankEnv, BlankInput } from "hono/types";
import { optimizeImage } from "wasm-image-optimization";

const app = new Hono();

const maxAge = 60 * 60 * 24; // 1 day
const sMaxAge = 60 * 60 * 24 * 30; // 30 days
const staleWhileRevalidate = 60 * 60 * 24 * 365; // 1 year
const IMAGE_CACHE_CONTROL =
	`public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`;

app.get("/icon/:username", (c) =>
	responseImageWithCacheControl(
		c,
		`https://q.trap.jp/api/v3/public/icon/${
			encodeURIComponent(c.req.param("username"))
		}`,
	));
app.get("/ex-icon/:username", (c) =>
	responseImageWithCacheControl(
		c,
		`https://q.ex.trap.jp/api/v3/public/icon/${
			encodeURIComponent(c.req.param("username"))
		}`,
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
		cf: {
			image: imageOptions,
			cacheEverything: true,
			cacheControl: IMAGE_CACHE_CONTROL,
		},
	};

	const res = await fetch(imageRequest, options);
	if (!res.ok) {
		// Image Transformation limit exceeded
		// or any other errors occurred during image processing
		if (res.headers.get("cf-resized")?.startsWith("err=")) {
			const cache = await caches.open("img");

			const cacheKey = requestUrl + JSON.stringify(imageOptions);
			const cachedResponse = await cache.match(cacheKey);
			if (cachedResponse) return cachedResponse;

			const originalResponse = await fetch(requestUrl, {
				redirect: "manual",
				headers: requestHeaders,
			});

			if (originalResponse.status !== 200) {
				return c.body(null, 500);
			}

			const originalImage = await originalResponse.arrayBuffer();

			const responseHeaders: Partial<Record<ResponseHeader, string>> = {
				"Cache-Control": IMAGE_CACHE_CONTROL,
				"Content-Type":
					["jpeg", "png", "webp", "avif"].includes(imageOptions.format ?? "")
						? "image/" + imageOptions.format
						: originalResponse.headers.get("Content-Type") ??
							undefined,
			};

			try {
				const optimizedImage = await optimizeImage({
					image: originalImage,
					width: imageOptions.width,
					height: imageOptions.height,
					quality: typeof imageOptions.quality === "number"
						? imageOptions.quality
						: undefined,
					format:
						["jpeg", "png", "webp", "avif"].includes(imageOptions.format ?? "")
							? (imageOptions.format as "jpeg" | "png" | "webp" | "avif")
							: undefined,
					animation: true,
				});
				const response = new Response(optimizedImage.data, {
					headers: responseHeaders,
				});
				c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
				return response;
			} catch (e) {
				// If optimization fails, log the error and return the original image
				console.error("Image optimization failed:", e);
				return new Response(originalImage, {
					headers: {
						"Cache-Control": IMAGE_CACHE_CONTROL,
						"Content-Type": originalResponse.headers.get("Content-Type") ??
							"image/*",
					},
				});
			}
		}

		return c.body(null, res.status === 404 ? 404 : 500);
	}

	const responseHeaders: Partial<Record<ResponseHeader, string>> = {
		"Cache-Control": IMAGE_CACHE_CONTROL,
		"Content-Type": res.headers.get("Content-Type") ?? undefined,
	};

	if (res.status === 304) {
		return c.body(null, 304, responseHeaders);
	}

	return c.body(await res.arrayBuffer(), 200, responseHeaders);
};

export default app;
