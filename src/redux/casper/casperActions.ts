//@ts-nocheck
import { casperSlice } from "./casperSlice";
import moment from "moment";
const { actions } = casperSlice;

export const connectWallet = (connectedAccounts) => async (dispatch) => {
  dispatch(
    actions.connectWallet({
      connectedAccounts: connectedAccounts,
    })
  );
};

export const resetWallet = (connectedAccounts) => async (dispatch) => {
  dispatch(actions.resetWallet());
};


export const fetchWithdrawals = (withdrawalItems) => async (dispatch) => {
  dispatch(actions.fetchWithdrawals({ withdrawalItems }));
};

export const staked = (selectedAddress) => async (dispatch) => {
  dispatch(actions.staked({ selectedAddress }));
};

export const signed = (signedAddress) => async (dispatch) => {
  dispatch(actions.signed(signedAddress));
};

export const selectAccount = (selectedAccount) => async (dispatch) => {
  dispatch(actions.selectAccount({ selectedAccount }));
};

export const shouldStake = () => async (dispatch) => {
  dispatch(actions.setShouldStake());
};

export const stakeWithdrawSucess = () => async (dispatch) => {
  dispatch(actions.stakeWithdrawSucess());
};

export const configLoaded = (config) => async (dispatch) => {
  let data = {}
  if (config.config.length) {
    config.config.forEach(
      e => {
        console.log(e[1])
        data[e[0]] = e[1].parsed
      }
    )
  }

  data = {
    ...data,
    stakingTotal: data?.staking_total,
    withdrawStarts: moment.unix(data.withdraw_starts).format("YYYY-MM-DD HH:mm:ss"),
    withdrawEnds: moment.unix(data.withdraw_ends).format("YYYY-MM-DD HH:mm:ss"),
    stakingEnds: moment.unix(data.staking_ends).format("YYYY-MM-DD HH:mm:ss"),
    stakingStarts: moment.unix(data.staking_starts).format("YYYY-MM-DD HH:mm:ss")
  };

  dispatch(actions.configLoaded({ config: data, tokenInfo: config.tokenInfo }));
};
