import { getCurrentUser } from "./lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./components/LoginForm";
import { cn } from "./lib/utils";
import Logo from "./components/Logo";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center p-4",
        "bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900"
      )}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo withBorder size="xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-zinc-400">Sign in to your account</p>
        </div>

        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-2xl p-8 shadow-2xl">
          <LoginForm />
        </div>

        <div className="text-center mt-6">
          <p className="text-zinc-500 text-sm">Personal Finance Manager</p>
        </div>
      </div>
    </div>
  );
}
