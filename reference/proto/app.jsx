// Root prototype shell — overlays render INSIDE the active screen's JDPhone
// so they get clipped by the phone's rounded frame.
const PApp = () => {
  const s = useStore();
  if (!s.state.auth.signedIn) return <PAuthScreen />;
  const tab = s.state.view.tab;
  return (
    <>
      {tab === 'home' && <PHomeScreen />}
      {tab === 'stats' && <PStatsScreen />}
      {tab === 'settings' && <PSettingsScreen />}
    </>
  );
};

Object.assign(window, { PApp });
