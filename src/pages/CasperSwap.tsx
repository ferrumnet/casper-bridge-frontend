import { useEffect, useState } from "react";
import { FButton, FCard, FGrid, FGridItem, FInputText, FItem, FTypo } from "ferrum-design-system";
import { useDispatch, useSelector } from "react-redux";
import { getStakingInfo } from "../utils/DateUtil";
import { connectWallet, connectWallet as connectWalletDispatch } from '../redux/casper/casperActions';
import { useHistory, useParams } from "react-router";
import './layout.scss';
import { CasperServiceByJsonRPC, CLPublicKey, CLValue, 
  CLValueBuilder, 
  decodeBase16, 
  DeployUtil,
  RuntimeArgs,
  Signer,
  CasperClient
} from "casper-js-sdk";
import toast from "react-hot-toast";
import TxProcessingDialog from "../dialogs/TxProcessingDialog";
import ConfirmationDialog from "../dialogs/ConfirmationDialog";
import { MetaMaskConnector } from "../components/connector";
import { ConnectWalletDialog } from "../utils/connect-wallet/ConnectWalletDialog";
import { crucibleApi } from "../client";
import { Web3Helper } from "../utils/web3Helper";
import { networksToChainIdMap } from "../utils/network";
import { setContractHash } from "../utils/stringParser";

const RPC_API = "https://casper-proxy-app-03c23ef9f855.herokuapp.com?url=https://rpc.mainnet.casperlabs.io/rpc";

const casperService = new CasperServiceByJsonRPC(RPC_API);
const casperClient = new CasperClient(RPC_API);

export const CasperSwap = () => {
  const navigate = useHistory();
  const { bridgePoolAddress }: any = useParams();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState();
  const [isSwap, setIsSwap] = useState(false);

  const [targetNetwork, setTargetNetwork] = useState('30');
  const [targetToken, setTargetToken] = useState('Ferrum_Test_Token');
  const [processMsg, setProcessMsg] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const connection = useSelector((state: any) => state.casper.connect)

  const { connect: { config, selectedAccount, isWalletConnected, signedAddresses, network } } = useSelector((state: any) => state.casper);

  useEffect(() => {
    //@ts-ignore
    const casperWalletProvider = window.CasperWalletProvider;  
    const provider = casperWalletProvider();
    return provider
  }, [])

  const { isConnected, isConnecting, currentWalletNetwork, walletAddress, networkClient } =
    useSelector((state: any) => state.casper.walletConnector);

  const performSwapReverse = async () => {
    //@ts-ignore
    const networkData = networksToChainIdMap[currentWalletNetwork]
    console.log(networkData)
    if (
      isWalletConnected &&
      selectedAccount
    ) {
      setIsSwap(false)
      //@ts-ignore
      const casperWalletProvider = await window.CasperWalletProvider;    
      const provider = casperWalletProvider();
      setLoading(true)
      try {
        if (amount && Number(amount) > 0) {
          const publicKeyHex = selectedAccount?.address;
          const senderPublicKey = CLPublicKey.fromHex(publicKeyHex);

          const deployParams = new DeployUtil.DeployParams(
            senderPublicKey,
            'casper'
          );

          const args = RuntimeArgs.fromMap({
            "amount": CLValueBuilder.u256(Number(amount) * 100),
            "token_address": CLValueBuilder.string('contract-package-wasm5fe4b52b2b1a3a0eebdc221ec9e290df1535ad12a7fac37050095201f449acc4'),
            "target_network": CLValueBuilder.u256(targetNetwork),
            "target_token": CLValueBuilder.string(networkData?.targetToken || targetToken),
            "target_address": CLValueBuilder.string(walletAddress),
          });

          const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
            decodeBase16('e0f1bcfbbc1554dc0cbd1316cc1658645b58898aa5add056985f9d6cb0f6f75b'),
            'swap_reverse',
            args
          );

          const payment = DeployUtil.standardPayment(9000000000);

          const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

          const deployJson: any = DeployUtil.deployToJson(deploy);
        
          provider.sign(JSON.stringify(deployJson), publicKeyHex).then(async (signedDeployJson: any) => {
            const signedDeploy = DeployUtil.setSignature(
              deploy,
              signedDeployJson.signature,
              CLPublicKey.fromHex(publicKeyHex)
            );
            // const signedDeploy = DeployUtil.deployFromJson(signedDeployJson);
            if (signedDeploy) {
              const res = await casperClient.putDeploy(signedDeploy);
              console.log(res, 'resres');
              setProcessMsg(res)
              setLoading(false)
              setShowConfirmation(true)
            }
            
          });
          // navigate.push(`/${config._id}`);
          //toast.success(`${amount} tokens are staked successfully`);
        } else {
          toast.error("Amount must be greater than 0");
        }
      } catch (e) {
        toast.error("An error occured please see console for details");
      } finally {
        //setLoading(false)
      }

    } else {
      navigate.push(`/${config._id}`);
    }
  };

  console.log(currentWalletNetwork, 'currentWalletNetworkcurrentWalletNetwork')
  async function swapEvm():Promise<any>{
    //@ts-ignore
    const networkData = networksToChainIdMap[currentWalletNetwork]
    const Api = new crucibleApi()
    await Api.signInToServer(walletAddress)
		const res = await Api.gatewayApi({
            command: 'swapGetTransaction', data: {
              amount: amount,
              targetCurrency: `CSPR:222974816f70ca96fc4002a696bb552e2959d3463158cd82a7bfc8a94c03473`,
              currency: networkData?.currency || 'BSC:0xfe00ee6f00dd7ed533157f6250656b4e007e7179'
          },
			params: [] });
    
    if (res.data.requests) {
      const helper = new Web3Helper(networkClient)
      const tx = await helper.sendTransactionAsync(
        dispatch,
        res.data.requests
      )
      if (tx) {

        const res = await Api.gatewayApi({
          command: 'logEvmAndNonEvmTransaction', data: {
            "id": tx.split("|")[0],
            "sendNetwork": networkData?.sendNetwork,
            "sendAddress":  `${walletAddress}`,
            "receiveAddress": `${selectedAccount?.address}`,
            "sendCurrency": networkData?.currency || "BSC:0xfe00ee6f00dd7ed533157f6250656b4e007e7179",
            "sendAmount": amount,
            "receiveCurrency": `CSPR:222974816f70ca96fc4002a696bb552e2959d3463158cd82a7bfc8a94c03473`,
        },
        params: [] });
        setShowConfirmation(true)
      }
    }
	}

  async function AccountInformation() {
    //@ts-ignore
    const casperWalletProvider = await window.CasperWalletProvider;    
    const provider = casperWalletProvider();
    const isConnected = await provider.isConnected();

    if (isConnected) {
      try {
        const publicKey = await provider.getActivePublicKey();
        //textAddress.textContent += publicKey;
        const latestBlock = await casperService.getLatestBlockInfo();

        // const root = await casperService.getStateRootHash(latestBlock?.block?.header?.state_root_hash);

        await connectWalletDispatch([{
          "address": publicKey
        }])(dispatch)
        const balanceUref = await casperService.getAccountBalanceUrefByPublicKey(latestBlock?.block?.header?.state_root_hash || '', CLPublicKey.fromHex(publicKey));
        console.log(balanceUref, 'balanceUrefbalanceUref')
        if (latestBlock?.block?.header?.state_root_hash) {
          const balance = await casperService.getAccountBalance(latestBlock?.block?.header?.state_root_hash, balanceUref);
        }

        console.log('hellooo')

        const info = await casperService.getDeployInfo(
          'aaa631f3491be84ebd92485f95e0d311288fc6f4e529756b4da63870eee8a416'
        )

        // @ts-ignore
        const infoArguments = (info.deploy.session.ModuleBytes.args || []).find(
          (e: any) => e[0] === 'erc20_contract_hash'
        )

        if (infoArguments) {
          const token = infoArguments[1].parsed.split('-')[1]


          const tokenName = await casperService.getBlockState(
            //@ts-ignore
            latestBlock?.block?.header?.state_root_hash,
            `hash-${token}`,
            ['name']
          )
  
          const tokenSymbol = await casperService.getBlockState(
             //@ts-ignore
             latestBlock?.block?.header?.state_root_hash,
             `hash-${token}`,
             ['symbol']
          )
  

          if(info.deploy.session) {
            // @ts-ignore
            configLoaded({
              // @ts-ignore
              config: info.deploy.session.ModuleBytes.args,
              tokenInfo: {
                tokenSymbol: tokenSymbol.CLValue?.data,
                tokenName: tokenName.CLValue?.data
              }
            })(dispatch);
            //@ts-ignore
            signed(info.deploy.approvals)(dispatch)
            //@ts-ignore
          }
        }
        
      } catch (error: unknown) {
        if (error?.toString().includes('params')) return
        toast.error(`An error occured Error: ${error}`);
      }
    }
  }

  const connectWallet = async () => {
    //@ts-ignore
    const casperWalletProvider = await window.CasperWalletProvider;
    
    const provider = casperWalletProvider();

    const isConnected = await provider.isConnected();

    if (isConnected) {
      await AccountInformation();
    }   
  };

  const performSwap = async () => {
    //@ts-ignore
    const networkData = networksToChainIdMap[currentWalletNetwork]
    if (
      isWalletConnected &&
      selectedAccount
    ) {
      //@ts-ignore
      const casperWalletProvider = await window.CasperWalletProvider;    
      const provider = casperWalletProvider();
      setLoading(true)
      try {
        if (amount && Number(amount) > 0) {
          const publicKeyHex = selectedAccount?.address;
          const senderPublicKey = CLPublicKey.fromHex(publicKeyHex);

          const deployParams = new DeployUtil.DeployParams(
            senderPublicKey,
            'casper'
          );

          const args = RuntimeArgs.fromMap({
            "amount": CLValueBuilder.u256(Number(amount) * 100),
            "token_address": CLValueBuilder.string('contract-package-wasm5fe4b52b2b1a3a0eebdc221ec9e290df1535ad12a7fac37050095201f449acc4'),
            "target_network": CLValueBuilder.u256(targetNetwork),
            "target_token": CLValueBuilder.string(networkData?.targetToken || targetToken),
          });

          const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
            decodeBase16('e0f1bcfbbc1554dc0cbd1316cc1658645b58898aa5add056985f9d6cb0f6f75b'),
            'swap',
            args
          );

          const payment = DeployUtil.standardPayment(5000000000);

          const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

          const deployJson: any = DeployUtil.deployToJson(deploy);
        
          provider.sign(JSON.stringify(deployJson), publicKeyHex).then(async (signedDeployJson: any) => {
            const signedDeploy = DeployUtil.setSignature(
              deploy,
              signedDeployJson.signature,
              CLPublicKey.fromHex(publicKeyHex)
            );
            // const signedDeploy = DeployUtil.deployFromJson(signedDeployJson);
            if (signedDeploy) {
              const res = await casperClient.putDeploy(signedDeploy);
              console.log(res, 'resres');
              setProcessMsg(res)
              setLoading(false)
              setShowConfirmation(true)
            }
            
          });
          // navigate.push(`/${config._id}`);
          //toast.success(`${amount} tokens are staked successfully`);
        } else {
          toast.error("Amount must be greater than 0");
        }
      } catch (e) {
        toast.error("An error occured please see console for details");
        navigate.push(`/${config?._id}`);
      } finally {
        //setLoading(false)
      }

    } else {
      navigate.push(`/${config._id}`);
    }
  };

  const performCasperApproval = async () => {
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
            "amount": CLValueBuilder.u256(Number(5000000000000000).toFixed()),
            'spender': setContractHash(`hash-a690c81a73e604c90541b05214b512181cfe457ae393ba68e74b111f66cde3d5`)
          });

        const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        decodeBase16('31dbbadf2b6e06be54d834da408469783abe63e404ede27d83e900ed2886f1b6'),
        'approve',
        args
        );

        const payment = DeployUtil.standardPayment(2000000000);

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
            // navigate.push(`/${config._id}`);
        } finally {
        //setLoading(false)
        }

    } else {
        navigate.push(`/${config._id}`);
    }
  };

  //@ts-ignore
  const networkData = networksToChainIdMap[currentWalletNetwork]

  return (
    <>
      <FCard className={"card-staking f-mb-2"}>
        <FGrid>
          <FTypo size={18} align={"center"} className={"f-mb--5 f-mt--7"}>
            SWAP FROM {networkData?.chain || 'BSC'} TO CASPER
          </FTypo>
          <FGridItem alignX={"center"} size={[8, 8, 12]} className="f-m-auto f-mb-1">
            <FItem align={"center"}>
              <FInputText
                className={"f-mt-2"}
                label={"AMOUNT TO SWAP"}
                placeholder={"0"}
                value={amount}
                data-testid={"bsctocasper_input"}
                onChange={(e: any) => {
                  e.preventDefault();
                  const re = /^-?\d*\.?\d*$/;
                  if (e.target.value === "" || re.test(e.target.value)) {
                    setAmount(e.target.value);
                  }
                }}
                postfix={
                  <FTypo className={"f-pr-1"} color="#dab46e">
                    TOKEN
                  </FTypo>
                }
              />
              <FInputText
                className={"f-mt-2"}
                label={"Target Network"}
                disabled
                value={'CASPER'}
                onChange={(e: any) => {}}
              />
              <FInputText
                className={"f-mt-2"}
                label={"Target Token"}
                disabled
                value={targetToken}
                onChange={(e: any) => {}}
              />
              {
                isConnected ?
                (
                  <FButton 
                    title={"SWAP"}
                    className="w-100 f-mt-2"
                    data-testid={'swap-casper-button'}
                    onClick={() => swapEvm()}
                  />
                )
                : (
                  <div className="w-100 f-mt-2">
                    <MetaMaskConnector.WalletConnector
                      WalletConnectView={FButton}
                      WalletConnectModal={ConnectWalletDialog}
                      isAuthenticationNeeded={false}
                      WalletConnectViewProps={{ className: "w-100" }}
                    />
                  </div>
                )
              }
            </FItem>
          </FGridItem>
        </FGrid>
        <ConfirmationDialog
          amount={amount}
          onHide={() => {
            setShowConfirmation(false)
            setProcessMsg("")
          }} 
          transaction={processMsg}
          message={'Transaction sent to network and is processing.'}
          show={showConfirmation}
          isSwap={true}
          network={networkData?.sendNetwork}
        />
        <TxProcessingDialog onHide={() =>setLoading(false)} message={ processMsg || "Transaction Processing...."} show={loading}/>
      </FCard>
      <div style={{"zIndex": isConnected ? 1 : 0, "width": "100%"}}>
        <FCard className={`card-staking f-mb-2`}>
          <FGrid alignX={"center"} className="f-mb-1">
            <FTypo size={18} align={"center"} className={"f-mb-14 f-mt--7"}>
              SWAP FROM CASPER TO {networkData?.chain || 'BSC'}
            </FTypo>
            <FGridItem alignX={"center"} size={[8, 8, 12]} className="f-m-auto f-mb-1">
              <FItem align={"center"}>    
                <FInputText
                  className={"f-mt-2"}
                  label={"AMOUNT TO SWAP "}
                  data-testid={"caspertoevm_input"}
                  placeholder={"0"}
                  value={amount}
                  onChange={(e: any) => {
                    e.preventDefault();
                    const re = /^-?\d*\.?\d*$/;
                    if (e.target.value === "" || re.test(e.target.value)) {
                      setAmount(e.target.value);
                    }
                  }}
                  postfix={
                    <FTypo className={"f-pr-1"} color="#dab46e">
                      TOKEN
                    </FTypo>
                  }
                />
                <FInputText
                  className={"f-mt-2"}
                  label={"Target Network"}
                  disabled
                  value={networkData?.chain}
                  onChange={(e: any) => {}}
                />
                <FInputText
                  className={"f-mt-2"}
                  label={"Target Token"}
                  disabled
                  value={targetToken}
                  onChange={(e: any) => {}}
                />
                {
                  (connection.isWalletConnected && isConnected) && (
                    <>
                      <FButton 
                        title={"SWAP"}
                        className="w-100 f-mt-2"
                        onClick={() => performSwap()}
                      />
                      <div className="w-100 f-mt-2 flex jc jc-end" style={{"cursor": "pointer"}} onClick={() => performCasperApproval()}>Approve</div>
                    </>
                  )
                }
                {
                  !connection.isWalletConnected ? 
                    <FButton title={"Connect Casper Signer"} className="w-100 f-mt-2" onClick={() => connectWallet()} />
                  : !isConnected ? (
                      <div className="w-100 f-mt-2">
                        <MetaMaskConnector.WalletConnector
                          WalletConnectView={FButton}
                          WalletConnectModal={ConnectWalletDialog}
                          isAuthenticationNeeded={false}
                          WalletConnectViewProps={{ className: "w-100" }}
                        />
                      </div>
                    )
                  : <></>
                }
                {
                  //     <FButton
                  //       title={stakingInfo.isStakingOpen ? "Stake" : stakingInfo.isEarlyWithdraw ? "Early Withdraw" : stakingInfo.isWithdrawOpen ? "Maturity Withdraw" : "Refresh"}
                  //       className="w-100 f-mt-2"
                  //       onClick={() => {
                  //         // console.log("staking");
                  //         // dispatch(algorandActions.shouldStake());
                  //         if (getStakingInfo(connection?.config?.stakingEnds, connection?.config?.stakingStarts, connection?.config?.withdrawStarts, connection?.config?.withdrawEnds).isStakingOpen) {
                  //           // navigate.push(`/${stakingId}/submit-stake`);
                  //         } else if (
                  //           getStakingInfo(connection?.config?.stakingEnds, connection?.config?.stakingStarts, connection?.config?.withdrawStarts, connection?.config?.withdrawEnds).isEarlyWithdraw ||
                  //           getStakingInfo(connection?.config?.stakingEnds, connection?.config?.stakingStarts, connection?.config?.withdrawStarts, connection?.config?.withdrawEnds).isWithdrawOpen
                  //         ) {
                  //           // console.log(stakingId, 'withdrawwww')
                  //           // navigate.push(`/${stakingId}/submit-withdraw`);
                  //         } else {
                  //           window.location.reload();
                  //         }
                  //       }}
                  //     />
                  //   )
                  // 
                }
              </FItem>
            </FGridItem>
          </FGrid>
        </FCard>
      </div>
      <ConfirmationDialog
          amount={amount}
          onHide={() => {
            setShowConfirmation(false)
            setProcessMsg("")
            console.log(isSwap)
          }} 
          transaction={processMsg}
          message={'Transaction sent to network and is processing.'}
          show={showConfirmation}
          isSwap={isSwap}
          network={networkData?.sendNetwork}
        />
      <TxProcessingDialog onHide={() =>setLoading(false)} message={ processMsg || "Transaction Processing...."} show={loading}/>
    </>
  );
};

export default CasperSwap
