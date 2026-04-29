"use client";

import { AddSheet } from "./add-sheet";
import { DetailScreen } from "./detail-screen";
import { HabitScreen } from "./habit-screen";
import { HomeScreen } from "./home-screen";
import { AuthProvider, useAuth } from "@/lib/auth/useAuth";
import { PhoneFrame, StatusBar } from "./primitives";
import { SettingsScreen } from "./settings-screen";
import { StatsScreen } from "./stats-screen";
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
  const { user } = useAuth();
  return (
    <JustDoProvider userId={user?.id ?? null}>
      <JustDoViewport />
    </JustDoProvider>
  );
}

function JustDoViewport() {
  const { state } = useJustDo();
  const mode = state.view.dark ? "dark" : "light";
  return (
    <PhoneFrame mode={mode}>
      <StatusBar mode={mode} />
      {state.view.tab === "home" ? <HomeScreen mode={mode} /> : null}
      {state.view.tab === "habit" ? <HabitScreen mode={mode} /> : null}
      {state.view.tab === "stats" ? <StatsScreen mode={mode} /> : null}
      {state.view.tab === "settings" ? <SettingsScreen mode={mode} /> : null}
      <TabBar mode={mode} />
      <DetailScreen mode={mode} />
      <AddSheet mode={mode} />
    </PhoneFrame>
  );
}
