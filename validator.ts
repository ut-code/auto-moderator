import * as v from "valibot";

/*
API REFERENCE:
https://developers.notion.com/docs/working-with-databases
*/

// never throws error.
export function checkType<S extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
	varName: string,
	val: unknown,
	schema: S,
) {
	type T = v.InferOutput<S>;
	const result = v.safeParse(schema, val);
	if (result.success) return result.output satisfies T;
	console.error(`WARNING: Failed to parse schema of ${varName}: \n- ${result.issues.join("\n- ")}`);
	return val as T; // just let it go until it crashes for `cannot access property of undefined` or worse, sends undefined to slack
}
export const Url = v.pipe(v.string(), v.url());

const NotionDate = v.object({
	type: v.literal("date"),
	date: v.object({
		start: v.pipe(v.string(), v.regex(/\d{4}-\d{2}-\d{2}/) /* yyyy-MM-dd */),
	}),
});
const NotionText = v.object({
	type: v.literal("text"),
	text: v.object({
		content: v.string(),
	}),
	plain_text: v.string(),
});
const NotionTitle = v.object({
	type: v.literal("title"),
	title: v.array(v.union([NotionText])),
});

// API REFERENCE[user]: https://developers.notion.com/reference/user
const NotionUser = v.object({
	type: v.union([v.literal("person"), v.literal("bot")]),
	name: v.string(),
}); // TODO

export const NotionTypes = {
	date: NotionDate,
	text: NotionText,
	title: NotionTitle,
	user: NotionUser,
};
