import Web3 from 'web3';
import * as ScoresJSON from '../../../build/contracts/Scores.json';
import { CONFIG } from '../../config';
import { Scores } from '../../types/Scores';

export class ScoresWrapper {
    web3: Web3;

    contract: Scores;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.contract = new web3.eth.Contract(ScoresJSON.abi as any) as any;
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    async getLatestScores(fromAddress: string, count: number) {
        return await this.contract.methods.getLatestScores(count).call({
            from: fromAddress
        });
    }

    async getUsername(fromAddress: string, polyjuiceAddress: string): Promise<string> {
        return await this.contract.methods.usernames(polyjuiceAddress).call({
            from: fromAddress
        });
    }

    async getScoresCount(fromAddress: string): Promise<string> {
        return await this.contract.methods.scoresCount().call({
            from: fromAddress
        });
    }

    async addScore(fromAddress: string, score: number) {
        return await this.contract.methods.addScore(score).send({
            ...CONFIG.DEFAULT_SEND_OPTIONS,
            from: fromAddress
        });
    }

    async setUsername(fromAddress: string, username: string) {
        return this.contract.methods.setUsername(username).send({
            ...CONFIG.DEFAULT_SEND_OPTIONS,
            from: fromAddress
        });
    }

    async deploy(fromAddress: string) {
        const deployTx = await (this.contract
            .deploy({
                data: ScoresJSON.bytecode,
                arguments: []
            })
            .send({
                ...CONFIG.DEFAULT_SEND_OPTIONS,
                from: fromAddress,
                to: CONFIG.CONSTANTS.ZERO_ADDRESS
            } as any) as any);
        console.log(deployTx)

        this.useDeployed(deployTx.contractAddress);

        return deployTx.transactionHash;
    }

    useDeployed(contractAddress: string) {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    }
}
