import { useEffect, useState } from "react";
import { FButton, FCard, FGrid, FGridItem, FInputText, FItem, FSelect, FTypo } from "ferrum-design-system";
import { useDispatch, useSelector } from "react-redux";
import { getStakingInfo } from "../utils/DateUtil";
import { connectWallet, connectWallet as connectWalletDispatch } from '../redux/casper/casperActions';
import { useHistory, useParams } from "react-router";
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
import toggle from './../assets/images/Frame 7.png';
import casper_icon from './../assets/images/image 24.png';
import wc_icon from './../assets/images/Vector (1).png';
import { useForm } from "react-hook-form";
import { ApprovableButtonWrapper } from "../components/connector/web3Client/approvalButtonWrapper";
import { walletConnectorActions } from "../components/connector/wallet-connector";

const RPC_API = "https://casper-proxy-app-03c23ef9f855.herokuapp.com?url=https://rpc.mainnet.casperlabs.io/rpc";

const casperService = new CasperServiceByJsonRPC(RPC_API);
const casperClient = new CasperClient(RPC_API);

export const CasperSwap = () => {
  const navigate = useHistory();
  const { bridgePoolAddress }: any = useParams();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [evmLoading, setEvmLoading] = useState<boolean>(false);
  const [evmSuccessful, setEvmSuccessful] = useState<boolean>(false);

  const [isSwap, setIsSwap] = useState(false);
  const [networkId, setNetwork] = useState<number | null>(null)
  const [origins, setOrigins] = useState([
    {
      value: "CASPER NETWORK",
      label:  <span className="address"> <span><img src={casper_icon} width={15} /> <span>Casper Network</span></span></span>,
      name: "CASPER"
    }
  ]);

  const [destinations, setDestinations] = useState([
    {
      value: "BSC",
      label:  <p className="address" onClick={() => performSwitchNetwork({"networkId": 56})}> <span><img src={wc_icon} width={15} /> <span>BSC</span></span></p>,
      name: "BSC"
    },
    {
        value: "POLYGON",
        label:  <p className="address" onClick={() => performSwitchNetwork({"networkId": 137})}> <span><img src={'https://i.imgur.com/LErL1xc.png'} width={15} /> <span>POLYGON</span></span></p>,
        name: "POLYGON"
    },
    {
      value: "ETHEREUM",
      label:  <p className="address" onClick={() => performSwitchNetwork({"networkId": 1})}> <span><img src={'https://i.imgur.com/xaaAZFT.png'} width={15} /> <span>ETHEREUM</span></span></p>,
      name: "ETHEREUM"
    }
  ]);

  const [amount, setAmount] = useState();

  const [targetNetwork, setTargetNetwork] = useState('30');
  const [targetToken, setTargetToken] = useState('Ferrum_Test_Token');
  const [processMsg, setProcessMsg] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const connection = useSelector((state: any) => state.casper.connect)

  const { connect: { config, selectedAccount, isWalletConnected, signedAddresses, network } } = useSelector((state: any) => state.casper);
  const { connect: con } = useSelector((state: any) => state.casper);

  const {
    // reset,
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    getValues,
    reset,
    watch
    // watch,
  } = useForm({
    defaultValues: {
      "source": {
        value: "CASPER NETWORK",
        label:  <span className="address"> <span><img src={casper_icon} width={20} /> <span>Casper Network</span></span></span>,
        name: "CASPER"
      },
      "destination": {
        value: "BSC",
        label:  <span className="address"> <span><img src={wc_icon} width={20} /> <span>BSC</span></span></span>,
        name: "BSC"
      }
    }
  });

  const handleSwitch = async () => {
    const origin: {value: any, label: any, name: any}[] = origins
    const destination: {value: any, label: any, name: any}[] = destinations

    await  setOrigins(destination)
    await setDestinations(origin)

    if (destinations.length > 1) {
      setValue("source", getValues()?.destination)
      setValue("destination", origin[0])
    }else {
      setValue("destination", getValues()?.source)
      setValue("source", destinations[0])
    }
  }

  useEffect(() => {
    //@ts-ignore
    const casperWalletProvider = window.CasperWalletProvider;  
    const provider = casperWalletProvider();
    return provider
  }, [])

  const { isConnected, isConnecting, currentWalletNetwork, walletAddress, networkClient } = useSelector((state: any) => state.casper.walletConnector);
  //@ts-ignore
  let network3 = window.ethereum?.networkVersion
  
  useEffect(() => {    
    const origin: {value: any, label: any, name: any}[] = origins
    const destination: {value: any, label: any, name: any}[] = destinations
    const { ethereum } = window as any;
    //@ts-ignore
    let network = window.ethereum?.networkVersion
    //@ts-ignore
    console.log(network, networksToChainIdMap[network])
    //@ts-ignore
    if (network && networksToChainIdMap[network]) {
      if (origin.length > 1 ) {
        //@ts-ignore
        const item = destinations.find(e => e.name === networksToChainIdMap[network].chain)
        if (item) setValue("source", item)
      }
      console.log('heree')
      //@ts-ignore
      const item = destinations.find(e => e.name === networksToChainIdMap[network].chain)
      if (item) setValue("destination", item)
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      await ethereum.enable();
      dispatch(walletConnectorActions.resetWalletConnector());
      dispatch(walletConnectorActions.connectWallet());
    };
    ethereum.on("accountsChanged", handleAccountsChanged);
    
  }, [currentWalletNetwork, network3])

  const performSwapReverse = async () => {
    //@ts-ignore
    const networkData = networksToChainIdMap[currentWalletNetwork]
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
      // navigate.push(`/${config._id}`);
    }
  };

  async function swapEvm():Promise<any>{
    try {
      setIsSwap(true)
      setEvmLoading(true)
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
          setEvmSuccessful(true)
          setEvmLoading(false)
        }
      }
    } catch (error) {
      setEvmLoading(false)

      //@ts-ignore
      if (error?.response?.data?.error) {
        //@ts-ignore
        toast(error?.response?.data?.error)
      }else {
        toast("Error occured processing transaction")
      }
      console.log(error)
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
    await provider?.requestConnection()

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
      setIsSwap(true)
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

          const payment = DeployUtil.standardPayment(10000000000);

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
      // navigate.push(`/${config._id}`);
    }
  };

  const performCasperApproval = async () => {
    if (
      isWalletConnected &&
      selectedAccount
    ) {
      setIsSwap(false)
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
        //toast.success(`${amount} tokens are staked successfully`);
        
        } catch (e) {
          console.log("ERROR : ", e);
            toast.error("An error occured please see console for details");
        } finally {
        //setLoading(false)
        }

    } else {
    }
  };

  const revertNetwork = () => {
    const origin: {value: any, label: any, name: any}[] = origins
    const destination: {value: any, label: any, name: any}[] = destinations
    //@ts-ignore
    let network = window.ethereum?.networkVersion
    //@ts-ignore
    if (network && networksToChainIdMap[network]) {
      if (origin.length > 1 ) {
        //@ts-ignore
        const item = destinations.find(e => e.name === networksToChainIdMap[network].chain)
        if (item) setValue("source", item)
      }
      //@ts-ignore
      const item = destinations.find(e => e.name === networksToChainIdMap[network].chain)
      if (item) setValue("destination", item)
    }
  }

  const performSwitchNetwork = async (item: any) => {
    try {
      //@ts-ignore
      let ethereum = window.ethereum;
      if (ethereum) {
        const hexChainId = Number(item.networkId).toString(16);
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${hexChainId}` }],
        });
        setNetwork(Number(item.networkId))

        //@ts-ignore
        let network3 = window.ethereum?.networkVersion
        dispatch(walletConnectorActions.resetWalletConnector());
        dispatch(walletConnectorActions.connectWallet());
      }
    } catch (err: any) {
        revertNetwork()
        toast.error(err?.message);
    }
  };


  //@ts-ignore
  const networkData = networksToChainIdMap[networkId?.toString() || currentWalletNetwork]
  watch()

  return (
    <>
      <FCard className={"card-staking f-mb-2 f-mt-4"}>
        <FGrid>
          <FTypo size={18} align={"center"} className={"f-mb--5 f-mt--7 f-pb-2 title"}>
            SWAP FROM {getValues()?.source?.value} TO {getValues()?.destination?.value}
          </FTypo>
          <FGridItem alignX={"center"} size={[10, 8, 12]} className="f-m-auto f-mb-2">
            <FItem align={"center"} className="f-mb-1">
              <FSelect 
                options={[{
                  value: "FERRUM_TOKEN_TEST",
                  label: "FERRUM_TOKEN_TEST",
                  name: "FERRUM_TOKEN_TEST"
                }]}
                placeholder="FERRUM TEST TOKEN"
                name="FERRUM_TOKEN_TEST"
                value={"FERRUM_TOKEN_TEST"}
                isDisabled
               />
            </FItem>
            <FItem align={"center"}>
              <form autoComplete="off" onSubmit={handleSubmit(() => {})}>
                <div className={'swap_toggle_container'}>
                    <FSelect 
                      control={control}
                      register={register}
                      options={origins}
                      name="source"
                      label="From"
                      onChange={(e: any) => {
                        console.log(e)
                      }}
                    />
                    <div>
                      <img src={toggle} onClick={() => handleSwitch()} />
                    </div>
                    <FSelect 
                      control={control}
                      register={register}
                      options={destinations}
                      name="destination"
                      label="To"
                    />
                  </div>
              </form>
              <FInputText
                className={"f-mt-3 f-align-start swap-amount"}
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
              />
              <FGridItem alignX={"center"} className="f-m-auto f-mb-1">
                
                {
                  (isConnected && selectedAccount?.address && walletAddress && isWalletConnected) ?
                    (
                      getValues()?.source?.value === 'CASPER NETWORK' ?
                        <FButton 
                          title={"SWAP"}
                          className="w-100 f-mt-2 sm-button"
                          data-testid={'swap-casper-button'}
                          onClick={performSwap}
                        />
                      : <ApprovableButtonWrapper
                          userAddress={walletAddress}
                          amount={amount || '0.0001'}
                          currency={networkData?.currency}
                          contractAddress={networkData?.contract}
                          View={(ownProps) => {
                            return <FButton 
                              title={ownProps.isApprovalMode ? "APPROVE" : "SWAP"}
                              className="w-100 f-mt-2 sm-button"
                              data-testid={'swap-casper-button'}
                              onClick={ownProps.isApprovalMode ? ownProps.onApproveClick : swapEvm}
                            />
                          }}
                        />
                    )
                  : !walletAddress ?
                      (
                        <div className="w-60 f-mt-2">
                          <MetaMaskConnector.WalletConnector
                            WalletConnectView={FButton}
                            WalletConnectModal={ConnectWalletDialog}
                            isAuthenticationNeeded={false}
                            WalletConnectViewProps={{ className: "w-100" }}
                          />
                        </div>
                      )
                  :  <FButton 
                      title={"Connect to Casper Wallet"}
                      className="w-100 f-mt-2 sm-button"
                      data-testid={'swap-casper-button'}
                      onClick={connectWallet}
                    />
                }
              </FGridItem>
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
      <ConfirmationDialog
          evmSuccessful={evmSuccessful}
          amount={amount}
          onHide={() => {
            setShowConfirmation(false)
            setEvmSuccessful(false)
            setProcessMsg("")
            console.log(isSwap)
          }} 
          transaction={processMsg}
          message={'Transaction sent to network and is processing.'}
          show={showConfirmation}
          isSwap={isSwap}
          network={networkData?.sendNetwork}
        />
      <TxProcessingDialog onHide={() =>setEvmLoading(false)} message={ processMsg || "Transaction Processing...."} show={evmLoading}/>
    </>
  );
};

export default CasperSwap
