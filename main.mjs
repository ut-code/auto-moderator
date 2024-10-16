const response = await fetch(
  "https://api.notion.com/v1/databases/e8d7215f-b522-4be4-a9a3-e7d3be4d41ff/query",
  {
    method: "POST",
    headers: {
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    },
    body: JSON.stringify({
      filter: {
        and: [
          {
            property: "期日",
            date: {
              before: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                .toISOString()
                .match(/^\d{4}-\d{2}-\d{2}/)[0],
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
    }),
  }
);

const json = await response.json();
let message = "";
if (json.results.length === 0) {
  message = "本日は期限が迫っているタスクはありませんでした。";
} else {
  const tasks = json.results
    .map(
      (result) =>
        `・【${
          result.properties.期日.date.start
        }】${result.properties.タイトル.title
          .map((title) => title.plain_text)
          .join("")}`
    )
    .join("\n");
  message = `<!channel> 3日以内に期限が迫っているタスクがあります！\n${tasks}`;
}

await fetch(process.env.SLACK_WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: message }),
});
