import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { WalletConnectorProps } from "./walletConnectorInterfaces";
import { walletConnectorActions } from ".";
import { useWeb3React } from "@web3-react/core";
import { injected } from "./web3React/connectors";
import Web3 from "web3";
import { RootState } from "../../../redux/rootReducer";
import { AiOutlineDisconnect, AiOutlineLoading3Quarters } from "react-icons/ai";
import { VscDebugDisconnect } from "react-icons/vsc";
import toast from "react-hot-toast";
// import { WalletAuthencationOnSignIn } from "../../components/common/wallet-authentication/WalletAuthenticationSignIn";
import * as walletAuthenticatorActions from "./walletAuthenticationActions";

export const WalletConnector = ({
  WalletConnectView,
  WalletConnectModal, 
  WalletConnectViewProps,
}: WalletConnectorProps) => {
  const [showWalletDialog, setShowWalletDialog] = useState<boolean>(false);
  const [reconnect, setReconnect] = useState<boolean>(false);
  const [networkClient, setNetworkClient] = useState<Web3 | undefined>(
    undefined
  );
  const state =  useSelector((state: RootState) => state);

  const dispatch = useDispatch();
  const { active, activate, deactivate, library, account, chainId, error } =
    useWeb3React();
  const { isConnected, isConnecting, currentWalletNetwork, walletAddress } =
    useSelector((state: any) => state.casper.walletConnector);
  const {
    // nonce,
    applicationUserToken,
    //  signature, isAllowedonGateway, allowedNetworksonGateway, getSignatureFromMetamask, tokenV2, meV2
  } = useSelector((state: any) => state.casper.walletAuthenticator);

  
  useEffect(() => {
    if (
      account &&
      walletAddress &&
      walletAddress !== account &&
      isConnected &&
      active
    ) {
      // console.log("Account Changed reconnect wallet");
      activate(injected);
      setReconnect(true);
    }
    // eslint-disable-next-line
  }, [walletAddress, account, isConnected, active]);

  useEffect(() => {
    injected
      .isAuthorized()
      .then((isAuthorized) => {
        // console.log(isAuthorized, active, "isAuthorized");
        if (isAuthorized && !active && !error && isConnected) {
          activate(injected);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line
  }, [activate, active, error, isConnected]);

  useEffect(() => {
    if (
      chainId &&
      currentWalletNetwork &&
      currentWalletNetwork !== chainId &&
      isConnected &&
      active
    ) {
      // console.log("Chain Changed reconnect wallet");
      activate(injected);
      setReconnect(true);
    }
    // eslint-disable-next-line
  }, [currentWalletNetwork, chainId, isConnected, active]);

  useEffect(() => {
    if (active && !isConnected && library && !networkClient) {
      // console.log("web3 react connect set network client");
      dispatch(walletConnectorActions.connectWallet());
      setNetworkClient(library);
    }
    if (!active && isConnected && !library && !isConnecting) {
      // console.log("connected in currenct browser session reconnect wallet");
      activate(injected);
      setReconnect(true);
    }
    // eslint-disable-next-line
  }, [isConnected, active, library, isConnecting, networkClient]);

  useEffect(() => {
    if (reconnect && active) {
      // console.log(
      //   "reconnect called and web3 is active again reset network client to set again"
      // );
      dispatch(walletConnectorActions.reconnectWallet());
      setNetworkClient(undefined);
      setReconnect(false);
    }
    // eslint-disable-next-line
  }, [reconnect, active]);

  useEffect(() => {
    if (
      active &&
      networkClient &&
      library &&
      !isConnected &&
      account &&
      chainId &&
      isConnecting
    ) {
      // console.log(
      //   "network client is set, web3 react is also active test by fetching account balance"
      // );
      networkClient.eth
        .getBalance(account?.toString())
        .then((balance) => {
          // console.log(
          //   "newtork ping completed successfully update redux with wallet and network client information",
          //   balance,
          //   account?.toString()
          // );
          dispatch(
            walletConnectorActions.walletConnected({
              chainId,
              account,
              balance,
              currentWallet: undefined,
              networkClient,
            })
          );
        })
        .catch((err) => {
          // console.log("newtork ping failed reset wallet state");
          // console.log(err, " : error connecting wallet");
          toast.error(err || "Error connecting wallet");
          dispatch(walletConnectorActions.resetWalletConnector());
        });
    }
    // eslint-disable-next-line
  }, [
    networkClient,
    library,
    isConnected,
    active,
    account,
    chainId,
    isConnecting,
  ]);

  const openWalletSelectorDialog = () => {
    // console.log("open wallet selector to connect");
    if (!isConnecting) {
      if (!isConnected) {
        setShowWalletDialog(true);
      } else {
        // console.log("wallet is already connect disconnect wallet");
        dispatch(walletConnectorActions.resetWalletConnector());
        dispatch(
          walletAuthenticatorActions.resetWalletAuthentication({
            userToken: applicationUserToken,
          })
        );
        dispatch(
          walletAuthenticatorActions.removeSession({
            userToken: applicationUserToken,
          })
        );
        setNetworkClient(undefined);
        deactivate();
      }
    } else {
    }
  };


  const connectMetaMask = () => {
    if (isConnected) {
      dispatch(walletConnectorActions.resetWalletConnector());
      setNetworkClient(undefined);
      deactivate();
    } else {
      activate(injected);
      setShowWalletDialog(false);
      setNetworkClient(undefined);
    }
  };

  useEffect(() => {
    if (error) {
      dispatch(walletConnectorActions.resetWalletConnector());
      toast.error(error?.message || "Error connecting wallet");
    }
    // eslint-disable-next-line
  }, [error]);

  console.log(WalletConnectView, 'WalletConnectView')
  return (
    <>
      <WalletConnectView
        {...{
          ...WalletConnectViewProps,
          prefix: {
            ...(isConnecting ? (
              <AiOutlineLoading3Quarters />
            ) : !isConnected ? (
              <VscDebugDisconnect />
            ) : (
              <AiOutlineDisconnect />
            )),
          },

          title: isConnecting
            ? "Connecting..."
            : !isConnected
            ? "Connect to Metamask"
            : "Disconnect",
          disabled: isConnecting,
        }}
        onClick={() => {
          openWalletSelectorDialog();
        }}
      />
      <WalletConnectModal
        show={showWalletDialog}
        metaMaskClickEvent={() => {
          connectMetaMask();
        }}
        onHide={() => setShowWalletDialog(false)}
      />
      {/* { isAuthenticationNeeded && <WalletAuthencationOnSignIn account={account} networkClient={networkClient} isAuthenticationNeeded={isAuthenticationNeeded} /> } */}
    </>
  );
};
