import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { AdminDataTable, type Column } from "../../features/admin/components/AdminDataTable";

interface Invoice {
  id: string; invoice_number: string; plan_name: string; amount_cents: number; discount_cents: number;
  gst_cents: number; total_cents: number; currency: string; status: string; issue_date: string; due_date: string | null;
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export default function InvoicesPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("invoices").select("*").order("issue_date", { ascending: false }).then(({ data, error: fetchError }) => {
      if (fetchError) setError(fetchError.message);
      else setRows((data ?? []) as Invoice[]);
      setIsLoading(false);
    });
  }, []);

  const downloadInvoice = async (inv: Invoice) => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Invoice", 14, 16);
    doc.setFontSize(10);
    doc.text(`Invoice #: ${inv.invoice_number}`, 14, 26);
    doc.text(`Customer: ${profile?.full_name ?? "—"}`, 14, 32);
    doc.text(`Plan: ${inv.plan_name}`, 14, 38);
    doc.text(`Issue date: ${inv.issue_date}`, 14, 44);
    if (inv.due_date) doc.text(`Due date: ${inv.due_date}`, 14, 50);

    autoTable(doc, {
      startY: 58,
      head: [["Description", "Amount"]],
      body: [
        ["Plan amount", formatCurrency(inv.amount_cents, inv.currency)],
        ["Discount", `- ${formatCurrency(inv.discount_cents, inv.currency)}`],
        ["GST", formatCurrency(inv.gst_cents, inv.currency)],
        ["Total", formatCurrency(inv.total_cents, inv.currency)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`${inv.invoice_number}.pdf`);
  };

  const columns: Column<Invoice>[] = [
    { header: "Invoice #", render: (i) => <span className="font-mono text-xs">{i.invoice_number}</span> },
    { header: "Plan", render: (i) => i.plan_name },
    { header: "Date", render: (i) => new Date(i.issue_date).toLocaleDateString() },
    { header: "Total", render: (i) => formatCurrency(i.total_cents, i.currency) },
    { header: "Status", render: (i) => <span className="capitalize">{i.status}</span> },
    { header: "Download", render: (i) => <button onClick={() => downloadInvoice(i)} className="flex items-center gap-1 text-[var(--color-primary)] hover:underline"><Download size={13} /> PDF</button> },
  ];

  return (
    <>
      <title>Invoices · TournamentLive</title>
      <AdminDataTable title="Invoices" description="Billing history for your account, with GST breakdown." columns={columns} rows={rows} isLoading={isLoading} error={error} search="" onSearchChange={() => {}} page={1} totalPages={1} onPageChange={() => {}} emptyLabel="No invoices yet" />
    </>
  );
}
