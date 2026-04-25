export interface ToolTextContent {
  type: "text";
  text: string;
}

export interface ToolResult {
  content: ToolTextContent[];
  details: unknown;
  terminate?: boolean;
}

export function jsonResult<T>(value: T): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    details: value,
  };
}

export function textResult(text: string, details: unknown = undefined): ToolResult {
  return { content: [{ type: "text", text }], details };
}
