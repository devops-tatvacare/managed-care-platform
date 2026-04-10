"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Icons } from "@/config/icons";
import { sendAction } from "@/services/api/communications";
import { toast } from "sonner";

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "call", label: "Call" },
  { value: "app_push", label: "Push" },
] as const;

interface Props {
  patient: { id: string; name: string } | null;
  onClose: () => void;
}

export function SendCommsDialog({ patient, onClose }: Props) {
  const [channel, setChannel] = useState<string>("whatsapp");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!patient) return;
    setSending(true);
    try {
      await sendAction({
        patient_id: patient.id,
        channel,
        action_type: "outreach",
      });
      const channelLabel =
        CHANNELS.find((c) => c.value === channel)?.label ?? channel;
      toast.success(`${channelLabel} outreach sent to ${patient.name}`);
      onClose();
    } catch {
      toast.error("Failed to send communication");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={patient !== null} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Communication</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm">
            Send outreach to <span className="font-semibold">{patient?.name}</span>
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">
              Channel
            </label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((ch) => (
                  <SelectItem key={ch.value} value={ch.value}>
                    {ch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
