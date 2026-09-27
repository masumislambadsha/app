"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { LockKeyhole } from "lucide-react";

export default function AdminError() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center text-center">
          <span className="mb-1 grid size-10 place-items-center rounded-full bg-red-50 text-red-600">
            <LockKeyhole className="size-5" />
          </span>
          <CardTitle>Admin access only</CardTitle>
          <CardDescription>
            This area is restricted. Sign in with an account listed in{" "}
            <code className="rounded-lg bg-warm-100 px-1.5 py-0.5 font-mono text-xs">ADMIN_EMAIL</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/login" className={buttonVariants({ variant: "default" })}>
            Sign in as admin
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}