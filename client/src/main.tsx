import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { Toaster } from "@/components/ui/sonner";
import App from "./App";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: "/api/trpc",
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
} as any);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" switchable>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster richColors theme="dark" position="top-right" />
        </QueryClientProvider>
      </trpc.Provider>
    </ThemeProvider>
  </React.StrictMode>,
);
