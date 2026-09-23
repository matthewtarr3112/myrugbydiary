"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (loginError) {
      const code = loginError instanceof Error ? loginError.message : "Unable to sign in.";
      setError(code);
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-neutral-950 p-6 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
      >
        <div>
          <p className="text-sm font-medium text-emerald-400">My Rugby Diary</p>
          <h1 className="mt-1 text-2xl font-bold">Coach sign in</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Sign in to manage weekly schedules, duties, and team information.
          </p>
        </div>

        <label className="block text-sm text-neutral-300">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block text-sm text-neutral-300">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 outline-none focus:border-emerald-500"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-black disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-center text-sm text-neutral-500">
          Need an account?{" "}
          <a href="/signup" className="text-emerald-400 hover:text-emerald-300">
            Create a coach account
          </a>
        </p>
      </form>
    </main>
  );
}
