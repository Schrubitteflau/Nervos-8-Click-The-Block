/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';

import { ScoresWrapper } from '../lib/contracts/ScoresWrapper';
import { CONFIG } from '../config';
import { ERC20Wrapper } from '../lib/contracts/ERC20Wrapper';

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };

        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider || Web3.givenProvider);
        web3.eth.handleRevert = true

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

type TimeoutProps = {
    seconds: number,
    onEnd: () => void
};
type TimeoutState = {
    secondsLeft: number
}
class Timeout extends React.Component<TimeoutProps, TimeoutState> {

    interval: NodeJS.Timeout;

    constructor(props: TimeoutProps) {
        super(props);
        this.state = {
            secondsLeft: props.seconds
        };
    }

    decrementSecondsLeft() {
        this.setState({
            secondsLeft: this.state.secondsLeft - 1
        });
    }

    componentDidMount() {
        this.interval = setInterval(() => {
            this.decrementSecondsLeft();
            if (this.state.secondsLeft <= 0) {
                clearTimeout(this.interval);
                this.props.onEnd();
            }
        }, 1000);
    }

    componentWillUnmount() {
        clearTimeout(this.interval);
    }

    render() {
        return (
            <div>{this.state.secondsLeft} seconds left</div>
        );
    } 
}

type GameProps = {
    onGameEnd: (score: number) => void
}
function Game(props: GameProps) {

    const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
    let score: number = 0;

    function handleClick() {
        score++;
    }

    function endGame() {
        setIsGameStarted(false);
        props.onGameEnd(score);
    }

    function startGame() {
        setIsGameStarted(true);
    }

    if (isGameStarted) {
        return (
            <div>
                <Timeout onEnd={endGame} seconds={10} />
                <button id="game-btn" onClick={handleClick}>Click me !!</button>
            </div>
        );
    }
    else {
        return (
            <button onClick={startGame}>Start the game!</button>
        );
    }
}

const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

// Address, Score, Timestamp, Username (optional)
type Score = [ string, string, string, string ];
type ScoreList = Array<Score>;
type ScoreBoardProps = {
    scores: ScoreList
};
function ScoreBoard(props: ScoreBoardProps) {

    const elements = props.scores.map((score: Score, index: number) => {
        // Multiply by 1000 because JS timestamp counts in milliseconds
        const date: Date = new Date(parseInt(score[2], 10) * 1000);
        const username: string = score[3].length > 0 ? score[3] : "-";

        return (
            // I can the index because the data will never change
            <tr key={index}>
                <td>{score[0]}</td>
                <td>{score[1]}</td>
                <td>{date.toLocaleString()}</td>
                <td>{username}</td>
            </tr>
        );
    });

    console.log(props);

    return (
        <table id="scoreboard">
            <thead>
                <tr>
                    <th>Address</th>
                    <th>Score</th>
                    <th>Time</th>
                    <th>Username</th>
                </tr>
            </thead>
            <tbody>
                {elements}
            </tbody>
        </table>
    );
}

type ScoreSubmitterProps = {
    score: number | null,
    disableSubmit: boolean,
    onSubmitScore: () => void
};
function ScoreSubmitter(props: ScoreSubmitterProps) {
    if (props.score === null) {
        return (
            <div>Please play the game !</div>
        );
    }
    else {
        return (
            <div>
                Your score is : {props.score}
                <button disabled={props.disableSubmit} onClick={props.onSubmitScore}>Submit it !</button>
            </div>
        );
    }
}

type InputUpdateProps = {
    value: string,
    disableUpdate: boolean,
    onUpdate: (newValue: string) => void,
    buttonText: string
}
function InputUpdate(props: InputUpdateProps) {
    const [value, setValue] = useState<string>(props.value);

    return (
        <span>
            <input disabled={props.disableUpdate} onChange={(e) => setValue(e.target.value)} value={value} placeholder={"Empty"} />
            <button disabled={props.disableUpdate} onClick={() => props.onUpdate(value)}>{props.buttonText}</button>
        </span>
    );
}

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [accounts, setAccounts] = useState<string[]>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [l2DepositAddress, setL2DepositAddress] = useState<string>();
    const [hideL2DepositAddress, setHideL2DepositAddress] = useState<boolean>(false);
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [scoreBoardValues, setScoreBoardValues] = useState<ScoreList>([]);
    const [isScoreBoardLoading, setIsScoreBoardLoading] = useState<boolean>(false);
    const [gameScore, setGameScore] = useState<number | null>(null);
    const [isScoreSubmitting, setIsScoreSubmitting] = useState<boolean>(false);
    const [username, setUsername] = useState<string>("");
    const [isUsernameLoading, setIsUsernameLoading] = useState<boolean>(false);
    const [isUsernameSubmitting, setIsUsernameSubmitting] = useState<boolean>(false);
    const [ckETHBalance, setCkETHBalance] = useState<bigint>();
    const [isCkETHBalanceLoading, setIsCkETHBalanceLoading] = useState<boolean>(false);
    const toastId = React.useRef(null);

    const account: string = accounts?.[0];

    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            const polyjuiceAddress = addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]);
            setPolyjuiceAddress(polyjuiceAddress);

            (async function() {
                const l2Deposit = await addressTranslator.getLayer2DepositAddress(web3, accounts?.[0]);
                setL2DepositAddress(l2Deposit.addressString);
            })();

            loadScoreBoard();
        } else {
            setPolyjuiceAddress(undefined);
        }
    }, [accounts?.[0]]);

    useEffect(() => {
        if (polyjuiceAddress?.length > 0 && web3) {
            loadUsername();
            loadCkETHBalance();
        }
    }, [ polyjuiceAddress, web3 ]);

    useEffect(() => {

        const transactionInProgress: boolean = isUsernameSubmitting || isScoreSubmitting;

        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [isScoreSubmitting, isUsernameSubmitting, toastId.current]);

    useEffect(() => {

        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });

            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setL2Balance(_l2Balance);
            }
        })();
    });

    async function loadCkETHBalance(): Promise<void> {
        try {
            setIsCkETHBalanceLoading(true);
            const _contract = new ERC20Wrapper(web3);
            _contract.useDeployed(CONFIG.CONSTANTS.CKETH_ERC20_PROXY_ADDRESS);
            const balance = BigInt(await _contract.balanceOf(account, polyjuiceAddress));
            setCkETHBalance(balance);
            console.log(balance);
        }
        catch (error) {
            console.log(error);
            toast.error(
                'There was an error loading your ckETH balance. Please check the developer console...'
            );
        }
        finally {
            setIsCkETHBalanceLoading(false);
        }
    }

    async function addScore(score: number): Promise<void> {
        try {
            setIsScoreSubmitting(true);
            const _contract = new ScoresWrapper(web3);
            _contract.useDeployed(CONFIG.CONSTANTS.SCORES_CONTRACT_ADDRESS);
            await _contract.addScore(account, score);
            toast(
                `Successfully added you score ${score} to the blockchain. You can refresh the scoreboard.`,
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check the developer console...'
            );
        } finally {
            setIsScoreSubmitting(false);
        }
    }

    async function loadScoreBoard(): Promise<void> {
        try {
            setIsScoreBoardLoading(true);
            const _contract = new ScoresWrapper(web3);
            _contract.useDeployed(CONFIG.CONSTANTS.SCORES_CONTRACT_ADDRESS);

            const scores: ScoreList = await _contract.getLatestScores(account, 10);

            setScoreBoardValues(scores);
        } catch (error) {
            console.log(error);
            toast.error(
                'Error while fetching scoreboard. Please check the developer console...'
            );
        } finally {
            setIsScoreBoardLoading(false);
        }
    }

    async function loadUsername(): Promise<void> {
        try {
            setIsUsernameLoading(true);
            const _contract = new ScoresWrapper(web3);
            _contract.useDeployed(CONFIG.CONSTANTS.SCORES_CONTRACT_ADDRESS);

            const username: string = await _contract.getUsername(account, polyjuiceAddress);
            setUsername(username);
        } catch (error) {
            console.log(error);
            toast.error(
                'Error while fetching username. Please check the developer console...'
            );
        } finally {
            setIsUsernameLoading(false);
        }
    }

    async function updateUsername(newUsername: string): Promise<void> {
        try {
            setIsUsernameSubmitting(true);
            const _contract = new ScoresWrapper(web3);
            //await _contract.deploy(account);
            _contract.useDeployed(CONFIG.CONSTANTS.SCORES_CONTRACT_ADDRESS);

            await _contract.setUsername(account, newUsername);
            setUsername(newUsername);
            toast(
                `Successfully updated your username to ${newUsername} in the blockchain. You can refresh the scoreboard`,
                { type: 'success' }
            );
        } catch (error) {
            console.log(error);
            toast.error(
                'Error while updating your username. Please check the developer console...'
            );
        } finally {
            setIsUsernameSubmitting(false);
        }
    }

    function isScoreBoardEmpty(): boolean {
        return (scoreBoardValues.length === 0);
    }

    function triggerHideL2DepositAddress() {
        setHideL2DepositAddress(!hideL2DepositAddress);
    }

    function handleGameEnd(score: number) {
        setGameScore(score);
    }

    function handleSubmitScore() {
        if (gameScore !== null) {
            addScore(gameScore);
        }
    }

    function handleChangeUsername(newUsername: string) {
        updateUsername(newUsername);
    }

    return (
        <div>
            <fieldset>
                Your ETH address: <b>{accounts?.[0]}</b>
            </fieldset>
            
            <fieldset>
                Your Polyjuice address: <b>{polyjuiceAddress || ' - '}</b>
            </fieldset>

            <fieldset>
                Nervos Layer 2 balance:{' '}
                <b>{l2Balance ? (l2Balance / 10n ** 8n).toString() : <LoadingIndicator />} CKB</b><br />
                Using <b>{CONFIG.CONSTANTS.CKETH_ERC20_PROXY_ADDRESS}</b> ckETH ERC20 proxy contract address<br />
                L2 ckETH balance:{' '}
                <b>{ckETHBalance ? /* (BigInt / 10^18) and get decimal result */ (Number(ckETHBalance / 10n ** 8n) / 10 ** 10).toString() : <LoadingIndicator />} ckETH</b><br />
            </fieldset>

            <fieldset>
                <button onClick={triggerHideL2DepositAddress}>{hideL2DepositAddress ? "Show" : "Hide"}</button>
                Your L2 SUDT deposit address :{' '}
                <b>{!hideL2DepositAddress ? (l2DepositAddress ? l2DepositAddress : <LoadingIndicator />) : 'Hidden'}</b>
            </fieldset>

            <fieldset>
                You can use this L2 deposit address to send directly assets from another blockchain to Nervos L2.<br />
                You can use <a href="https://force-bridge-test.ckbapp.dev/bridge/Ethereum/Nervos" target="_blank">Force Bridge</a> to do that.<br />
                Please select the right asset and input your L2 deposit address in the <b>Recipient</b> field.<br/>
                For example, you can <a href="https://force-bridge-test.ckbapp.dev/bridge/Ethereum/Nervos?xchain-asset=0x0000000000000000000000000000000000000000" target="_blank">transfer</a> native <b>ETH</b> into Nervos L2 as <b>ckETH</b> SUDT tokens.
            </fieldset>

            <fieldset>
                Scores contract address: <b>{CONFIG.CONSTANTS.SCORES_CONTRACT_ADDRESS}</b><br />
                The contract is deployed on Nervos Layer 2 - Godwoken + Polyjuice. After each transaction you might need to wait up to 120 seconds for the status to be reflected.
            </fieldset>

            <h1>Game details</h1>
            <fieldset>
                During 10 seconds, you have to click the button, each click which will increment you <b>score</b>.
                Then, you can save you <b>score</b> on the blockchain.
            </fieldset>

            <fieldset>
                <ScoreSubmitter
                    score={gameScore}
                    onSubmitScore={handleSubmitScore}
                    disableSubmit={isScoreSubmitting}
                />

                Your username is : {isUsernameLoading
                    ? <LoadingIndicator />
                    : <InputUpdate
                        value={username}
                        onUpdate={handleChangeUsername}
                        disableUpdate={isUsernameSubmitting}
                        buttonText={"Change it!"}
                      />
                }
            </fieldset>

            <Game onGameEnd={handleGameEnd} />

            <hr />

            <h1>Scoreboard</h1>
            <button disabled={isScoreBoardLoading} onClick={loadScoreBoard}>Refresh</button>

            { isScoreBoardLoading
                ? <LoadingIndicator />
                : (isScoreBoardEmpty()
                    ? "No data to show"
                    : <ScoreBoard scores={scoreBoardValues} />)
            }

            <ToastContainer />
        </div>
    );
}
