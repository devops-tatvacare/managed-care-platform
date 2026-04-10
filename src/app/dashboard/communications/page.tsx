"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import { useCommunicationsStore } from "@/stores/communications-store";
import { fetchProgram } from "@/services/api/programs";
import { ThreadList } from "@/features/communications/components/thread-list";
import { MessageThread } from "@/features/communications/components/message-thread";
import { PatientContextPanel } from "@/features/communications/components/patient-context-panel";
import { ComposeArea } from "@/features/communications/components/compose-area";
import { OrchestrationStats } from "@/features/communications/components/orchestration-stats";
import { OrchestrationFilters } from "@/features/communications/components/orchestration-filters";
import { OrchestrationTable } from "@/features/communications/components/orchestration-table";
import type { CohortSummary } from "@/services/types/program";

export default function CommunicationsPage() {
  const store = useCommunicationsStore();

  const [channel, setChannel] = useState("whatsapp");
  const [language, setLanguage] = useState("pt");
  const [threadQuery, setThreadQuery] = useState("");

  const [orchProgramId, setOrchProgramId] = useState("all");
  const [orchCohortId, setOrchCohortId] = useState("all");
  const [orchChannel, setOrchChannel] = useState("all");
  const [orchStatus, setOrchStatus] = useState("all");
  const [orchCohorts, setOrchCohorts] = useState<CohortSummary[]>([]);

  useEffect(() => {
    store.loadThreads();
    store.loadTemplates();
    store.loadPrograms();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (orchProgramId && orchProgramId !== "all") {
      fetchProgram(orchProgramId).then((p) => setOrchCohorts(p.cohorts)).catch(() => setOrchCohorts([]));
    } else {
      setOrchCohorts([]);
      setOrchCohortId("all");
    }
  }, [orchProgramId]);

  useEffect(() => {
    store.loadOrchestration({
      program_id: orchProgramId !== "all" ? orchProgramId : undefined,
      cohort_id: orchCohortId !== "all" ? orchCohortId : undefined,
      channel: orchChannel !== "all" ? orchChannel : undefined,
      status: orchStatus !== "all" ? orchStatus : undefined,
    });
  }, [orchProgramId, orchCohortId, orchChannel, orchStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!store.selectedThread && !store.threadsLoading && store.threads.length > 0) {
      store.selectThread(store.threads[0].patient_id);
    }
  }, [store.selectedThread, store.threads, store.threadsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRewrite = async (text: string, instruction: string): Promise<string | null> => {
    const result = await store.doRewrite(text, instruction);
    return result?.rewritten ?? null;
  };

  const handleSend = (text: string, ch: string) => {
    if (!store.selectedThread) return;
    store.doSend(
      store.selectedThread.patient_id,
      ch,
      `${ch === "whatsapp" ? "wa" : ch}_dispatched`,
      { message: text },
    );
  };

  const filteredThreads = useMemo(() => {
    const query = threadQuery.trim().toLowerCase();
    if (!query) return store.threads;
    return store.threads.filter((t) =>
      t.patient_name.toLowerCase().includes(query),
    );
  }, [store.threads, threadQuery]);

  const selectedPatientName = store.selectedPatient
    ? `${store.selectedPatient.first_name} ${store.selectedPatient.last_name}`
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Tabs defaultValue="threads" className="flex min-h-0 flex-1 flex-col">
        <TabsList
          variant="line"
          className="w-full shrink-0 justify-start gap-2 border-b border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-raised)] px-[var(--space-page-shell)] pt-[var(--space-page-shell)]"
        >
          {[
            { value: "threads", icon: Icons.communications, label: "Threads" },
            { value: "orchestration", icon: Icons.ai, label: "AI Orchestration Logs" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-1.5 rounded-none px-3 py-2 text-xs font-semibold text-text-muted data-[state=active]:text-brand-primary data-[state=active]:after:bg-brand-primary"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Threads tab ─── */}
        <TabsContent value="threads" className="mt-0 flex min-h-0 flex-1">
          <div className="grid h-full min-h-0 w-full lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">

            {/* ── Left: Inbox ── */}
            <div className="flex min-h-0 flex-col border-r border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-raised)]">
              {/* Search */}
              <div className="shrink-0 px-3 py-2.5">
                <div className="relative">
                  <Icons.search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-placeholder" />
                  <Input
                    value={threadQuery}
                    onChange={(e) => setThreadQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="h-8 rounded-lg border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-subtle)] pl-8 text-xs shadow-none"
                  />
                </div>
              </div>
              {/* Thread list */}
              <ThreadList
                threads={filteredThreads}
                loading={store.threadsLoading}
                selectedPatientId={store.selectedThread?.patient_id ?? null}
                onSelectAction={(pid) => store.selectThread(pid)}
              />
            </div>

            {/* ── Center + Right: Conversation + Patient (bound together) ── */}
            <div className="flex min-h-0 flex-col xl:col-span-2">
              {/* Shared header bar */}
              <div className="flex shrink-0 items-center border-b border-[color:var(--color-surface-border)] bg-gradient-to-r from-brand-primary/[0.06] via-brand-primary/[0.02] to-transparent px-4 py-2.5">
                {store.selectedThreadLoading ? (
                  <Skeleton className="h-5 w-40" />
                ) : selectedPatientName ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                      <Icons.user className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-text-primary">{selectedPatientName}</h2>
                      <p className="text-[11px] text-text-muted">
                        {store.selectedThread?.actions.length ?? 0} messages
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">Select a conversation</p>
                )}

                {store.selectedPatient && (
                  <div className="ml-auto flex items-center gap-1.5">
                    {store.selectedPatient.pathway_name && (
                      <Badge variant="outline" className="text-[10px] border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        <Icons.pathwayBuilder className="mr-1 h-2.5 w-2.5" />
                        {store.selectedPatient.pathway_name}
                      </Badge>
                    )}
                    {(store.selectedPatient.care_gaps?.length ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        {store.selectedPatient.care_gaps!.length} care gap{store.selectedPatient.care_gaps!.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Content area: conversation + patient panel */}
              <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_300px]">
                {/* Conversation */}
                <div className="flex min-h-0 flex-col bg-[color:var(--color-surface-raised)]">
                  <div className="min-h-0 flex-1">
                    <MessageThread
                      patientName={selectedPatientName}
                      actions={store.selectedThread?.actions ?? []}
                      loading={store.selectedThreadLoading}
                    />
                  </div>
                  {store.selectedThread && (
                    <ComposeArea
                      templates={store.templates}
                      channel={channel}
                      language={language}
                      draftLoading={store.draftLoading}
                      rewriteLoading={store.rewriteLoading}
                      onChannelChangeAction={setChannel}
                      onLanguageChangeAction={setLanguage}
                      onSendAction={handleSend}
                      onRewriteAction={handleRewrite}
                      onTemplateSelectAction={() => {}}
                    />
                  )}
                </div>

                {/* Patient details */}
                <div className="hidden min-h-0 border-l border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-subtle)]/30 xl:block">
                  <PatientContextPanel
                    patient={store.selectedPatient}
                    cohorts={store.selectedPatientCohorts}
                    loading={store.patientContextLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── Orchestration tab ─── */}
        <TabsContent value="orchestration" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--color-surface-canvas)]">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-[var(--space-page-shell)] pb-2">
            {/* KPI strip */}
            <OrchestrationStats
              stats={store.orchestration?.stats ?? null}
              loading={store.orchestrationLoading}
              activeFilter={orchStatus}
              onFilterAction={(status) => setOrchStatus(status === orchStatus ? "all" : status)}
            />

            {/* Filters */}
            <OrchestrationFilters
              programs={store.programs}
              cohorts={orchCohorts}
              selectedProgramId={orchProgramId}
              selectedCohortId={orchCohortId}
              selectedChannel={orchChannel}
              selectedStatus={orchStatus}
              onProgramChangeAction={setOrchProgramId}
              onCohortChangeAction={setOrchCohortId}
              onChannelChangeAction={setOrchChannel}
              onStatusChangeAction={setOrchStatus}
            />

            {/* Table */}
            <OrchestrationTable
              rows={store.orchestration?.items ?? []}
              loading={store.orchestrationLoading}
              page={store.orchestration?.page ?? 1}
              pages={store.orchestration?.pages ?? 0}
              total={store.orchestration?.total ?? 0}
              onPageChangeAction={(p) =>
                store.loadOrchestration({
                  page: p,
                  program_id: orchProgramId !== "all" ? orchProgramId : undefined,
                  cohort_id: orchCohortId !== "all" ? orchCohortId : undefined,
                  channel: orchChannel !== "all" ? orchChannel : undefined,
                  status: orchStatus !== "all" ? orchStatus : undefined,
                })
              }
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
