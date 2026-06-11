"use client";

import { useCallback } from "react";
import {
  AssistantRuntimeProvider,
  McpAppRenderer,
  McpAppsRemoteHost,
  Tools,
  useAui,
} from "@assistant-ui/react";
import { CommandCenter, type CommandCenterConfig } from "./command-center";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@/components/assistant-ui/thread";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type ShellProps = {
  suggestions?: string[];
  docsHref?: string;
  commandCenter?: CommandCenterConfig;
};

/**
 * Shell — rendered INSIDE AssistantRuntimeProvider, so `useAui()` resolves the
 * context runtime whose `aui.thread()` actually has thread scope. (Calling
 * thread() on the root aui created above the provider throws "current scope
 * does not have a thread property".) This is the canonical append path, mirror
 * of useSuggestionTrigger: guard on isRunning, append the user text with the
 * composer's runConfig, then clear the composer.
 */
function Shell({ suggestions = [], docsHref, commandCenter }: ShellProps) {
  const aui = useAui();

  const launch = useCallback(
    (text: string) => {
      const thread = aui.thread();
      if (thread.getState().isRunning) return;
      thread.append({
        content: [{ type: "text", text }],
        runConfig: aui.composer().getState().runConfig,
      });
      aui.composer().setText("");
    },
    [aui],
  );

  return (
    <>
      {commandCenter ? (
        <CommandCenter
          config={commandCenter}
          onLaunch={launch}
          docsHref={docsHref}
          leading={
            <>
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-1 h-4" />
            </>
          }
        />
      ) : (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink
                  href="https://canna-br.fonsecagabriel.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  canna-br
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Assistente</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {docsHref ? (
            <a
              href={docsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-sm text-muted-foreground hover:text-foreground"
            >
              Documentação →
            </a>
          ) : null}
        </header>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!commandCenter && suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => launch(s)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
        <div className="min-h-0 flex-1">
          <Thread />
        </div>
      </div>
    </>
  );
}

export const Assistant = ({
  model,
  apiKey,
  system,
  suggestions = [],
  docsHref,
  commandCenter,
}: {
  model?: string;
  apiKey?: string;
  system?: string;
  suggestions?: string[];
  docsHref?: string;
  /** When provided, the full Command Center replaces the flat suggestion strip. */
  commandCenter?: CommandCenterConfig;
} = {}) => {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({
      api: "/api/chat",
      body: { model, apiKey, system },
    }),
  });

  const aui = useAui({
    tools: Tools({
      mcpApp: McpAppRenderer({
        host: McpAppsRemoteHost({ url: "/api/mcp-apps" }),
        hostInfo: { name: "canna-agent", version: "0.1.0" },
      }),
    }),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-full w-full pr-0.5">
          <ThreadListSidebar />
          <SidebarInset>
            <Shell
              suggestions={suggestions}
              docsHref={docsHref}
              commandCenter={commandCenter}
            />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
