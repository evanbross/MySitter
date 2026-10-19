/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

export default function ReferralPage() {
    const { user } = useAuth();
    const qc = useQueryClient();

    const { data: referralData } = useQuery({
        queryKey: ["referrals", "me"],
        queryFn: () => apiClient.referrals.listMine(),
        enabled: !!user,
    });

    const generateCode = useMutation({
        mutationFn: () => apiClient.referrals.generate(),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["referrals", "me"] }),
    });

    const handleCopyToClipboard = () => {
        if (referralData?.referrals[0]?.code) {
            navigator.clipboard.writeText(referralData.referrals[0].code);
            alert("Referral code copied to clipboard!");
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
            <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>Referrals</h1>

            <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>Your Referral Code</h2>
                {referralData?.referrals[0] ? (
                    <div>
                        <input
                            type="text"
                            value={referralData.referrals[0].code}
                            readOnly
                            style={{ padding: 8, marginRight: 8, border: "1px solid #ccc", borderRadius: 4 }}
                        />
                        <button onClick={handleCopyToClipboard} style={{ padding: "8px 12px", cursor: "pointer" }}>Copy</button>
                    </div>
                ) : (
                    <button onClick={() => generateCode.mutate()} disabled={generateCode.isPending} style={{ padding: "8px 12px", cursor: "pointer" }}>
                        {generateCode.isPending ? "Generating..." : "Get Referral Code"}
                    </button>
                )}
            </div>

            <div>
                <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>Your Referrals</h2>
                <p style={{ marginBottom: 12 }}>
                    {referralData?.total_claimed ?? 0} friends joined / {referralData?.total_rewarded ?? 0} rewards earned.
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>Code</th>
                            <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>Status</th>
                            <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>Claimed On</th>
                            <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>Rewarded</th>
                        </tr>
                    </thead>
                    <tbody>
                        {referralData?.referrals.map(r => (
                            <tr key={r.id}>
                                <td style={{ border: "1px solid #ccc", padding: 8 }}>{r.code}</td>
                                <td style={{ border: "1px solid #ccc", padding: 8 }}>{r.status}</td>
                                <td style={{ border: "1px solid #ccc", padding: 8 }}>{r.claimed_at ? new Date(r.claimed_at).toLocaleDateString() : "-"}</td>
                                <td style={{ border: "1px solid #ccc", padding: 8 }}>{r.rewarded_at ? "Yes" : "No"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
