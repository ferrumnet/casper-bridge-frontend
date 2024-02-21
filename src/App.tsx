import React, { Suspense } from "react";
import { FLayout, FMain, FContainer } from "ferrum-design-system/dist";
import { Toaster } from "react-hot-toast";
import { WalletApplicationWrapper } from "./components/connector";
import './assets/scss/styles.scss'
import './components/layout.scss';
import './pages/layout.scss';
const BaseRoutes = React.lazy(() => import('./Routes'));

function App() {
  return (
    <div className="App">
      <WalletApplicationWrapper.ApplicationWrapper>
        <Toaster position="top-right" />
        <FLayout themeBuilder={false} FsiderLayoutState={true}>
          <FContainer width={1600} className="f-pl-1 f-pr-1">
          <Suspense fallback={<div></div>}>
            <BaseRoutes />
          </Suspense>
          </FContainer>
        </FLayout>
        </WalletApplicationWrapper.ApplicationWrapper>
    </div>
  );
}

export default App;
