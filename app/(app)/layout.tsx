import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { MobileBottomNav, Sidebar } from "@/components/ui/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Moi";
  const email = profile?.email || user.email || "";

  return (
    <div className="min-h-dvh flex flex-col md:flex-row">
      <Sidebar displayName={displayName} email={email} />
      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 animate-fade-in-up">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
