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
        期日: v.union([NotionTypes.date, v.undefined()]),
        タイトル: v.union([NotionTypes.title, v.undefined()]),
        担当者: v.union([NotionTypes.people, v.undefined()]),
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

  const promises = json.results.map(async (result) => {
    const due = result.properties.期日?.date.start;
    const title = result.properties.タイトル?.title.map((title) => title.plain_text).join("");
    const assignee = result.properties.担当者?.people.map((person) => person.name).join(" / ");

    if (!assignee) {
      return `・【${due}】${title}`;
    }
    return `・【${due}】${title} # @${assignee}`;
  });
  const tasks = await Promise.all(promises);

  let message =
    json.results.length === 0
      ? "本日は期限が迫っているタスクはありませんでした。"
      : `
3日以内に期限が迫っているタスクがあります！
${tasks.join("\n")}

完了したら、タスクを対応済みにしてください。
<<${NOTION_TASK_PAGE_URL}|運営タスク>>
`.trim();

  if (tc.hasFailed()) message += `\n---\n 一つ以上の型チェックが失敗しました: ${tc.errors}`;
  return message;
}

const result = await retry(3, async () => await main());
if (typeof result === "string") {
  await webhook(result);
} else {
  await webhook(`Auto Moderator の実行に失敗しました: ${result.message}`);
}

// lib section

async function retry(count: number, func: () => Promise<string>): Promise<string | Error> {
  let err: Error = new Error("失敗していません");
  for (const _ of new Array(count).fill(0)) {
    try {
      return await func();
    } catch (e) {
      console.error(e);
      err = e as Error;
    }
  }
  return err;
}

async function webhook(message: string) {
  // not appending this to messages, as it includes secrets
  const { err, val: webhookURL } = check("env SLACK_WEBHOOK_URL", process.env.SLACK_WEBHOOK_URL, Url);
  if (err) {
    console.error(`Failed to parse webhook. first and last characters are as follows.
		first: ${webhookURL.at(0)}
		last: ${webhookURL.at(-1)}`);
  }
  await fetch(webhookURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}
