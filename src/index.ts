import { Context, Hono } from "hono";
import { getCfImageOptions } from "./cf-image";
import { ResponseHeader } from "hono/utils/headers";
import { BlankEnv, BlankInput } from "hono/types";

const app = new Hono();

app.get(
	"/icon/:username",
	(c) => responseIconWithCacheControl(c, "https://q.trap.jp"),
);
app.get(
	"/ex-icon/:username",
	(c) => responseIconWithCacheControl(c, "https://q.ex.trap.jp"),
);

const responseIconWithCacheControl = async (
	c: Context<BlankEnv, "/icon/:username", BlankInput>,
	origin: string,
) => {
	const username = c.req.param("username");
	const requestUrl = `${origin}/api/v3/public/icon/${username}`;

	const imageOptions = getCfImageOptions(c.req.url);
	const requestHeaders = new Headers();
	requestHeaders.set("User-Agent", "traP Image Proxy");

	const imageRequest = new Request(requestUrl, { headers: requestHeaders });

	const options: RequestInit<CfProperties> = {
		cf: { image: imageOptions },
	};

	const res = await fetch(imageRequest, options);

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
