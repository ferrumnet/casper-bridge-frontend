import React, { Suspense } from "react";
import { Route, Switch } from "react-router";
import { FMain, FGrid } from "ferrum-design-system";
const Header = React.lazy(() => import('./header/header'));
const CasperSwap = React.lazy(() => import('./pages/CasperSwap'));
const Withdrawals = React.lazy(() => import('./components/Withdrawals'));
const CasperAddLiquidity = React.lazy(() => import('./pages/CasperAddLiquidity'));
const CasperLanding = React.lazy(() => import('./pages/Landing/CasperLanding'));

const BaseRoutes = () => {
  return (
    <>
      <Suspense fallback={<div></div>}>
        <Header />
      </Suspense>
      <FMain>
        <Switch>
          <Route path="/withdraw" component={() => (
            <FGrid spacing={13}>
              <Suspense fallback={<div></div>}>
                <Withdrawals /> 
              </Suspense>
            </FGrid>
          )}></Route>
          <Route path="/liquidity" component={() => (
            <FGrid spacing={13}>
              <Suspense fallback={<div></div>}>
                <CasperAddLiquidity /> 
              </Suspense>
            </FGrid>
          )}></Route>
          <Route path="/swap" component={() =>
            <FGrid spacing={13}>
              <Suspense fallback={<div></div>}>
                <CasperSwap /> 
              </Suspense>
            </FGrid>
          }></Route>
          <Route path="*" component={() =>
            <FGrid spacing={13}>
              <Suspense fallback={<div></div>}>
                <CasperLanding /> 
              </Suspense>
            </FGrid>
          }></Route>
        </Switch>
      </FMain>
    </>
  );
};
export default BaseRoutes;
