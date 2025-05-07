import {buildTask} from "./tasks.mjs";

export const buildDemoTasks = (hillConfig) => ([
  buildTask({label: "Feature A", x: hillConfig.xMin + 50, color: "#1f77b4"}),
  buildTask({label: "Feature B", x: hillConfig.xMid - hillConfig.xMid / 2, color: "#ff7f0e"}),
  buildTask({label: "Feature C", x: hillConfig.xMid - hillConfig.xMid / 3, color: "#2ca02c"}),
].map((d) => ({...d, y: hillConfig.yOf(d.x)})));