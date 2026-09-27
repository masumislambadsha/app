"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function MeError() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center text-center">
          <span className="mb-1 grid size-10 place-items-center rounded-full bg-amber-50 text-amber-600">
            <ShieldAlert className="size-5" />
          </span>
          <CardTitle>No staff account</CardTitle>
          <CardDescription>
            Your sign-in email isn&apos;t linked to an employee on the attendance list yet. Ask an
            admin to add you under Employees, or sign in with your admin account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/login" className={buttonVariants({ variant: "default" })}>
            Sign in as another user
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}