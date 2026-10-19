/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>404 — Page not found</h1>
      <Link to="/">Go home</Link>
    </div>
  );
}
