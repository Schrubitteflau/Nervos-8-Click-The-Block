import Web3 from 'web3';
import * as ERC20JSON from '../../../build/contracts/IERC20.json';
import { CONFIG } from '../../config';
import { IERC20 } from '../../types/IERC20';

export class ERC20Wrapper {
    web3: Web3;

    contract: IERC20;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        
        this.contract = new web3.eth.Contract(ERC20JSON.abi as any) as any;
    }

    async balanceOf(fromAddress: string, polyjuiceAddress: string) {
        return await this.contract.methods.balanceOf(polyjuiceAddress).call({
            ...CONFIG.DEFAULT_SEND_OPTIONS,
            from: fromAddress
        });
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    useDeployed(contractAddress: string) {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    }
}
