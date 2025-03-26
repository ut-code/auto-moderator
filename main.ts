import * as v from "valibot";
import { queryNotion, retry, webhook } from "./io.ts";
import { NotionFetchResponse, type Task } from "./validator.ts";

/*
API REFERENCE:
https://developers.notion.com/docs/working-with-databases
*/

// the url is safe to publish.
const NOTION_TASK_PAGE_URL = "https://www.notion.so/utcode/e8d7215fb5224be4a9a3e7d3be4d41ff";
const DAY = 24 * 60 * 60 * 1000;

const query = {
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
};

function formatTask(task: Task) {
  const due = task.properties.期日?.date.start;
  const title = task.properties.タイトル?.title.map((title) => title.plain_text).join("");
  const assignee = task.properties.担当者?.people.map((person) => person.name).join(" / @");

  if (!assignee) {
    return `・【${due}】${title} (担当者不在)`;
  }
  return `・【${due}】${title} @${assignee}`;
}
/**
  - @throws on NetworkError and ParseError
 */
async function main() {
  const res = await queryNotion(query);
  const json = v.parse(NotionFetchResponse, await res.json());
  const tasks = json.results.map(formatTask);

  if (tasks.length === 0) return "本日は期限が迫っているタスクはありませんでした。";
  return `
3日以内に期限が迫っているタスクがあります！
${tasks.join("\n")}

完了したら、タスクを対応済みにしてください。
<${NOTION_TASK_PAGE_URL}>
`.trim();
}

const result = await retry(3, async () => await main());
if (typeof result === "string") {
  await webhook(result);
} else {
  await webhook(`Auto Moderator の実行に失敗しました: ${result.message}`);
  process.exit(1);
}
