import { AnyAction, Dispatch } from "@reduxjs/toolkit";
// import Web3 from "web3";
import { Web3Helper } from "./web3Helper";
import { crucibleApi } from "./Api";
import { toast } from "react-hot-toast";

export class CrucibleClient {
  public web3Client: any;

  constructor(Web3Client: any) {
    this.web3Client = Web3Client;
  }

  __name__() {
    return "CrucibleClient";
  }

  async getContractAllocation(
    userAddress: string,
    contractAddress: string,
    currency: string
  ): Promise<any> {
    const Api = new Web3Helper(this.web3Client)
    await Api.signInToServer(userAddress);
    return Api.gatewayApi({
      command: "getContractAllocation",
      data: { userAddress, contractAddress, currency },
      params: [],
    });
  }

  async setContractAllocation(
    dispatch: any,
    userAddress: string,
    contractAddress: string,
    currency: string,
    network: string,
    amount?: string
  ): Promise<string> {
    const Api = new crucibleApi();
    await Api.signInToServer(userAddress);
    const requests = await Api.crucibleApi({
      command: "approveAllocationGetTransaction",
      data: { currency, amount: amount || "1", userAddress, contractAddress },
      params: [],
    });
    console.log('About to submit request', {requests});

    if (requests.data) {
      requests.data[0].value = '0x0';
      const requestId = await this.web3Client.sendTransactionAsync(
        dispatch,
        currency,
        requests.data,
        { }
      );
      return requestId.split("|")[0]; // Convert the requestId to transction Id. TODO: Do this a better way
      //showmodal
    }
    return "";
  }

  private getGasFees = async (network: number, type='GENERAL') => {
    const response = await fetch(
        `https://api-gateway-v1.svcs.ferrumnetwork.io/api/v1/gasFees/${network}?type=${type}`,
    )

    if (response.status == 200) {
        const res = await response.json()
        return res.body.gasFees
    }
    return null;
  }

  private networkOverrides = async (transactions: any[], networkItem?: string) => {
    const networks = {
        "ETHEREUM_ARBITRUM": {
            maxFeePerGas: 200000000,
            maxPriorityFeePerGas: 100000000,
            gas: 3500000000,
            gasLimit: 4000000
        },
        "BSC": {
            maxFeePerGas: 3500000000,
            maxPriorityFeePerGas: 3500000000,
            gas: 3500000000,
            gasLimit: 2000000
        },
        "ETHEREUM": {
            maxFeePerGas: 100000000000,
            maxPriorityFeePerGas: 800000000,
            gas: 550000000,
            gasLimit: 1000000
        }
    }

    const networksMap = {
        "ETHEREUM_ARBITRUM": 42161,
        "BSC": 56,
        "ETHEREUM": 1,
        "POLYGON_MAINNET": 137,
        "POLYGON": 137,
        "AVAX_MAINNET": 43114,
        "AVAX": 43114,
    }

    console.log(transactions, 'transactionstransactions')

    const res = await Promise.all(transactions.map(
        async (e: any) => {
            console.log('called')
            const txType = (e?.description && (e?.data.startsWith('0x095ea7b')) ? 'approval' : 'general');
            const network = (e.currency.split(':') || [])[0] || networkItem
            const chainId = networksMap[network as keyof typeof networksMap]
            //@ts-ignore
            const gasOverride = networks[network as any]
            const gasRes = await this.getGasFees(chainId, txType)

            if (chainId && gasRes) {
                const gasFee = {
                    gas: gasRes?.gasLimit,
                    gasPrice: gasRes?.gasLimit,
                    gasLimit: Number(gasRes.gasLimit),
                    maxFeePerGas: Number(gasRes.maxFeePerGas) * 1000000000,
                    maxPriorityFeePerGas: Number(gasRes.maxPriorityFeePerGas) * 1000000000,
                }
                e.gas = gasFee;
                return e
            }else {
                if(network && gasOverride) {
                    e.gas = gasOverride
                    return e
                }else {
                    return e
                }
            }               
        }
    ))
    return res;
  }

  async contract(userAddress: string, network: string) {
    //@ts-ignore
    const Api = new crucibleApi();
    await Api.signInToServer(userAddress);
    const response = await Api.crucibleApi({
      command: "getCrucible",
      data: {},
      params: [],
    });

    return response;
  }
}
