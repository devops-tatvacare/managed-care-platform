"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Compose state
  const [channel, setChannel] = useState("whatsapp");
  const [language, setLanguage] = useState("pt");

  // Orchestration filter state
  const [orchProgramId, setOrchProgramId] = useState("all");
  const [orchCohortId, setOrchCohortId] = useState("all");
  const [orchChannel, setOrchChannel] = useState("all");
  const [orchStatus, setOrchStatus] = useState("all");
  const [orchCohorts, setOrchCohorts] = useState<CohortSummary[]>([]);

  // Load threads + templates on mount
  useEffect(() => {
    store.loadThreads();
    store.loadTemplates();
    store.loadPrograms();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load orchestration on mount
  useEffect(() => {
    store.loadOrchestration();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load cohorts when program filter changes
  useEffect(() => {
    if (orchProgramId && orchProgramId !== "all") {
      fetchProgram(orchProgramId).then((p) => setOrchCohorts(p.cohorts)).catch(() => setOrchCohorts([]));
    } else {
      setOrchCohorts([]);
      setOrchCohortId("all");
    }
  }, [orchProgramId]);

  const handleOrchFilter = useCallback(() => {
    store.loadOrchestration({
      program_id: orchProgramId !== "all" ? orchProgramId : undefined,
      cohort_id: orchCohortId !== "all" ? orchCohortId : undefined,
      channel: orchChannel !== "all" ? orchChannel : undefined,
      status: orchStatus !== "all" ? orchStatus : undefined,
    });
  }, [orchProgramId, orchCohortId, orchChannel, orchStatus, store]);

  useEffect(() => {
    handleOrchFilter();
  }, [handleOrchFilter]);

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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Tabs defaultValue="threads" className="flex h-full flex-col">
        <TabsList
          variant="line"
          className="w-full shrink-0 justify-start gap-0 rounded-none border-b border-border-default bg-bg-primary px-0"
        >
          {[
            { value: "threads", label: "Threads" },
            { value: "orchestration", label: "AI Orchestration" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none px-4 py-2.5 text-xs font-semibold text-text-muted data-[state=active]:text-brand-primary data-[state=active]:shadow-none data-[state=active]:after:bg-brand-primary"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Threads tab */}
        <TabsContent value="threads" className="mt-0 flex min-h-0 flex-1">
          <div className="flex h-full w-full">
            {/* Thread list */}
            <div className="w-[300px] shrink-0 border-r border-border-default">
              <ThreadList
                threads={store.threads}
                loading={store.threadsLoading}
                selectedPatientId={store.selectedThread?.patient_id ?? null}
                onSelectAction={(pid) => store.selectThread(pid)}
              />
            </div>

            {/* Message thread + compose */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="min-h-0 flex-1">
                <MessageThread
                  patientName={store.selectedThread?.patient_name ?? null}
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

            {/* Patient context panel */}
            <div className="w-[320px] shrink-0 border-l border-border-default">
              <PatientContextPanel
                patient={store.selectedPatient}
                cohorts={store.selectedPatientCohorts}
                loading={store.patientContextLoading}
              />
            </div>
          </div>
        </TabsContent>

        {/* Orchestration tab */}
        <TabsContent value="orchestration" className="mt-0 flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
          <OrchestrationStats
            stats={store.orchestration?.stats ?? null}
            loading={store.orchestrationLoading}
          />

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

          <OrchestrationTable
            rows={store.orchestration?.items ?? []}
            loading={store.orchestrationLoading}
            page={store.orchestration?.page ?? 1}
            pages={store.orchestration?.pages ?? 0}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
