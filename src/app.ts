// app.js · ScuolaBoard · Thin wrapper: AppProvider + AppLayout
import AppProvider from './contexts/AppProvider.tsx';

function App() {
  var h = React.createElement;
  return h(AppProvider, null, h(SB.AppLayout, null));
}
window.App = App;
