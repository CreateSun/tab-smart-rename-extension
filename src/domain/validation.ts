import { MAX_NAME_CODE_POINTS, type RenameRule } from "./types";
import { normalizeExactUrl, normalizeHostname } from "./url";

export function normalizeName(name: unknown): string {
  if (typeof name !== "string") throw new Error("名称必须是文本");
  const normalized = name.trim();
  const length = Array.from(normalized).length;
  if (length === 0) throw new Error("名称不能为空");
  if (length > MAX_NAME_CODE_POINTS) throw new Error(`名称不能超过 ${MAX_NAME_CODE_POINTS} 个字符`);
  return normalized;
}

export function validateRule(input: unknown): RenameRule {
  if (!input || typeof input !== "object") throw new Error("规则必须是对象");
  const item = input as Partial<RenameRule>;
  if (typeof item.id !== "string" || !item.id) throw new Error("规则 id 无效");
  if (typeof item.enabled !== "boolean") throw new Error("规则启用状态无效");
  if (typeof item.createdAt !== "string" || !Number.isFinite(Date.parse(item.createdAt))) throw new Error("createdAt 无效");
  if (typeof item.updatedAt !== "string" || !Number.isFinite(Date.parse(item.updatedAt))) throw new Error("updatedAt 无效");
  if (!item.match || typeof item.match !== "object") throw new Error("规则 matcher 无效");

  const name = normalizeName(item.name);
  const match = item.match;
  if (match.kind === "exact-url") {
    const value = normalizeExactUrl(match.value);
    if (!value) throw new Error("精确 URL 无效");
    return { id: item.id, name, match: { kind: "exact-url", value }, enabled: item.enabled, createdAt: item.createdAt, updatedAt: item.updatedAt };
  }
  if (match.kind === "host") {
    const value = normalizeHostname(match.value);
    if (!value || value.includes("/")) throw new Error("域名无效");
    return { id: item.id, name, match: { kind: "host", value }, enabled: item.enabled, createdAt: item.createdAt, updatedAt: item.updatedAt };
  }
  throw new Error("不支持的 matcher 类型");
}
