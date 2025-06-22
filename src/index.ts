import { Hono } from "hono";
import { getCfImageOptions } from "./cf-image";

type Environment = {
	Bindings: {
		TRAQ_ORIGIN: string;
	};
};

const app = new Hono<Environment>();

app.get("/icon/:username", async (c) => {
	try {
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
		return res;
	} catch (err) {
		console.error("Error fetching icon:", err);
		return c.text("Internal Server Error", 500);
	}
});

export default app;
