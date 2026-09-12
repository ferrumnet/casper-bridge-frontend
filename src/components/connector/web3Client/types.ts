import { Big } from 'big.js';

export type ChainEventStatus = '' | 'pending' | 'failed' | 'completed';

export interface ApprovalState {
	pending: boolean;
	approveTransactionId: string;
	approvals: { [key: string]: string };
	status?: ChainEventStatus;
	error?: string;
}

export const parseCurrency = (cur: string): [string, string] => {
    const pars = cur.split(':', 2);
    return [pars[0], pars[1]];
}

export const toCurrency = (network: string, address: string): string | undefined => {
    if (!network || !address) return undefined;
    return `${network.toUpperCase()}:${address.toLowerCase()}`
}

export const isCurrencyValid = (cur: string): boolean => {
    if (!cur) { return false; }
    const [network, token] = parseCurrency(cur);
    if (!token) { return false; }
    if (!network) { return false; }
    if (!token.startsWith('0x')) {
        return false;
    }
    if (token.length !== 42) {
        return false;
    }
    if (!network) {
        return false;
    }
    return true;
}

export const linkForTransaction = (network: string, tid: string) => {
	switch (network.toLocaleLowerCase()) {
		case 'rinkeby':
			return `https://rinkeby.etherscan.io/tx/${tid}`;
		case 'ethereum':
			return `https://etherscan.io/tx/${tid}`;
		case 'bsc':
			return `https://bscscan.com/tx/${tid}`;
		case 'bsc_testnet':
			return `https://testnet.bscscan.com/tx/${tid}`;
		case 'mumbai_testnet':
			return `https://mumbai.polygonscan.com/tx/${tid}`;
		case 'polygon':
			return `https://polygonscan.com/tx/${tid}`;
		case 'avax_testnet':
			return `https://testnet.snowtrace.io//tx/${tid}`;
		case 'moon_moonbase':
			return `https://moonbase.moonscan.io/tx/${tid}`;
		case 'avax_mainnnet':
			return `https://snowtrace.io//tx/${tid}`;
		case 'moon_moonriver':
			return `https://moonriver.moonscan.io/tx/${tid}`;
		case 'ftm_testnet':
			return `https://testnet.ftmscan.com/tx/${tid}`;
		case 'harmony_testnet_0':
			return `https://explorer.pops.one/tx/${tid}`;
		case 'ftm_mainnet':
			return `https://ftmscan.com/tx/${tid}`;
		case 'shiden_testnet':
			 return `https://shibuya.subscan.io/tx/${tid}`;
		case 'ethereum_arbitrum':
			return `https://arbiscan.io/tx/${tid}`;
		default:
			return ''
	}
	// return '';
}

export const addToken = async (tokenChainData:any) => {
    console.log(tokenChainData,'tokenChain')
    //@ts-ignore
	let ethereum = window.ethereum;
    try {
        // wasAdded is a boolean. Like any RPC method, an error may be thrown.
        await ethereum.request({
            method: 'wallet_watchAsset',
            params: {
            type: 'ERC20',
            options: {
                address: tokenChainData.address, 
                symbol: tokenChainData.symbol,
                decimals: tokenChainData.decimals,
                image: tokenChainData.logoURI,
            },
            },
        });
    } catch (e) {
		console.error('Add token', e);
    }
}


export class ParseBigError extends Error { }

export class BigUtils {
	static truthy(b?: Big): boolean {
		return !!b && !(new Big(0).eq(b));
	}

	static safeParse(s: string): Big {
		try {
			return new Big(s);
		} catch (e) {
			return new Big('0');
		}
	}

	static parseOrThrow(s: string, varName: string): Big {
		try {
			return new Big(s);
		} catch (e) {
			throw new ParseBigError(`Error parsing ${varName}. "${s}" is not a valid number`);
		}
	}
}

export interface ChainEventBase {
    id: string;
		userAddress: string;
    network: string;
		application: string;
    status: ChainEventStatus;
    callback?: any,
    eventType: string;
		transactionType: string;
		createdAt: number;
		lastUpdate: number;
		reason?: string;
		retry: number;
}

export interface MultiSigActor {
	groupId: number;
	quorum: string;
	address: string;
	contractAddress: string;
}

export interface MultiSigSignature {
    creationTime: number;
    creator: string;
    signature: string;
  }

export interface MultiSignable {
	signatures: MultiSigSignature[];
}

export interface AllocationSignature extends MultiSignable {
	actor: MultiSigActor;
	salt: string;
	expirySeconds: number;
	from: string;
	to: string;
}

export interface UserContractAllocation {
	signature?: AllocationSignature;
	network: string;
	contractAddress: string;
	method: string;
	userAddress: string;
	currency: string;
	allocation: string;
	expirySeconds: number;
}