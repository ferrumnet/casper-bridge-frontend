import { CasperServiceByJsonRPC } from "casper-js-sdk";
import { FDialog, FList, FTruncateText, FTypo } from "ferrum-design-system";
import { useEffect, useState } from "react";
import Loader from "./../assets/images/loaderIcon.svg";
import Success from "./../assets/images/SuccessIcon2.png";
import Failure from "./../assets/images/FailureIcon.svg";
import LoaderGif from "./../assets/images/loading2.gif";
import { crucibleApi } from "../client";
import { useSelector } from "react-redux";
import { networksToChainIdMap } from "../utils/network";
import { useHistory } from "react-router";
import Web3 from "web3";

const RPC_API = "https://casper-proxy-app-03c23ef9f855.herokuapp.com?url=https://rpc.mainnet.casperlabs.io/rpc";
const casperService = new CasperServiceByJsonRPC(RPC_API);

const ConfirmationDialog = ({
    show,
    onHide,
    message,
    transaction,
    amount,
    network = "BSC_TESTNET",
    isSwap = false,
    onSuccessful,
    evmSuccessful
  }: any) => {
    const [processing, setProcessing] = useState(false)
    const [isSuccessful, setIsSuccessful] = useState(false)
    const [isDone, setIsDone] = useState(false)
    const [intervalId, setIntervalId] = useState(null as any)
    const { connect: { config, selectedAccount, isWalletConnected, signedAddresses } } = useSelector((state: any) => state.casper);
    const { walletAddress, currentWalletNetwork } = useSelector((state: any) => state.casper.walletConnector);
    const navigate = useHistory();

    const checkTransaction = async () => {
      if (!processing) {
        const res = await casperService.getDeployInfo(transaction)
        if(res.execution_results.length) {
          //@ts-ignore
          if(res.execution_results[0].result.Failure) {
            //@ts-ignore
            setProcessing(false)
            setIsDone(true)
            setIsSuccessful(false)
            clearInterval(intervalId)
          }
          //@ts-ignore
          if(res.execution_results[0].result.Success && !isDone) {
              setProcessing(false)
              setIsDone(true)
              setIsSuccessful(true)

              if (onSuccessful) {
                onSuccessful()
              }
              //@ts-ignore
              if (isSwap && !isDone) {
                console.log('called', isDone)
                await setIsDone(true)
                clearInterval(intervalId)
                console.log(isDone)
              }
          }
        }
      }
    }

    // useEffect(() => {
    //   console.log(isSuccessful, processing, isDone, transaction, 'isSuccessfulisSuccessful')
    //   if (isSuccessful) {
    //     //@ts-ignore
    //     const networkData = networksToChainIdMap[currentWalletNetwork]
    //     const Api = new crucibleApi()
    //     Api.signInToServer(walletAddress)
    //     Api.gatewayApi({
    //       command: 'logCsprTransaction', data: {
    //         receiveNetwork: networkData.sendNetwork,
    //         sendAmount: amount,
    //         sendAddress: `${selectedAccount?.address}`,
    //         receiveAddress: walletAddress,
    //         sendNetwork: '109090',
    //         sendTimestamp: Date.now(),
    //         sendCurrency: `CSPR:222974816f70ca96fc4002a696bb552e2959d3463158cd82a7bfc8a94c03473`,
    //         receiveCurrency: `${networkData.sendCurrency}`,
    //         creator: `cspr:${selectedAccount?.address}`,
    //         id: transaction
    //     }, params: [] });
    //   }
    // }, [isSuccessful])

    useEffect(() => {
        if (transaction && !isDone) {
          console.log('here', transaction, isDone)
          setProcessing(true)
          let intervalId = setInterval(
            () =>  checkTransaction()
          , 30000)
          setIntervalId(intervalId)
        }

        if (transaction && isDone) {
          clearInterval(intervalId)
        }
    }, [transaction, isDone])


    const generateWithdraw = () => {
      if (isSuccessful && isSwap) {
        //@ts-ignore
        const networkData = networksToChainIdMap[currentWalletNetwork]
        const Api = new crucibleApi()
        Api.signInToServer(walletAddress)
        Api.gatewayApi({
          command: 'logCsprTransaction', data: {
            receiveNetwork: networkData.sendNetwork,
            sendAmount: currentWalletNetwork === 1 ? (Number(amount) * 1000000) : Web3.utils.toWei(amount, 'ether'),
            sendAddress: `${selectedAccount?.address}`,
            receiveAddress: walletAddress,
            sendNetwork: '109090',
            sendTimestamp: Date.now(),
            sendCurrency: `CSPR:222974816f70ca96fc4002a696bb552e2959d3463158cd82a7bfc8a94c03473`,
            receiveCurrency: `${networkData.sendCurrency}`,
            creator: `cspr:${selectedAccount?.address}`,
            id: transaction
        }, params: [] });
      }
    }

    return (
      <FDialog
        variant={"dark"}
        size={"medium"}
        onHide={() => {
          onHide()
          setIsDone(false)
          setProcessing(false)
          setIsSuccessful(false)
          generateWithdraw()
        }}
        show={show}
        className="connect-wallet-dialog text-center"
        showClose={true}
        title={""}
      >
        <FList display="block" type="number" variant="connect-wallet">
          {
            isDone && transaction ?
              isSuccessful ?
                <img src={Success} width={"120px"} />
              : <img src={Failure} width={"120px"} />
            : transaction && processing ?
              <img src={LoaderGif} width={"120px"} />
            : evmSuccessful ?
              <img src={Success} width={"120px"} />
            : <img src={Loader} width={"120px"} />
          }
          <FTypo size={20} className={"f-mb--5 f-mt--9"}> 
            {
              isDone && transaction ?
               isSuccessful ?
                  (
                    <p>
                      <p>Transaction processed successfully</p>
                      {
                        isSwap && <p style={{fontSize: 12, marginTop: "2px", color: '#D9B373', cursor: 'pointer'}} onClick={async () => { await generateWithdraw(); navigate.push('/withdraw') }}>Kindly Proceed to withdraw</p>
                      }
                    </p>
                  )
               : ('Transaction failed on chain')
              :  evmSuccessful ?
                (
                  <p>
                    <p>Transaction processed successfully</p>
                    {
                      isSwap && <p style={{fontSize: 12, marginTop: "2px", color: '#D9B373', cursor: 'pointer'}} onClick={async () => { await generateWithdraw(); navigate.push('/withdraw') }}>Kindly Proceed to withdraw</p>
                    }
                  </p>
                )
              : (message || 'Loading')
            }
          </FTypo>
          <a href={`https://cspr.live/deploy/${transaction}`} target="_blank" style={{"color": "white"}}>
            <FTypo size={15} className={"f-mb--5 f-mt--9"}>
              <FTruncateText text={transaction} />
            </FTypo>
          </a>
        </FList>
      </FDialog>
    );
  };
  
export default ConfirmationDialog
  