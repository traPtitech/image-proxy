import { Hono } from "hono";
import { getCfImageOptions } from "./cf-image";

const app = new Hono();

app.get("/icon/:username", async (c) => {
	const username = c.req.param("username");
	const requestUrl = `https://q.trap.jp/api/v3/public/icon/${username}`;

	const request = c.req.raw;
	const imageOptions = getCfImageOptions(c.req.url);
	const options: RequestInit<CfProperties> = {
		cf: {
			image: imageOptions,
		},
	};

	const imageRequest = new Request(requestUrl, {
		headers: request.headers,
	});

	const res = await fetch(imageRequest, options);
	return res;
});

export default app;
