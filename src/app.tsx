// app.ts · ScuolaBoard · Thin wrapper: AppProvider + AppLayout
import AppProvider from './contexts/AppProvider.tsx';
import AppLayout from './AppLayout.tsx';

export default function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
