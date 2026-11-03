export interface DemoReply {
  text: string;
  steps: string[];
  stats?: { label: string; value: string; detail?: string }[];
  rows?: { name: string; detail: string; value: string }[];
  action?: {
    kind: "points" | "redeem";
    title: string;
    description: string;
    details: { label: string; value: string }[];
    confirmLabel: string;
    successText: string;
  };
  suggestions: string[];
}

export const DEMO_PROMPTS: string[] = [
  "总结本周班级积分",
  "给第三组按作业完成规则加分",
  "帮林小满兑换一本笔记本",
];

const demoGroup = ["林小满", "陈予安", "周星禾", "许知夏", "沈一诺", "顾言"];

export function createDemoReply(prompt: string, className: string): DemoReply {
  const currentClass = className.trim() || "示例班级";

  if (/兑换|笔记本/.test(prompt)) {
    return {
      text: "可以，先确认一下这笔兑换。这里使用示例学生「林小满」和奖品「笔记本」，演示积分与库存的变化。",
      steps: ["查看示例学生积分", "检查示例奖品库存", "生成兑换预览"],
      action: {
        kind: "redeem",
        title: "兑换一本笔记本",
        description: "演示操作 · 确认后仅展示模拟结果。",
        details: [
          { label: "班级", value: `${currentClass} · 示例数据` },
          { label: "学生", value: "林小满 · 第三组" },
          { label: "奖品", value: "笔记本 × 1" },
          { label: "所需积分", value: "40 分" },
          { label: "可用积分", value: "128 → 88 分" },
          { label: "奖品库存", value: "12 → 11 本" },
        ],
        confirmLabel: "模拟确认兑换",
        successText: "模拟兑换完成：林小满用 40 分兑换了 1 本笔记本，示例可用积分为 88 分、库存为 11 本。真实积分、库存和订单均未修改。",
      },
      suggestions: ["查看林小满的积分", "总结本周班级积分"],
    };
  }

  if (/加分|加积分|作业完成/.test(prompt)) {
    return {
      text: "已按「作业完成」规则，为示例第三组生成加分预览。共 6 名学生，每人 +3 分，请核对下方名单后再确认。",
      steps: ["查看示例第三组名单", "匹配示例作业完成规则", "汇总积分变化"],
      rows: demoGroup.map((name) => ({
        name,
        detail: "第三组 · 作业完成",
        value: "+3 分",
      })),
      action: {
        kind: "points",
        title: "给第三组添加作业积分",
        description: "演示操作 · 请核对示例名单和分值。",
        details: [
          { label: "班级", value: `${currentClass} · 示例数据` },
          { label: "影响范围", value: "第三组 · 6 名学生" },
          { label: "积分规则", value: "作业完成 · 每人 +3 分" },
          { label: "积分合计", value: "+18 分" },
        ],
        confirmLabel: "模拟确认加分",
        successText: "模拟加分完成：示例第三组 6 名学生各增加 3 分，合计 18 分。这次演示未修改真实学生积分或积分记录。",
      },
      suggestions: ["查看第三组学生", "总结本周班级积分"],
    };
  }

  if (/学生|林小满|陈予安|第三组|名单/.test(prompt)) {
    return {
      text: `这是「${currentClass}」下的示例学生资料。林小满属于第三组，总积分 168 分，可用积分 128 分，本周净增 18 分。下方展示固定示例名单，不代表真实查询结果。`,
      steps: ["打开示例学生资料", "整理示例积分与分组信息"],
      stats: [
        { label: "总积分", value: "168", detail: "林小满 · 示例" },
        { label: "可用积分", value: "128", detail: "可用于示例兑换" },
        { label: "本周净增", value: "+18", detail: "固定演示数据" },
      ],
      rows: demoGroup.map((name) => ({
        name,
        detail: "示例学生",
        value: "第三组",
      })),
      suggestions: ["给第三组按作业完成规则加分", "帮林小满兑换一本笔记本"],
    };
  }

  if (/积分|本周|统计|总结|排行|排名/.test(prompt)) {
    return {
      text: `我整理了「${currentClass}」的本周积分示例。36 名学生中有 32 名参与评价，共产生 126 条记录；获得 286 分、扣除 18 分，班级净增 268 分。以下均为固定演示数据。`,
      steps: ["读取本周积分示例", "汇总加分与扣分", "整理班级概览"],
      stats: [
        { label: "本周净增", value: "+268", detail: "获得 286 · 扣除 18" },
        { label: "评价次数", value: "126", detail: "示例积分记录" },
        { label: "参与学生", value: "32/36", detail: "参与率约 89%" },
      ],
      rows: [
        { name: "陈予安", detail: "第三组 · 总积分 156", value: "本周 +22" },
        { name: "林小满", detail: "第三组 · 总积分 168", value: "本周 +18" },
        { name: "周星禾", detail: "第三组 · 总积分 151", value: "本周 +16" },
      ],
      suggestions: ["查看林小满的积分", "给第三组按作业完成规则加分"],
    };
  }

  return {
    text: "我可以演示班级积分总结、学生查询、分组加分预览和奖品兑换预览。当前使用固定示例数据，暂不解析其他业务指令。选一个下方示例，就能体验完整流程。",
    steps: ["整理可体验的示例能力"],
    suggestions: [...DEMO_PROMPTS],
  };
}
