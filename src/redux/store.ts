import { combineReducers, configureStore, PreloadedState } from "@reduxjs/toolkit";
import { reduxBatch } from "@manaflair/redux-batch";
import { casperSlice } from './casper/casperSlice';
import {
    MetaMaskConnector,
    WalletApplicationWrapper 
  } from "../components/connector";
import { walletConnectorSlice } from "../components/connector/wallet-connector/walletAuthenticationSlice";
import { approvableButtonSlice } from "../components/connector/web3Client/approvalButtonWrapper";

export const rootReducer = combineReducers({
    "connect": casperSlice.reducer,
    walletConnector:  MetaMaskConnector.walletConnectorSlice.reducer,
    walletApplicationWrapper: WalletApplicationWrapper.applicationWrapperSlice.reducer,
    walletAuthenticator: walletConnectorSlice.reducer
});

const store = configureStore({
    reducer: {
        casper: rootReducer,
        approval: approvableButtonSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => 
     getDefaultMiddleware({

     }).concat(),
    devTools: process.env.NODE_ENV !== "production",
    enhancers: [reduxBatch],
})

export function setupStore(preloadedState?: PreloadedState<RootState>) {
    return store
}

export type RootState = ReturnType<typeof rootReducer>
export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = AppStore['dispatch']
export default store;