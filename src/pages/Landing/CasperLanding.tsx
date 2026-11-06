import { FButton, FContainer, FInputCheckbox } from 'ferrum-design-system';

import metamask from './../../assets/images/metamask.png';
import casper from './../../assets/images/casper.png';
import casper_icon from './../../assets/images/image 24.png';
import wc_icon from './../../assets/images/Vector (1).png';

import { CasperClient, CasperServiceByJsonRPC, CLPublicKey, DeployUtil, RuntimeArgs, CLValueBuilder, decodeBase16 } from "casper-js-sdk";
import styles from './landing.module.scss';
import { useState } from 'react';
import { useSelector,useDispatch } from 'react-redux';
import toast from "react-hot-toast";
import { useHistory } from "react-router";
import { 
    connectWallet as connectWalletDispatch,
    resetWallet,
    configLoaded,
    signed
  } from '../../redux/casper/casperActions';
import { MetaMaskConnector } from '../../components/connector';
import { ConnectWalletDialog } from '../../utils/connect-wallet/ConnectWalletDialog';
import TxProcessingDialog from '../../dialogs/TxProcessingDialog';
import { setContractHash } from '../../utils/stringParser';
import ConfirmationDialog from '../../dialogs/ConfirmationDialog';
import { networksToChainIdMap } from '../../utils/network';

const RPC_API = "https://casper-proxy-app-03c23ef9f855.herokuapp.com?url=https://rpc.mainnet.casperlabs.io/rpc";

const casperService = new CasperServiceByJsonRPC(RPC_API);
const casperClient = new CasperClient(RPC_API);

export const  CasperLanding = () => {
    const [isApproved, setApproved] = useState(false)
    const [isSwap, setIsSwap] = useState(false);
    const [processMsg, setProcessMsg] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const navigate = useHistory();

    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const { connect: { selectedAccount, isWalletConnected } } = useSelector((state: any) => state.casper);
    const { currentWalletNetwork, walletAddress } =
    useSelector((state: any) => state.casper.walletConnector);

    //@ts-ignore
    const networkData = networksToChainIdMap[currentWalletNetwork]

    const connectWallet = async () => {
        //@ts-ignore
        const casperWalletProvider = await window.CasperWalletProvider;    

        if (!casperWalletProvider) {
            toast.error(`Casper Wallet provider not found. Kindly ensure casper wallet browser extension is installed.`);
            return
        }

        const provider = casperWalletProvider();
        await provider?.requestConnection()

        const isConnected = await provider.isConnected();

        if (isConnected) {
        setLoading(true)
        await AccountInformation();
        setLoading(false)
        }
    
        return;
    };

    const disconnectWallet = async () => {
        //@ts-ignore
        const casperWalletProvider = await window.CasperWalletProvider;    
        const provider = casperWalletProvider();
        provider.disconnectFromSite();
        //@ts-ignore
        await resetWallet()(dispatch)
    };

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
            // const balanceUref = await casperService.getAccountBalanceUrefByPublicKey(latestBlock?.block?.header?.state_root_hash || '', CLPublicKey.fromHex(publicKey));

            if (latestBlock?.block?.header?.state_root_hash) {
                // const balance = await casperService.getAccountBalance(latestBlock?.block?.header?.state_root_hash, balanceUref);
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

    const performCasperApproval = async () => {
        if (isWalletConnected && selectedAccount) {
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
            // navigate.push(`/${config._id}`);
        }
    };

    function start_and_end(str: string) {
        if (str.length > 15) {
          return str.substr(0, 10) + '...' + str.substr(str.length-10, str.length);
        }
        return str;
    }

    const Button2 = (props: any) => (
        <div className={`${styles.logo_container}  ${props?.address && styles.connnected}`} onClick={props.onClick} >
            <p className={styles.logo}>
            <img src={metamask} alt={''} />
                </p>
            <p>
                { props?.address 
                    ? <span className={styles.address}> <span><img src={wc_icon} width={15} alt={''} /></span> {start_and_end(props?.address)}</span> 
                    : 'METAMASK WALLET'
                }
            </p>
        </div>
    )

    return (
        <FContainer width={1400} className="f-pl-1 f-pr-1 f-pt-2 landing">
            <div className={styles.container}> 
                <div className={styles.connect_info}>
                    <div className={styles.title}>Welcome to the Casper Network Bridge!</div>
                    <p className={styles.mini}>Connect and Swap in 3 Simple Steps</p>
                    <div className={styles.list}>
                        <p> <span className={styles.number}> 1 </span> <span>Connect MetaMask and your Casper wallet.</span></p>
                        <p>  <span className={styles.number}> 2 </span> <span><b>If it's your first time</b>, click APPROVE, if you've already done so. Simply check the checkbox.</span></p>
                        <p>  <span className={styles.number}> 3 </span> <span>Swap between Casper and available networks.</span></p>
                    </div>
                </div>

                <div className={styles.connect_contaienr}>
                    <div className={styles.title_head}>CONNECT WALLETS</div>
                    <div className={styles.wallets}>
                        <MetaMaskConnector.WalletConnector
                            WalletConnectView={Button2}
                            WalletConnectModal={ConnectWalletDialog}
                            isAuthenticationNeeded={false}
                            WalletConnectViewProps={{ className: "w-100", address: walletAddress }}
                            
                        />
                        <div className={`${styles.logo_container} ${selectedAccount?.address && styles.connnected}`} onClick={!selectedAccount?.address ? connectWallet : disconnectWallet}>
                            <p className={styles.logo}>
                                <img src={casper} alt={''} />
                            </p>
                            <p>
                                {
                                    selectedAccount?.address ? <span className={styles.address}> <span><img src={casper_icon} width={15} alt={''} /></span> {start_and_end(selectedAccount?.address)}</span> : 'CASPER WALLET'
                                }
                                
                            </p>
                        </div>
                    </div>
                    <div className={styles.connect_info_message}>
                        <p className={styles.title} >Approve Your Wallet to Swap</p>
                        <p className={styles.small}><b>If it's your first time</b>, click APPROVE, if you've already done so. Simply check the checkbox.</p>
                        <FButton title={"APPROVE YOUR CASPER WALLET"} disabled={!((selectedAccount?.address && walletAddress))} onClick={() => performCasperApproval()} />
                        <p style={{"width": "100%", "position": "relative"}}>
                            <div>
                                <FInputCheckbox
                                    type={'checkbox'}
                                    onClick={() => {
                                        setApproved(!isApproved)
                                        navigate.push(`/swap`);
                                    }}
                                    //@ts-ignore
                                    checked={isApproved}
                                    className={styles.mini} label={"Check this box if you've previously approved the transaction."} ></FInputCheckbox>
                            </div>
                        </p>
                    </div>
                </div>
            </div>
            <ConfirmationDialog
                amount={0}
                onSuccessful={() => navigate.push(`/swap`)}
                onHide={() => {
                    setShowConfirmation(false)
                    setProcessMsg("")
                }} 
                transaction={processMsg}
                message={'Transaction sent to network and is processing.'}
                show={showConfirmation}
                isSwap={isSwap}
                network={networkData?.sendNetwork}
            />
            <TxProcessingDialog showClose={false} message={"Loading Configuration"} show={loading}/>
        </FContainer>
    )
}

export default CasperLanding;