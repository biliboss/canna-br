/**
 * Tree-shaken ECharts entry — only the charts + components the Kanban data
 * widgets need. esbuild bundles this to an IIFE that assigns window.echarts,
 * inlined into widgets (CDN script-src is not controllable in the sandbox).
 *
 * Rebuild: pnpm run build:echarts
 */
import * as echarts from "echarts/core";
import {
  LineChart,
  BarChart,
  ScatterChart,
  CustomChart,
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
  GraphicComponent,
  AxisPointerComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  LineChart,
  BarChart,
  ScatterChart,
  CustomChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
  GraphicComponent,
  AxisPointerComponent,
  CanvasRenderer,
]);

(globalThis as unknown as { echarts: typeof echarts }).echarts = echarts;
