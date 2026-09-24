"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Profile = {
  id: string;
  name: string;
  dob: string;
  heightCm: string;
  weightKg: string;
  photoUrl: string;
};

export default function ClaimPlayerPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Checking your invitation...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setStatus("This page must be opened from the invitation email.");
        return;
      }

      const storedEmail = window.localStorage.getItem("myrugbydiaryInviteEmail") || "";
      if (storedEmail) {
        setEmail(storedEmail);
        completeClaim(storedEmail);
      } else {
        setStatus("Enter the email address that received the invitation.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function completeClaim(inviteEmail: string) {
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail) return;
    setError("");
    setStatus("Signing you in...");
    try {
      const credential = await signInWithEmailLink(
        auth,
        normalizedEmail,
        window.location.href
      );
      window.localStorage.removeItem("myrugbydiaryInviteEmail");

      const playerQuery = query(
        collection(db, "players"),
        where("email", "==", normalizedEmail)
      );
      const playerSnap = await getDocs(playerQuery);
      if (playerSnap.empty) {
        await signOut(auth);
        throw new Error(
          "No roster invitation was found for this email address. Ask your coach to check the invited email."
        );
      }

      const playerDoc = playerSnap.docs[0];
      const data = playerDoc.data();
      if (data.uid && data.uid !== credential.user.uid) {
        await signOut(auth);
        throw new Error("This roster record is already linked to another account.");
      }

      await setDoc(doc(db, "users", credential.user.uid), {
        email: normalizedEmail,
        role: "player",
        playerId: playerDoc.id,
      });
      await updateDoc(doc(db, "players", playerDoc.id), {
        uid: credential.user.uid,
        inviteStatus: "active",
      });

      setProfile({
        id: playerDoc.id,
        name: data.name || "",
        dob: data.dob || "",
        heightCm: data.heightCm == null ? "" : String(data.heightCm),
        weightKg: data.weightKg == null ? "" : String(data.weightKg),
        photoUrl: data.photoUrl || "",
      });
      setStatus("Confirm your profile details.");
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Unable to claim account.");
      setStatus("");
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await completeClaim(email);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "players", profile.id), {
        name: profile.name.trim(),
        dob: profile.dob || null,
        heightCm: profile.heightCm ? Number(profile.heightCm) : null,
        weightKg: profile.weightKg ? Number(profile.weightKg) : null,
        photoUrl: profile.photoUrl.trim() || null,
      });
      router.push("/dashboard");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save profile.");
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-sm font-medium text-emerald-400">My Rugby Diary</p>
        <h1 className="mt-1 text-2xl font-bold">Claim your player account</h1>
        {status && <p className="mt-2 text-sm text-neutral-400">{status}</p>}
        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {!profile && (
          <form onSubmit={handleEmailSubmit} className="mt-6 space-y-3">
            <label className="block text-sm text-neutral-300">
              Invitation email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5"
              />
            </label>
            <button className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-black">
              Continue
            </button>
          </form>
        )}

        {profile && (
          <form onSubmit={saveProfile} className="mt-6 space-y-4">
            <label className="block text-sm text-neutral-300">
              Confirm your name
              <input
                required
                value={profile.name}
                onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm text-neutral-300">
              Date of birth
              <input
                type="date"
                value={profile.dob}
                onChange={(event) => setProfile({ ...profile, dob: event.target.value })}
                className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-neutral-300">
                Height (cm)
                <input
                  type="number"
                  value={profile.heightCm}
                  onChange={(event) => setProfile({ ...profile, heightCm: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5"
                />
              </label>
              <label className="block text-sm text-neutral-300">
                Weight (kg)
                <input
                  type="number"
                  value={profile.weightKg}
                  onChange={(event) => setProfile({ ...profile, weightKg: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5"
                />
              </label>
            </div>
            <label className="block text-sm text-neutral-300">
              Photo URL
              <input
                type="url"
                value={profile.photoUrl}
                onChange={(event) => setProfile({ ...profile, photoUrl: event.target.value })}
                placeholder="https://..."
                className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5"
              />
            </label>
            <button
              disabled={saving}
              className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-black disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
