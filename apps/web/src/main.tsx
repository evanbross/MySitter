/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";

import App from "./App";
import { Toaster } from "@/components/ui/toaster";
import "./index.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENV ?? "development",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Sentry.ErrorBoundary fallback={({ error }) => (
          <div style={{ padding: "2rem", fontFamily: "monospace" }}>
            <h2>Something went wrong</h2>
            <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>
              {error instanceof Error ? `${error.name}: ${error.message}\n\n${error.stack}` : String(error)}
            </pre>
          </div>
        )}>
          <App />
        </Sentry.ErrorBoundary>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
