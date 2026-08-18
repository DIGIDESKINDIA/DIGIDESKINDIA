"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Select } from "@/components/ui/Select";
import toast from "react-hot-toast";
import { RefreshCw, Trash2, LogOut } from "lucide-react";

interface Lead {
  _id?: string;
  id?: string;
  name?: string;
  mobile?: string;
  service?: string;
  message?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS = [
  { label: "New", value: "New" },
  { label: "Contacted", value: "Contacted" },
  { label: "Qualified", value: "Qualified" },
  { label: "Converted", value: "Converted" },
  { label: "Lost", value: "Lost" },
];

export default function AdminDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setCheckingAuth(true);
    try {
      const resp = await fetch("/api/auth/me", { credentials: "include" });
      const data = await resp.json();
      if (resp.ok && data.authenticated) {
        setAuthenticated(true);
      } else {
        router.replace("/login");
      }
    } catch {
      router.replace("/login");
    } finally {
      setCheckingAuth(false);
    }
  }, [router]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/leads", { credentials: "include" });
      if (resp.status === 401) {
        router.replace("/login");
        return;
      }
      if (!resp.ok) throw new Error("Failed to fetch leads");
      const data = await resp.json();
      setLeads(data.leads || []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to fetch leads";
      setError(message);
            toast.error("Could not load leads");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const resp = await fetch("/api/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      if (resp.status === 401) {
        router.replace("/login");
        return;
      }
      if (!resp.ok) throw new Error("Failed to update status");
      const data = await resp.json();
      if (data.lead) {
        setLeads((prev) =>
          prev.map((l) => (l.id === id || l._id === id ? { ...l, ...data.lead } : l))
        );
      }
      toast.success("Status updated");
    } catch {
      toast.error("Could not update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this lead? This action cannot be undone.")) return;
    try {
      const resp = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (resp.status === 401) {
        router.replace("/login");
        return;
      }
      if (!resp.ok) throw new Error("Failed to delete lead");
      setLeads((prev) => prev.filter((l) => l.id !== id && l._id !== id));
      toast.success("Lead deleted");
    } catch {
      toast.error("Could not delete lead");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
      };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchLeads();
    }
  }, [authenticated, fetchLeads]);

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={32} className="text-blue-600" />
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <main
      className={isDark ? "min-h-screen bg-[#050B18] text-white" : "min-h-screen bg-gray-50"}
    >
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={fetchLeads}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner size={28} className="text-blue-600" />
              </div>
            ) : leads.length === 0 ? (
              <p className="py-10 text-center text-slate-500">No leads found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="pb-3 text-left font-medium">Name</th>
                      <th className="pb-3 text-left font-medium">Phone</th>
                      <th className="pb-3 text-left font-medium">Service</th>
                      <th className="pb-3 text-left font-medium">Status</th>
                      <th className="pb-3 text-left font-medium">Submitted</th>
                      <th className="pb-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => {
                      const leadId = lead._id || lead.id || "";
                      const currentStatus = lead.status || "New";
                      const dateStr = new Date(
                        lead.createdAt || lead.updatedAt
                      ).toLocaleDateString();
                      return (
                        <tr
                          key={leadId}
                          className="border-b border-slate-200 dark:border-slate-800"
                        >
                          <td className="py-3 font-medium">
                            {lead.name || "—"}
                          </td>
                          <td className="py-3">{lead.mobile || "—"}</td>
                          <td className="py-3">{lead.service || "—"}</td>
                          <td className="py-3">
                            <Select
                              options={STATUS_OPTIONS}
                              value={currentStatus}
                              onChange={(value) =>
                                handleStatusUpdate(leadId, value)
                              }
                            />
                          </td>
                          <td className="py-3">{dateStr}</td>
                          <td className="py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(leadId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
