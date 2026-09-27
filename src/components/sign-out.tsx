"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/auth/sign-out", { method: "POST" });
        } finally {
          router.push("/login");
        }
      }}
    >
      <LogOut />
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  );
}