"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { Icons } from "@/config/icons";
import { ROUTES } from "@/config/routes";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState("admin@tatvacare.in");
  const [password, setPassword] = useState("admin123");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      router.push(ROUTES.commandCenter.path);
    } catch {
      // error is set in store
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <img src="/tatvacare-logo.svg" alt="TatvaCare" className="mx-auto h-8" />
          <p className="text-sm text-text-muted">Care Admin</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tatvacare.in"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-xs text-status-error">{error}</p>
            )}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
            <p className="text-center text-[11px] text-text-placeholder">
              Demo: admin@tatvacare.in / admin123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
