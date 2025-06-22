import { Hono } from "hono";
import { getCfImageOptions } from "./cf-image";

type Environment = {
	Bindings: {
		TRAQ_ORIGIN: string;
	};
};

const app = new Hono<Environment>();

app.get("/icon/:username", async (c) => {
	const origin = c.env.TRAQ_ORIGIN;
	const username = c.req.param("username");
	const requestUrl = `${origin}/api/v3/public/icon/${username}`;

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
	return new Response(res.body, res);
});

export default app;
