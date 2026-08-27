import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useSiteContext } from "../../features/publicSite/hooks/useSiteContext";
import { PageLoader } from "../../components/ui/LoadingSpinner";
import { ErrorState } from "../../components/ui/ErrorState";

export default function CustomPageView() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const { tournament } = useSiteContext();
  const [page, setPage] = useState<{ title: string; content: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!pageSlug) return;
    supabase.from("custom_pages").select("title, content").eq("tournament_id", tournament.id).eq("slug", pageSlug).eq("is_published", true).single().then(({ data }) => {
      setPage(data);
      setIsLoading(false);
    });
  }, [pageSlug, tournament.id]);

  if (isLoading) return <PageLoader label="Loading page..." />;
  if (!page) return <ErrorState message="Page not found" />;

  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-[var(--color-heading)]">{page.title}</h1>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">{page.content}</div>
    </article>
  );
}
