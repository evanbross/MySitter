/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useState } from "react";
import { Title, useNotify } from "react-admin";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";

export function NotificationTrigger() {
  const [userIds, setUserIds] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState({ email: true, push: true, sms: false });
  const [isSending, setIsSending] = useState(false);
  const notify = useNotify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    const token = localStorage.getItem("access_token");
    const payload = {
      user_ids: userIds.split(",").map(s => s.trim()).filter(Boolean),
      subject,
      message,
      channels: Object.entries(channels).filter(([,v]) => v).map(([k]) => k),
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Send failed" }));
        throw new Error(err.detail);
      }
      const { queued } = await res.json();
      notify(`${queued} notifications queued.`, { type: "success" });
      setUserIds("");
      setSubject("");
      setMessage("");
    } catch (err) {
      notify(err instanceof Error ? err.message : "An error occurred", { type: "error" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Title title="Send Manual Notification" />
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <TextField
              label="User IDs (comma-separated, blank for all)"
              value={userIds}
              onChange={(e) => setUserIds(e.target.value)}
              fullWidth
            />
            <TextField
              label="Subject / Title"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Message (HTML for email, plain text for others)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              fullWidth
              multiline
              rows={4}
            />
            <FormGroup row>
              <FormControlLabel
                control={<Checkbox checked={channels.email} onChange={(e) => setChannels(c => ({ ...c, email: e.target.checked }))} />}
                label="Email"
              />
              <FormControlLabel
                control={<Checkbox checked={channels.push} onChange={(e) => setChannels(c => ({ ...c, push: e.target.checked }))} />}
                label="Push"
              />
              <FormControlLabel
                control={<Checkbox checked={channels.sms} onChange={(e) => setChannels(c => ({ ...c, sms: e.target.checked }))} />}
                label="SMS"
              />
            </FormGroup>
            <Button type="submit" variant="contained" disabled={isSending}>
              {isSending ? "Sending..." : "Send Notification"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
