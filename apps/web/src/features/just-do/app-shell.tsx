"use client";

import { AddSheet } from "./add-sheet";
import { DetailScreen } from "./detail-screen";
import { HabitScreen } from "./habit-screen";
import { HomeScreen } from "./home-screen";
import { AuthProvider, useAuth } from "@/lib/auth/useAuth";
import { PhoneFrame, StatusBar } from "./primitives";
import { SettingsScreen } from "./settings-screen";
import { JustDoProvider, useJustDo } from "./store";
import { TabBar } from "./tab-bar";

export function JustDoApp() {
  return (
    <AuthProvider>
      <JustDoAppWithAuth />
    </AuthProvider>
  );
}

function JustDoAppWithAuth() {
  const { status, user } = useAuth();
  if (status === "loading") {
    return <LoadingViewport mode="light" />;
  }
  return (
    <JustDoProvider userId={user?.id ?? null}>
      <JustDoViewport />
    </JustDoProvider>
  );
}

function JustDoViewport() {
  const { isHydrated, state } = useJustDo();
  const mode = state.view.dark ? "dark" : "light";
  if (!isHydrated) {
    return <LoadingViewport mode={mode} />;
  }
  return (
    <PhoneFrame mode={mode}>
      <StatusBar mode={mode} />
      {state.view.tab === "home" ? <HomeScreen mode={mode} /> : null}
      {state.view.tab === "habit" ? <HabitScreen mode={mode} /> : null}
      {state.view.tab === "settings" ? <SettingsScreen mode={mode} /> : null}
      <TabBar mode={mode} />
      <DetailScreen mode={mode} />
      <AddSheet mode={mode} />
    </PhoneFrame>
  );
}

function LoadingViewport({ mode }: { mode: "light" | "dark" }) {
  return (
    <PhoneFrame mode={mode}>
      <StatusBar mode={mode} />
      <div className="flex h-[calc(100%-54px)] items-center justify-center">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-transparent"
          style={{
            borderTopColor: mode === "dark" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.35)",
            borderRightColor: mode === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
          }}
        />
      </div>
    </PhoneFrame>
  );
}
