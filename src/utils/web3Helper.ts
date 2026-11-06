import Web3 from "web3";

export class Web3Helper {
  web3Client: Web3;

  constructor(web3: Web3) {
    this.web3Client = web3;
  }

  async sendTransactionAsync(
    dispatch: any,
    transactions: any[],
    payload?: any
  ): Promise<string> {
    const txIds: string[] = [];
    for (const tx of transactions) {
      const txId = await new Promise<{ [k: string]: string }>(
        (resolve, reject) =>
          this.web3Client.eth
            .sendTransaction({
              from: tx.from,
              to: tx.contract,
              value: 0,
              data: tx.data,
              gas: tx.gas?.gasLimit,
              // gasPrice: tx.gas?.gasPrice,
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

}

