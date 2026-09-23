"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function CoachSignup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        role: "coach",
      });
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white flex items-center justify-center p-6">
      <form onSubmit={handleSignup} className="w-full max-w-md space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <h1 className="text-2xl font-bold">Coach Sign Up</h1>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5" />
        <button type="submit" className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-black">Sign Up</button>
        {error && <p className="text-red-400">{error}</p>}
      </form>
    </div>
  );
}