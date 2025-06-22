import { Hono } from "hono";
import { getCfImageOptions } from "./cf-image";
import { ResponseHeader } from "hono/utils/headers";

const app = new Hono();

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

	const res = await fetch(imageRequest, options);

	const responseHeaders: Partial<
		Record<ResponseHeader | "X-Image-Proxy-Cache", string>
	> = {
		"Cache-Control": "public, max-age=3600, s-maxage=3600",
		"Content-Type": res.headers.get("Content-Type") ?? undefined,
	};

	if (res.status === 304) {
		return c.body(null, 304, responseHeaders);
	}

	return c.body(await res.arrayBuffer(), 200, responseHeaders);
});

export default app;
