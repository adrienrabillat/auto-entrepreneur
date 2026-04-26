import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { MobileBottomNav, Sidebar } from "@/components/ui/nav";
import { PageTransition } from "@/components/ui/page-transition";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, onboarded")
    .eq("id", user.id)
    .maybeSingle();

  // Si l'onboarding n'est pas terminé (Terminer pas cliqué sur l'étape 4),
  // on bloque l'accès à tout l'espace authentifié et on renvoie sur le
  // wizard pour que l'utilisateur le finisse.
  if (!profile?.onboarded) redirect("/onboarding");

  const displayName = profile.display_name || user.email?.split("@")[0] || "Moi";
  const email = profile.email || user.email || "";

  return (
    <div className="min-h-dvh flex flex-col md:flex-row">
      <Sidebar displayName={displayName} email={email} />
      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
          {/* PageTransition wrapper avec key={pathname} : déclenche
              fade-in-up à CHAQUE changement de route, pas seulement au
              premier mount du layout. Effet subtil pour rendre les
              transitions entre modules plus fluides visuellement. */}
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
