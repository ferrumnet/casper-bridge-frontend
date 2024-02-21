import { FTypo, FGrid, FTable, FButton } from "ferrum-design-system";
import { useEffect, useState } from "react";
import DatatableWrapper from "react-bs-datatable";
import { useDispatch, useSelector } from "react-redux";
import { crucibleApi } from "../client";
import { fetchWithdrawals } from "../redux/casper/casperActions";
import { Networks, NetworksId } from "../utils/stringUtils";

import { Web3Helper } from "../utils/web3Helper";
import { MetaMaskConnector } from "./connector";
import { ConnectWalletDialog } from "../utils/connect-wallet/ConnectWalletDialog";
import { 
    CLPublicKey,
    CLValueBuilder, 
    decodeBase16, 
    DeployUtil,
    RuntimeArgs,
    CasperClient
} from "casper-js-sdk";
import toast from "react-hot-toast";
import ConfirmationDialog from "../dialogs/ConfirmationDialog";
import TxProcessingDialog from "../dialogs/TxProcessingDialog";
import Web3 from "web3";
import { networksToChainIdMap } from "../utils/network";
import moment from "moment";
import withdrawIcon from './../assets/images/wiithdrawIcon2.svg';
import { walletConnectorActions } from "./connector/wallet-connector";


const RPC_API = "https://casper-proxy-app-03c23ef9f855.herokuapp.com?url=https://rpc.mainnet.casperlabs.io/rpc";
const casperClient = new CasperClient(RPC_API);
const CASPER_ADDRESS = "CSPR:222974816f70ca96fc4002a696bb552e2959d3463158cd82a7bfc8a94c03473"

export const Withdrawals = () => {
    const [evmLoading, setEvmLoading] = useState<boolean>(false);
    const { connect: { config, selectedAccount, isWalletConnected, withdrawalItems } } = useSelector((state: any) => state.casper);
    const { walletAddress, isConnected, networkClient, currentWalletNetwork } = useSelector((state: any) => state.casper.walletConnector);
    const [loading, setLoading] = useState(false);
    const [processMsg, setProcessMsg] = useState('');
    const [txId, setTxId] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [evmSuccessful, setEvmSuccessful] = useState<boolean>(false);


    const dispatch = useDispatch();
    async function withdrawEvm(id: string, item: any):Promise<any>{
      try {
        setEvmLoading(true)
        //@ts-ignore
        const networkData = networksToChainIdMap[currentWalletNetwork]
        const Api = new crucibleApi()
        await Api.signInToServer(walletAddress)
            const res = await Api.gatewayApi({
              "command": "withdrawEvmItem",
               "data": {
                "id": id,
                "txType": "swap",
                "sendNetwork": 109090,
                "receiveNetwork": `${item.receiveNetwork}`,
                "used": "",
                "user": walletAddress,
                "sendAddress": walletAddress,
                "receiveAddress": selectedAccount?.address,
                "sendCurrency": item?.sendCurrency,
                "sendAmount":  item.sendAmount,
                "receiveCurrency": CASPER_ADDRESS
              },
              "params": []
            });
        if (res.data) {
          const helper = new Web3Helper(networkClient)
          const tx = await helper.sendTransactionAsync(
            dispatch,
            [res.data]
          )
          if(tx) {
            setEvmLoading(false)
            setShowConfirmation(true)
            setEvmSuccessful(true)
            await Api.gatewayApi({
              "command": "updateEvmAndNonEvmTransaction",
               "data": {
                "id": id,
                "used": true,
              },
              "params": []
            }
            );
            
            await fetchEvmWithdrawalItems()
          }
        }
      } catch (error) {
        //@ts-ignore
        if (error?.response?.data?.error) {
          //@ts-ignore
          toast(error?.data?.message)
          //@ts-ignore
        } else if (error?.data?.message) {
          //@ts-ignore
          toast(error?.data?.message)
        } else {
          toast("Error occured processing transaction, kindly try again")
        }
        setEvmLoading(false)
      }
    }    

    const fetchEvmWithdrawalItems = async () => {
        const Api = new crucibleApi()
        await Api.signInToServer(`CSPR:${selectedAccount?.address}`)
        const userWithdrawals = await Api.gatewayApi({
          command: 'getUserNonEvmWithdrawItems', data: {
            userAddress: `${selectedAccount?.address}`,
            network: "MUMBAI_TESTNET",
            receiveAddress: walletAddress,
        }, params: [] });
        if (userWithdrawals.data){
            await fetchWithdrawals(userWithdrawals.data.withdrawableBalanceItems)(dispatch);
        }
    }

    const performCasperWithdraw = async (amount: string, id: string) => {
        if (
          isWalletConnected &&
          selectedAccount
        ) {
          //@ts-ignore
          const casperWalletProvider = await window.CasperWalletProvider;    
          const provider = casperWalletProvider();
          try {
            // (selectedAccount?.address, Number(amount));
            const publicKeyHex = selectedAccount?.address;
            const senderPublicKey = CLPublicKey.fromHex(publicKeyHex);

            const deployParams = new DeployUtil.DeployParams(
            senderPublicKey,
            'casper'
            );

            const args = RuntimeArgs.fromMap({
                "amount": CLValueBuilder.u256((Number(amount)) * 100),
                "token_address": CLValueBuilder.string('contract-package-wasm5fe4b52b2b1a3a0eebdc221ec9e290df1535ad12a7fac37050095201f449acc4'),
              });
    
            const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
            decodeBase16('e0f1bcfbbc1554dc0cbd1316cc1658645b58898aa5add056985f9d6cb0f6f75b'),
            'withdraw',
            args
            );

            const payment = DeployUtil.standardPayment(10000000000);

            const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

            const deployJson: any = DeployUtil.deployToJson(deploy);
        
            provider.sign(JSON.stringify(deployJson), publicKeyHex).then(async (signedDeployJson: any) => {
                const signedDeploy = DeployUtil.setSignature(
                  deploy,
                  signedDeployJson.signature,
                  CLPublicKey.fromHex(publicKeyHex)
                );

                if (signedDeploy) {
                    const res = await casperClient.putDeploy(signedDeploy);
                    console.log(res, 'resres');
                    if (res) {
                      setTxId(id)
                    }
                    setProcessMsg(res)
                    setLoading(false)
                    setShowConfirmation(true)
                }
            });
              // navigate.push(`/${config._id}`);
            //toast.success(`${amount} tokens are staked successfully`);
            
            } catch (e) {
              console.log("ERROR : ", e);
                toast.error("An error occured please see console for details");
                // navigate.push(`/${config?._id}`);
            } finally {
            //setLoading(false)
            }

        } else {
            // navigate.push(`/${config._id}`);
        }
    };
        


    useEffect(() => {
       fetchEvmWithdrawalItems()
    }, [selectedAccount, walletAddress]);

    const tableHeads: any[] = [
        { width: 200, prop: "sourceNetwork", title: "FROM" },
        { prop: "targetNetwork", title: "TO" },
        { prop: "amount", title: "Amount" },
        { prop: "hash", title: "Transaction Hash" },
        { prop: "created", title: "Created" },
        { prop: "action", title: "Action" }
    ];

    function start_and_end(str: string) {
      if (str.length > 15) {
        return str.substr(0, 10) + '...' + str.substr(str.length-10, str.length);
      }
      return str;
    }

    const performSwitchNetwork = async (item: any) => {
      console.log(item)
      try {
        //@ts-ignore
        let ethereum = window.ethereum;
        if (ethereum) {
          const hexChainId = Number(item.networkId).toString(16);
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${hexChainId}` }],
          });
  
          //@ts-ignore
          let network3 = window.ethereum?.networkVersion
          dispatch(walletConnectorActions.resetWalletConnector());
          dispatch(walletConnectorActions.reconnectWallet());

          console.log(network3, 'network3network3')
        }
      } catch (err: any) {
          console.log(err)
          //@ts-ignore
          let ethereum = window.ethereum;
          toast.error(err?.message);
     
      }
    };

    const body = (withdrawalItems || []).map((item: any) => {
      //@ts-ignore
      const networkData = networksToChainIdMap[currentWalletNetwork]
      //@ts-ignore
      const chainInfo = NetworksId[item.receiveNetwork]
        return {
          created: <FTypo className={"col-amount"}>{moment(item.sendTimestamp).fromNow()}</FTypo>,
          amount: <FTypo className={"col-amount"}>{Number(item.sendAmount || 0) > 10000 ? Web3.utils.fromWei(item.sendAmount, 'ether') : item.sendAmount}</FTypo>,
          hash: <FTypo className={"col-amount"}>{start_and_end(item.id)}</FTypo>,
          sourceNetwork: <FTypo className={"col-amount"}>{
            //@ts-ignore
            Networks[item.sendNetwork] || item.sendNetwork
        }</FTypo>,
          targetNetwork: <FTypo className={"col-amount"}>{
            //@ts-ignore
            Networks[item.receiveNetwork] || item.receiveCurrency.split(":")[0]
        }</FTypo>,
          action: (
            <div className="col-action">
            {
                isConnected
                ? ( <FButton 
                      title={
                        //@ts-ignore
                        <span><img width={25} src={withdrawIcon}/> {((item.sendNetwork === "109090") && networkData['chain'] !=  Networks[item.receiveNetwork]) ? 'Switch Network' : item?.used ? "Withdrawn" :"Withdraw"} </span>
                      } 
                      disabled={item?.used}
                      //@ts-ignore
                      onClick={() => ((item.sendNetwork === "109090") && networkData['chain'] !=  Networks[item.receiveNetwork]) ? performSwitchNetwork({"networkId": networksToChainIdMap[chainInfo]['chainId']})
                        : !(item.sendNetwork === "109090") ? performCasperWithdraw((item.sendAmount).toString(), item?.id) : withdrawEvm(item.id, item)
                      }
                    />
                  )
                : (
                    <MetaMaskConnector.WalletConnector
                      WalletConnectView={FButton}
                      WalletConnectModal={ConnectWalletDialog}
                      isAuthenticationNeeded={false}
                      WalletConnectViewProps={{ className: "w-100" }}
                    />
                )
            }
            </div>
          ),
        }; 
    }).reverse(); 

    return (
        <div className="container_withdrawal_parent">
            <FGrid alignX={"center"} className="f-mb-1 withdrawals_container">
                <FTypo size={18} align={"center"} className={"f-mb-14 f-mt--7 f-mb-1 title"}>
                    Token Withdrawals
                </FTypo>
                <FTable>
                  <DatatableWrapper tableBody={body || []} tableHeaders={tableHeads} rowsPerPage={10} />
                </FTable>
            </FGrid>
            <ConfirmationDialog
              evmSuccessful={evmSuccessful}
              onHide={async () => {
                setShowConfirmation(false)
                setEvmSuccessful(false)
                setProcessMsg("")
                const Api = new crucibleApi()
                if (txId) {
                  await Api.gatewayApi({
                    "command": "updateEvmAndNonEvmTransaction",
                    "data": {
                      "id": txId,
                      "used": true,
                    },
                    "params": []
                  })
                }
                await fetchEvmWithdrawalItems()
              }}
              transaction={processMsg}
              message={'Transaction sent to network and is processing.'}
              show={showConfirmation}
              isSwap={false}
            />
            <TxProcessingDialog 
              onHide={
                async () => {
                  setLoading(false)
                }
              }
              message={ processMsg || "Transaction Processing...."}
              show={loading}
            />
            <TxProcessingDialog  onHide={
                async () => {
                  setLoading(false)
                }
              }
              message={ processMsg || "Transaction Processing...."}
              show={evmLoading}
          />

        </div>
    )
}

export default Withdrawals;
