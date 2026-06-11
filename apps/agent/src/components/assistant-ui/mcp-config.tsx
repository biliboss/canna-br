"use client";

/**
 * mcp-config — vendored stub.
 *
 * The upstream implementation depends on @assistant-ui/store and
 * @assistant-ui/react-mcp which are workspace-internal packages in the
 * assistant-ui monorepo and are not published to npm. The canna-br agent app
 * uses the MCP proxy bridge (/api/mcp-apps → apps/mcp) and does not need
 * in-UI MCP server configuration. This file is a null stub to satisfy the
 * TypeScript include scan without pulling in unpublished packages.
 *
 * To implement: vendor @assistant-ui/store + @assistant-ui/react-mcp once
 * published, or copy source from the monorepo.
 */
import type { ReactNode } from "react";

export namespace McpConfigDialog {
  export type Props = { children?: ReactNode };
}

export const McpConfigDialog = (_props: McpConfigDialog.Props) => null;
McpConfigDialog.displayName = "McpConfigDialog";
