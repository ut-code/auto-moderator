import * as v from "valibot";
import { NotionTypes, TypeChecker, Url, check } from "./validator";

/*
API REFERENCE:
https://developers.notion.com/docs/working-with-databases
*/

// the url is safe to publish.
const NOTION_TASK_PAGE_URL = "https://www.notion.so/utcode/e8d7215fb5224be4a9a3e7d3be4d41ff";
const DAY = 24 * 60 * 60 * 1000;

const query = JSON.stringify({
	filter: {
		and: [
			{
				property: "期日",
				date: {
					before: new Date(Date.now() + 3 * DAY).toISOString().match(/^\d{4}-\d{2}-\d{2}/)?.[0],
				},
			},
			{
				property: "対応済",
				checkbox: {
					equals: false,
				},
			},
		],
	},
	sorts: [
		{
			property: "期日",
			direction: "ascending",
		},
	],
});

const NotionFetchResponse = v.object({
	results: v.array(
		v.object({
			properties: v.object({
				期日: NotionTypes.date,
				タイトル: NotionTypes.title,
				担当者: v.array(NotionTypes.user),
			}),
		}),
	),
});

async function main() {
	const tc = new TypeChecker();

	const response = await fetch("https://api.notion.com/v1/databases/e8d7215f-b522-4be4-a9a3-e7d3be4d41ff/query", {
		method: "POST",
		headers: {
			"Notion-Version": "2022-06-28",
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
		},
		body: query,
	});

	const json = tc.check("notion fetch response", await response.json(), NotionFetchResponse);

	const tasks = json.results
		.map((result) => {
			const due: string = result.properties.期日.date.start;
			const title: string = result.properties.タイトル.title.map((title) => title.plain_text).join("");
			const assignee: string = result.properties.担当者.map((u) => u.name).join(", ");

			return `・【${due}】${title} (${assignee})`;
		})
		.join("\n");
	let message =
		json.results.length === 0
			? "本日は期限が迫っているタスクはありませんでした。"
			: `
3日以内に期限が迫っているタスクがあります！
${tasks}

完了したら、タスクを対応済みにしてください。
> <${NOTION_TASK_PAGE_URL}|運営タスク>
`.trim();

	if (tc.hasFailed()) message += `---\n 一つ以上の型チェックが失敗しました: ${tc.errors}`;

	// not appending this to messages, as it includes secrets
	const { err, val: webhook } = check("env SLACK_WEBHOOK_URL", process.env.SLACK_WEBHOOK_URL, Url);
	if (err) {
		console.error(`Failed to parse webhook. first and last characters are as follows.
		first: ${webhook.at(0)}
		last: ${webhook.at(-1)}`);
	}
	await fetch(webhook, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ text: message }),
	});
}

for (const _ of new Array(3).fill(0)) {
	try {
		await main();
		break;
	} catch (err) {
		console.error(err);
	}
}
