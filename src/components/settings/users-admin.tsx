"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

interface UserRow {
  id: string;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
}

export function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);

  const [resetId, setResetId] = useState("");
  const [newPass, setNewPass] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.users) setUsers(d.users);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function addUser() {
    setMsg(null);
    const res = await fetch("/api/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: newUsername,
        password: newPassword,
        displayName: newDisplayName || undefined,
        isAdmin: newIsAdmin,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error === "USERNAME_EXISTS" ? t("auth.usernameExists") : t("common.error"));
      return;
    }
    setNewUsername("");
    setNewPassword("");
    setNewDisplayName("");
    setNewIsAdmin(false);
    setMsg(t("auth.userCreated"));
    load();
  }

  async function handleResetPassword() {
    if (!resetId || !newPass) return;
    setMsg(null);
    const res = await fetch(`/api/auth/users/${resetId}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPass }),
    });
    if (!res.ok) {
      setMsg(t("common.error"));
      return;
    }
    setNewPass("");
    setMsg(t("auth.passwordReset"));
  }

  return (
    <Card className="mb-4 space-y-4">
      <h3 className="font-semibold">{t("auth.usersTitle")}</h3>
      <p className="text-xs text-muted">{t("auth.usersHint")}</p>

      {loading ? (
        <p className="text-sm text-muted">{t("common.loading")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {users.map((u) => (
            <li key={u.id} className="px-3 py-2 text-sm">
              <span className="font-medium">{u.displayName || u.username}</span>
              <span className="text-muted"> (@{u.username})</span>
              {u.isAdmin && (
                <span className="ml-2 rounded bg-primary/10 px-1.5 text-xs text-primary">
                  admin
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-sm font-medium">{t("auth.addUser")}</p>
        <Input
          label={t("auth.displayName")}
          value={newDisplayName}
          onChange={(e) => setNewDisplayName(e.target.value)}
          placeholder="Мајка"
        />
        <Input
          label={t("auth.username")}
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
        />
        <Input
          label={t("auth.password")}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={newIsAdmin}
            onChange={(e) => setNewIsAdmin(e.target.checked)}
          />
          {t("auth.isAdmin")}
        </label>
        <Button variant="secondary" fullWidth onClick={addUser}>
          {t("auth.addUserBtn")}
        </Button>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-sm font-medium">{t("auth.resetPassword")}</p>
        <select
          className="w-full min-h-12 rounded-xl border border-border px-3"
          value={resetId}
          onChange={(e) => setResetId(e.target.value)}
        >
          <option value="">—</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName || u.username}
            </option>
          ))}
        </select>
        <Input
          label={t("auth.newPassword")}
          type="password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
        />
        <Button variant="secondary" fullWidth onClick={handleResetPassword}>
          {t("auth.resetPasswordBtn")}
        </Button>
      </div>

      {msg && <p className="text-sm text-success">{msg}</p>}
    </Card>
  );
}
