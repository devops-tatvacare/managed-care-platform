"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UnsavedChangesGuardProps {
  isDirty: boolean;
  title?: string;
  description?: string;
}

/**
 * Reusable unsaved changes guard.
 * - Intercepts browser close/refresh via beforeunload
 * - Intercepts Next.js client-side navigation via router patching
 * - Shows a shadcn AlertDialog when navigating away with unsaved changes
 *
 * Usage: <UnsavedChangesGuard isDirty={isDirty} />
 */
export function UnsavedChangesGuard({
  isDirty,
  title = "Unsaved changes",
  description = "You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?",
}: UnsavedChangesGuardProps) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Browser close/refresh
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept client-side link clicks (Next.js doesn't have a native navigation guard)
  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;

      // Same page — skip
      if (href === window.location.pathname) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
      setShowDialog(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty]);

  const handleLeave = useCallback(() => {
    setShowDialog(false);
    if (pendingHref) {
      router.push(pendingHref);
    }
    setPendingHref(null);
  }, [pendingHref, router]);

  const handleStay = useCallback(() => {
    setShowDialog(false);
    setPendingHref(null);
  }, []);

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleStay}>Stay</AlertDialogCancel>
          <AlertDialogAction onClick={handleLeave}>Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
