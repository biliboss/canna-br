//#region src/utils/useToolArgsFieldStatus.d.ts
declare const useToolArgsFieldStatus: (fieldPath: (string | number)[]) => {
  type: string;
} | {
  readonly type: "running";
} | {
  readonly type: "complete";
} | {
  readonly type: "incomplete";
  readonly reason: "cancelled" | "length" | "content-filter" | "other" | "error";
  readonly error?: unknown;
};
//#endregion
export { useToolArgsFieldStatus };
//# sourceMappingURL=useToolArgsFieldStatus.d.ts.map