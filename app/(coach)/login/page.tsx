"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function CoachHome() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
    } else if (role !== "coach") {
      router.push("/login");
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== "coach") {
    return <div className="min-h-screen w-full bg-neutral-950 text-white">Loading...</div>;
  }

  return <div className="min-h-screen w-full bg-neutral-950 text-white">Coach dashboard placeholder</div>;
}