type AvailableImageFormat =
	| "avif"
	| "webp"
	| "json"
	| "jpeg"
	| "png"
	| "baseline-jpeg"
	| "png-force"
	| "svg";

const imageFormatPriorities = [
	"webp",
	"jpeg",
	"png",
] satisfies AvailableImageFormat[];

const availableImageFormats: AvailableImageFormat[] = [
	"avif",
	"webp",
	"json",
	"jpeg",
	"png",
	"baseline-jpeg",
	"png-force",
	"svg",
];

const parseImageFormat = (
	format: string | null,
): AvailableImageFormat | undefined => {
	if (availableImageFormats.includes(format as AvailableImageFormat)) {
		return format as AvailableImageFormat;
	}
	return undefined;
};

const parseIntOrUndefined = (
	value: string | null,
): number | undefined => {
	if (value === null) return undefined;
	const parsed = Number.parseInt(value);
	return Number.isNaN(parsed) ? undefined : parsed;
};

export const getCfImageOptions = (
	url: string,
): RequestInitCfPropertiesImage => {
	const parsedUrl = new URL(url);
	const searchParams = parsedUrl.searchParams;
	const width = parseIntOrUndefined(searchParams.get("width"));
	const height = parseIntOrUndefined(searchParams.get("height"));
	const quality = parseIntOrUndefined(searchParams.get("quality"));
	const format = parseImageFormat(searchParams.get("format"));

	const options: RequestInitCfPropertiesImage = {
		fit: "scale-down",
		width,
		height,
		quality,
		format,
	};

	return options;
};
