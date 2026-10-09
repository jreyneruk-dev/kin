import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { JoinForm } from "./join-form";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const user = await getUser();
  if (user) redirect("/");
  const { code } = await searchParams;
  return (
    <div className="wrap flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-kin">By invitation</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900">Join the family tree</h1>
          <p className="mt-2 text-sm text-stone-600">
            Enter the invite code the family sent you, then choose your sign-in details.
          </p>
        </div>
        <JoinForm initialCode={code ?? ""} />
        <p className="mt-6 text-center text-sm text-stone-500">
          Already a member?{" "}
          <a className="font-semibold text-kin-dark underline" href="/login">
            Sign in
          </a>
          .
        </p>
      </div>
    </div>
  );
}
