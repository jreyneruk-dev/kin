import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect("/");
  return (
    <div className="wrap flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-kin">Private family site</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900">Sign in to Kin</h1>
          <p className="mt-2 text-sm text-stone-600">
            Membership is by invitation — ask the site owner for an invite code.
          </p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-stone-500">
          Have an invite code?{" "}
          <a className="font-semibold text-kin-dark underline" href="/join">
            Join here
          </a>
          .
        </p>
      </div>
    </div>
  );
}
