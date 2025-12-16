import { Context, Hono } from "hono";
import { getCfImageOptions } from "./cf-image";
import { ResponseHeader } from "hono/utils/headers";
import { BlankEnv, BlankInput } from "hono/types";

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
		console.log(res.status, await res.text());

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
