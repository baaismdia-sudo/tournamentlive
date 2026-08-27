import { useEffect, useState } from "react";
import { Reorder } from "framer-motion";
import { Trash2, GripVertical } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { TournamentSelector } from "../../features/organizer/components/TournamentSelector";
import { useOrganizerTournaments } from "../../features/organizer/hooks/useOrganizerTournaments";
import { TextField, SelectField } from "../../features/admin/components/FormField";
import { PageLoader, ButtonSpinner } from "../../components/ui/LoadingSpinner";
import { EmptyState } from "../../features/admin/components/EmptyState";
import { Navigation } from "lucide-react";

interface NavItem { id: string; label: string; link_type: string; url: string | null; custom_page_id: string | null; icon: string | null; sort_order: number }
interface CustomPageOption { id: string; title: string; slug: string }

export default function NavigationBuilderPage() {
  const { tournaments, selectedId, setSelectedId, isLoading: tournamentsLoading } = useOrganizerTournaments();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [items, setItems] = useState<NavItem[]>([]);
  const [customPages, setCustomPages] = useState<CustomPageOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ label: "", link_type: "internal", url: "", custom_page_id: "" });
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    if (!selectedId) return;
    setIsLoading(true);
    let { data: menu } = await supabase.from("navigation_menus").select("id").eq("tournament_id", selectedId).maybeSingle();
    if (!menu) {
      const { data: created } = await supabase.from("navigation_menus").insert({ tournament_id: selectedId }).select().single();
      menu = created;
    }
    setMenuId(menu!.id);
    const { data: navItems } = await supabase.from("navigation_items").select("*").eq("menu_id", menu!.id).order("sort_order");
    setItems((navItems ?? []) as NavItem[]);
    const { data: pages } = await supabase.from("custom_pages").select("id, title, slug").eq("tournament_id", selectedId).eq("is_published", true);
    setCustomPages(pages ?? []);
    setIsLoading(false);
  };

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const addItem = async () => {
    if (!menuId || !form.label) return;
    setIsSaving(true);
    try {
      await supabase.from("navigation_items").insert({
        menu_id: menuId, label: form.label, link_type: form.link_type,
        url: form.link_type === "external" ? form.url : null,
        custom_page_id: form.link_type === "custom_page" ? form.custom_page_id : null,
        sort_order: items.length,
      });
      setForm({ label: "", link_type: "internal", url: "", custom_page_id: "" });
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const removeItem = async (id: string) => { await supabase.from("navigation_items").delete().eq("id", id); load(); };

  const handleReorder = async (newOrder: NavItem[]) => {
    setItems(newOrder);
    await Promise.all(newOrder.map((item, i) => supabase.from("navigation_items").update({ sort_order: i }).eq("id", item.id)));
  };

  if (tournamentsLoading) return null;
  if (tournaments.length === 0) return <EmptyState icon={Navigation} title="Create a tournament first" />;

  return (
    <div className="space-y-5 p-6">
      <title>Navigation Builder · TournamentLive</title>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-[var(--color-heading)]">Navigation Builder</h1>
          <p className="text-sm text-[var(--color-muted)]">Add extra links to your public site's navigation menu (custom pages, external links).</p>
        </div>
        <TournamentSelector tournaments={tournaments} selectedId={selectedId} onChange={setSelectedId} />
      </div>

      {isLoading ? <PageLoader label="Loading navigation..." /> : (
        <>
          <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="mb-3 text-sm font-medium text-[var(--color-text)]">Add menu item</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <TextField label="Label" value={form.label} onChange={(v) => setForm((f) => ({ ...f, label: v }))} />
              <SelectField label="Type" value={form.link_type} onChange={(v) => setForm((f) => ({ ...f, link_type: v }))} options={[{ value: "external", label: "External URL" }, { value: "custom_page", label: "Custom Page" }]} />
              {form.link_type === "external" ? (
                <TextField label="URL" value={form.url} onChange={(v) => setForm((f) => ({ ...f, url: v }))} />
              ) : (
                <SelectField label="Page" value={form.custom_page_id} onChange={(v) => setForm((f) => ({ ...f, custom_page_id: v }))} options={[{ value: "", label: "Select page" }, ...customPages.map((p) => ({ value: p.id, label: p.title }))]} />
              )}
              <div className="flex items-end">
                <button onClick={addItem} disabled={isSaving || !form.label} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
                  {isSaving && <ButtonSpinner />} Add
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="mb-3 text-sm font-medium text-[var(--color-text)]">Menu items (drag to reorder)</p>
            {items.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No custom menu items yet — your site's default navigation (Home, Live, Fixtures, etc.) always shows regardless.</p>
            ) : (
              <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-2">
                {items.map((item) => (
                  <Reorder.Item key={item.id} value={item} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <GripVertical size={15} className="cursor-grab text-[var(--color-muted)]" />
                      <span className="text-sm text-[var(--color-text)]">{item.label}</span>
                      <span className="text-xs text-[var(--color-muted)] capitalize">({item.link_type.replace("_", " ")})</span>
                    </div>
                    <button onClick={() => removeItem(item.id)} aria-label="Remove"><Trash2 size={14} className="text-[var(--color-muted)] hover:text-[var(--color-danger)]" /></button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </div>
        </>
      )}
    </div>
  );
}
