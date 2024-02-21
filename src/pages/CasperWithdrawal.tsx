import { useState } from "react";
import { FButton, FCard, FGrid, FGridItem, FInputText, FItem, FTypo } from "ferrum-design-system";
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

const RPC_API = "https://casper-proxy-app-03c23ef9f855.herokuapp.com?url=https://rpc.mainnet.casperlabs.io/rpc";

const casperService = new CasperServiceByJsonRPC(RPC_API);
const casperClient = new CasperClient(RPC_API);

export const CasperWithdrawal = () => {
  const navigate = useHistory();
  const { bridgePoolAddress }: any = useParams();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState();
  const [targetNetwork, setTargetNetwork] = useState('56');
  const [targetToken, setTargetToken] = useState('Ferrum_Test_Token');
  const [processMsg, setProcessMsg] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const connection = useSelector((state: any) => state.casper.connect)
  const { connect: { config, selectedAccount, isWalletConnected, signedAddresses, } } = useSelector((state: any) => state.casper);

  // const [stakingCap, setStakingCap] = useState<any>(undefined);
  const [stakeSoFar, setStakeSoFar] = useState<any>(undefined);
  const [youStakedBalance, setYourStakedBalance] = useState<any>(undefined);
  const { isConnected, isConnecting, currentWalletNetwork, walletAddress, networkClient } =
    useSelector((state: any) => state.casper.walletConnector);

  const stakingInfo = getStakingInfo(
    config?.stakingEnds,
    config?.stakingStarts,
    config?.withdrawStarts,
    config?.withdrawEnds
  );

  
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

    await provider.requestConnection()

    const isConnected = await provider.isConnected();

    if (isConnected) {
      await AccountInformation();
    }   
  };

  const performWithdraw = async () => {
    if (
      isWalletConnected &&
      selectedAccount
    ) {
      setLoading(true)
      try {
         //@ts-ignore
      const casperWalletProvider = await window.CasperWalletProvider;    
      const provider = casperWalletProvider();
      setLoading(true)
        // (selectedAccount?.address, Number(amount));
        if (amount && Number(amount) > 0) {
          const publicKeyHex = selectedAccount?.address;
          const senderPublicKey = CLPublicKey.fromHex(publicKeyHex);

          const deployParams = new DeployUtil.DeployParams(
            senderPublicKey,
            'casper'
          );

          const args = RuntimeArgs.fromMap({
            "amount": CLValueBuilder.u256(amount),
            "token_address": CLValueBuilder.string('contract-package-wasm5fe4b52b2b1a3a0eebdc221ec9e290df1535ad12a7fac37050095201f449acc4'),
            "payee": CLValueBuilder.string('0203d3a2770de0d4fe892c74e4e33f98580bb6136b1ab35f1244b0cf0758b3d1d3b3'),
            "signature": CLValueBuilder.string('7369676e6174757265'),
            "salt": CLValueBuilder.string('0000000000000000000000000000000000000000000000000000000000000001'),
          });

          const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
            decodeBase16('e0f1bcfbbc1554dc0cbd1316cc1658645b58898aa5add056985f9d6cb0f6f75b'),
            'withdraw_signed',
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
               
              }
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
        // console.log("ERROR : ", e);
        toast.error("An error occured please see console for details");
        // navigate.push(`/${config._id}`);
      } finally {
        //setLoading(false)
      }

    } else {
      // navigate.push(`/${config._id}`);
    }
  };

  return (
    <>
      <FCard className={"card-staking f-mb-2"}>
        <FGrid alignX={"center"} className="f-mb-1">
          <FTypo size={18} align={"center"} className={"f-mb-14 f-mt--7"}>
           CASPER TOKEN WITHDRAWAL
          </FTypo>
          <FGridItem alignX={"center"} size={[8, 8, 12]} className="f-m-auto f-mb-1">
            <FItem align={"center"}>    
              <FInputText
                className={"f-mt-2"}
                label={"AMOUNT TO WITHDRAW"}
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
                value={targetNetwork}
                onChange={(e: any) => {}}
              />
              <FInputText
                className={"f-mt-2"}
                label={"Target Token"}
                disabled
                value={targetToken}
                onChange={(e: any) => {}}
              />
              <FInputText
                className={"f-mt-2"}
                label={"Token Address"}
                disabled
                value={'contract-package-wasmf62cbf870864bfc333bd49b966cc0befcdecb335deff1937661af05971853390'}
                onChange={(e: any) => {}}
              />
              <FInputText
                className={"f-mt-2"}
                label={"Payee"}
                disabled
                value={'0203d3a2770de0d4fe892c74e4e33f98580bb6136b1ab35f1244b0cf0758b3d1d3b3'}
                onChange={(e: any) => {}}
              />
              {/* <FInputText
                className={"f-mt-2"}
                label={"signature"}
                disabled
                value={'7369676e6174757265'}
                onChange={(e: any) => {}}
              />
              <FInputText
                className={"f-mt-2"}
                label={"salt"}
                disabled
                value={'0000000000000000000000000000000000000000000000000000000000000001'}
                onChange={(e: any) => {}}
              /> */}
              {
                connection.isWalletConnected && (
                  <FButton 
                    title={"WITHDRAW"}
                    className="w-100 f-mt-2"
                    onClick={() => performWithdraw()}
                  />
                )
              }
              {
                !connection.isWalletConnected && (
                  <FButton title={"Connect Casper Signer"} className="w-100 f-mt-2" onClick={() => connectWallet()} />
                )
              }
            </FItem>
          </FGridItem>
        </FGrid>
        <ConfirmationDialog onHide={() =>setShowConfirmation(false)} transaction={processMsg} message={'Transaction sent to network and is processing.'} show={showConfirmation} />
        <TxProcessingDialog onHide={() =>setLoading(false)} message={ processMsg || "Transaction Processing...."} show={loading}/>
      </FCard>
    </>
  );
};

export default CasperWithdrawal
