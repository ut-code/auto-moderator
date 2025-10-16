export type UUID = ReturnType<typeof crypto.randomUUID>;

// notion name -> discord name
export const nameMap = new Map<string, `${number}`>([
  // 運営
  ["Ryuhei TAKANAKA", "905761740665528370"],

  // 運営ではないけど運営タスクに名前のある人
  ["川端 悠斗", "943071631167860756"],
]);

// notion id -> discord id
export const idMap = new Map<UUID, `${number}`>([
  // 柴山 慧一郎
  ["57a59982-d155-41f6-bd2c-17ae71c07b3e", "660420646261489674"],

  // 大矢 宏輝
  ["17c5ee7e-e899-48a6-b766-893d42812f99", "735679928007131213"],

  // 安村 拓也
  ["e2584440-8f00-4e2e-98c8-ab1fcc9fd8ca", "1225332719068643424"],

  // 小林 由暉
  ["6ae4d1f2-f45d-4603-9c99-adaacb7f071a", "502798784959479808"],

  // 中村 渉吾
  ["bd95e514-0177-4688-bd77-c259abc90801", "703588743738687488"],

  // 眞鍋 快地
  ["c7c551dc-3872-4dd7-b957-a61477c2d4a6", "1119186793099710514"],
]);
