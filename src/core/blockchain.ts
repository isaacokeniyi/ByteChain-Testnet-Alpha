import { TxPlaceHolder, BlockReward, BlockTime } from "../utils/core_constants";
import Account from "../accounts/account";
import Transaction from "./transaction";
import Block from "./block";


class BlockChain {
    tx_pool: Transaction[];
    chain: Block[];
    difficulty: number = 3;
    addr_bal: Map<string, number>;
    addr_nonce: Map<string, number>;

    constructor() {
        this.tx_pool = [];
        this.chain = [];
        this.addr_bal = new Map<string, number>();
        this.addr_nonce = new Map<string, number>();
        this.genesis_block();
    }

    genesis_block() {
        const transaction: Transaction[] = [];
        const a_block = new Block(
            0,
            Date.now(),
            "0x00000000000000000000000000000000ByteChain",
            transaction
        );
        
        a_block.block_header.block_hash = "0x00000000000000000000000000000001ByteChain"
        this.chain.push(a_block)
    }

    get_last_block(): Block {
        const last_block = this.chain[this.chain.length - 1];

        return last_block;
    }

    add_new_tx(transaction: Transaction, pub_key: string): Transaction {
        const { amount, sender, recipient, signature, n_nonce } = transaction;

        if (!amount || !sender || !recipient || !signature || !n_nonce) {
            throw new Error("Incomplete transaction detail");
        }

        const sender_bal = this.addr_bal.get(sender) ?? 0;
        const get_prev_snonce = this.addr_nonce.get(sender) ?? 0;
        this.addr_nonce.set(sender, get_prev_snonce + 1);

        if(amount < 0) {
            throw new Error("Invalid amount");
        }

        if (amount > sender_bal) {
            throw new Error("Insufficient fund");
        }

        const sender_nonce = this.addr_nonce.get(sender) ?? 0;
        if (n_nonce !== sender_nonce) {
            throw new Error("Invalid nonce value");
        }

        if (!Transaction.verify_tx_sig(transaction, pub_key)) {
            throw new Error("Invalid Transaction");
        }

        this.addr_bal.set(sender, sender_bal - amount);
        this.tx_pool.push(transaction);

        return transaction;
    }

    add_new_block(): Block {
        const { block_height, block_hash } = this.get_last_block().block_header;
        const n_block_height = block_height + 1;
        const transactions = this.tx_pool;
        const block = new Block(n_block_height, Date.now(), block_hash, transactions);

        for (const transaction of transactions) {
            const { amount,  recipient } = transaction;

            const recipient_bal = Number(this.addr_bal.get(recipient));

            this.addr_bal.set(recipient, recipient_bal + amount)
        }

        this.tx_pool = [];

        return block;
    }

    mine_block(miner_addr: string): Block {
        const account = new Account();

        const { blockchain_addr, pub_key, priv_key } = account;
        const comment = "Block Reward by 0xByteChain";

        this.addr_bal.set(blockchain_addr, 1024);

        const reward_placeholder: TxPlaceHolder = { 
            amount: BlockReward, 
            sender: blockchain_addr, 
            recipient: miner_addr,
            comment: comment
        }

        const { base58_sig, tx_nonce } = account.sign_tx(reward_placeholder, priv_key)

        const reward_tx = new Transaction(
            BlockReward, 
            account.blockchain_addr, 
            miner_addr, 
            base58_sig,
            tx_nonce,
            comment
        );

        this.add_new_tx(reward_tx, pub_key);

        const new_block = this.add_new_block();
        new_block.set_block_props(this.difficulty);

        this.chain.push(new_block);
        this.calc_difficulty();

        return new_block; 
    }

    calc_difficulty(): number {
        if (this.chain.length < 2) {
            return this.difficulty + 1;
        }

        const prev_n_block_header = this.chain[this.chain.length - 2].block_header;
        const n_block_header = this.get_last_block().block_header;
        const time_diff = n_block_header.timestamp - prev_n_block_header.timestamp;

        if (time_diff < BlockTime) {
            return this.difficulty += Math.round(time_diff / BlockTime);
        } else if (time_diff > BlockTime) {
            return this.difficulty -= Math.round(time_diff / BlockTime);
        }

        this.difficulty = Math.max(this.difficulty, 1);

        return this.difficulty;
    }

    // Todo implement this methods 
    // is_valid_chain(chain: BlockChain['chain']): boolean {
    //     for (const block in chain) {
    //         return true;
    //     }
    //     return true;
    // }

    // sync_chain(local: BlockChain, remote: BlockChain): BlockChain {
    //     return remote || local;
    // }
}


export default BlockChain;