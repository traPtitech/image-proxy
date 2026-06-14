import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";

const originalFetch = globalThis.fetch;

describe("image proxy", () => {
	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("keeps encoded hash characters in icon usernames when fetching origin", async () => {
		const fetchMock = vi.fn(async () =>
			new Response(new Uint8Array([1, 2, 3]), {
				headers: { "Content-Type": "image/png" },
			})
		);
		globalThis.fetch = fetchMock as typeof fetch;

		const response = await worker.request(
			"https://image-proxy.example/icon/Webhook%23abcdefg",
		);

		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledOnce();
		const [originRequest] = fetchMock.mock.calls[0];
		expect(originRequest).toBeInstanceOf(Request);
		expect((originRequest as Request).url).toBe(
			"https://q.trap.jp/api/v3/public/icon/Webhook%23abcdefg",
		);
	});

	it("keeps encoded hash characters in ex-icon usernames when fetching origin", async () => {
		const fetchMock = vi.fn(async () =>
			new Response(new Uint8Array([1, 2, 3]), {
				headers: { "Content-Type": "image/png" },
			})
		);
		globalThis.fetch = fetchMock as typeof fetch;

		const response = await worker.request(
			"https://image-proxy.example/ex-icon/Webhook%23abcdefg",
		);

		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledOnce();
		const [originRequest] = fetchMock.mock.calls[0];
		expect(originRequest).toBeInstanceOf(Request);
		expect((originRequest as Request).url).toBe(
			"https://q.ex.trap.jp/api/v3/public/icon/Webhook%23abcdefg",
		);
	});
});
