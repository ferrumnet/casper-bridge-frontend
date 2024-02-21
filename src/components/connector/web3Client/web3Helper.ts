import Web3 from "web3";
import { Big } from "big.js";
import axios from "axios";

export class Web3Helper {
  web3Client: Web3;
  jwtToken = "";
  address = ""

  constructor(web3: Web3) {
    this.web3Client = web3;
  }

  async signInToServer(userAddress: string) {
    const res = await axios.post('http://localhost:8080', {
      command: "signInUsingAddress",
      data: { userAddress },
      params: [],
    });
    const { unsecureSession } = res.data;
    this.address = userAddress;
    this.jwtToken = unsecureSession;
    return unsecureSession;
  }

  gatewayApi(data: any) {
    return axios.post('http://localhost:8080', data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-type": "Application/json",
        Authorization: `Bearer ${this.jwtToken}`,
      },
    });
  }

  async sendTransactionAsync(
    dispatch: any,
    currency: string,
    transactions: any[],
    payload?: any
  ): Promise<string> {
    const txIds: string[] = [];
    const txs = await this.networkOverrides(transactions, currency)
    for (const tx of txs) {
      const txId = await new Promise<{ [k: string]: string }>(
        (resolve, reject) =>
          this.web3Client.eth
            .sendTransaction({
              from: tx.from,
              to: tx.contract,
              value: tx.value || "0x",
              data: tx.data,
              gas: tx.gas?.gasLimit,
              gasPrice: tx.gas?.gasPrice,
              maxPriorityFeePerGas: tx.gas?.maxPriorityFeePerGas,
              maxFeePerGas: tx.gas?.maxFeePerGas
              // chainId: this.connection.netId()
            })
            // .on("confirmation", function (part1, part2) {
            //   console.log("confirmation", part1, part2);
            // })
            .on("transactionHash", (transactionHash) => {
              //dispatch(transactionHash);
            })
            .then((h: any) => {
              resolve(h);
            })
            .catch(reject)
      );
      // console.log(txId);
      txIds.push(txId.transactionHash);
    }
    // console.log(txIds, "txIdstxIds");
    return txIds.join(",") + "|" + JSON.stringify(payload || "");
  }

  async amountToHuman(amount: string, decimal: number) {
    const decimalFactor = 10 ** decimal;
    return new Big(amount).div(decimalFactor).toFixed();
  }

  weiToEther(wei: any) {
    return Web3.utils.fromWei(String(wei), "ether");
  }


  private getGasFees = async (network: number, type='general') => {
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

  async checkTransactionReceipt(txId: any) {
    try {
      const receipt = await this.web3Client.eth.getTransactionReceipt(txId);
      return receipt;
    } catch (e) {
      console.log("checkTransactionStatus", e);
    }

    return null;
  }
}
