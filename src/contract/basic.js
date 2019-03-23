"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
function doCancelVote(account) {
    return __awaiter(this, void 0, void 0, function* () {
        const voteList = yield global.app.sdb.findAll('Vote', { condition: { address: account.address } });
        if (voteList && voteList.length > 0 && account.lockAmount > 0) {
            for (const voteItem of voteList) {
                global.app.sdb.increase('Delegate', { votes: -account.lockAmount }, { name: voteItem.delegate });
            }
        }
    });
}
function isUniq(arr) {
    const s = new Set();
    for (const i of arr) {
        if (s.has(i)) {
            return false;
        }
        s.add(i);
    }
    return true;
}
exports.default = {
    transfer(amount, recipient) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!recipient)
                return 'Invalid recipient';
            global.app.validate('amount', String(amount));
            amount = Number(amount);
            const sender = this.sender;
            const senderId = sender.address;
            if (this.block.height > 0 && sender.gny < amount)
                return 'Insufficient balance';
            let recipientAccount;
            if (recipient && global.app.util.address.isAddress(recipient)) {
                recipientAccount = yield global.app.sdb.load('Account', recipient);
                if (recipientAccount) {
                    global.app.sdb.increase('Account', { gny: amount }, { address: recipientAccount.address });
                }
                else {
                    recipientAccount = global.app.sdb.create('Account', {
                        address: recipient,
                        gny: amount,
                        username: null,
                    });
                }
            }
            else {
                recipientAccount = yield global.app.sdb.load('Account', { username: recipient });
                if (!recipientAccount)
                    return 'Recipient name not exist';
                global.app.sdb.increase('Account', { gny: amount }, { address: recipientAccount.address });
            }
            global.app.sdb.increase('Account', { gny: -amount }, { address: sender.address });
            global.app.sdb.create('Transfer', {
                tid: this.trs.id,
                height: this.block.height,
                senderId,
                recipientId: recipientAccount.address,
                recipientName: recipientAccount.username,
                currency: 'gny',
                amount: String(amount),
                timestamp: this.trs.timestamp,
            });
            return null;
        });
    },
    setUserName(username) {
        return __awaiter(this, void 0, void 0, function* () {
            global.app.validate('name', username);
            const senderId = this.sender.address;
            global.app.sdb.lock(`basic.account@${senderId}`);
            const exists = yield global.app.sdb.load('Account', { username });
            if (exists)
                return 'Name already registered';
            if (this.sender.username)
                return 'Name already set';
            this.sender.username = username;
            global.app.sdb.update('Account', { username }, { address: this.sender.address });
            return null;
        });
    },
    setPassword(publicKey) {
        return __awaiter(this, void 0, void 0, function* () {
            global.app.validate('publickey', publicKey);
            if (!global.app.util.address.isAddress(this.sender.address)) {
                return 'Invalid account type';
            }
            const senderId = this.sender.address;
            global.app.sdb.lock(`basic.account@${senderId}`);
            if (this.sender.secondPublicKey)
                return 'Password already set';
            this.sender.secondPublicKey = publicKey;
            global.app.sdb.update('Account', { secondPublicKey: publicKey }, { address: this.sender.address });
            return null;
        });
    },
    lock(height, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Number.isInteger(height) || height <= 0)
                return 'Height should be positive integer';
            height = Number(height);
            amount = Number(amount);
            const senderId = this.sender.address;
            global.app.sdb.lock(`basic.account@${senderId}`);
            const MIN_LOCK_HEIGHT = 5760 * 30;
            const sender = this.sender;
            if (sender.gny - 100000000 < amount)
                return 'Insufficient balance';
            if (sender.isLocked) {
                if (height !== 0
                    && height < (Math.max(this.block.height, sender.lockHeight) + MIN_LOCK_HEIGHT)) {
                    return 'Invalid lock height';
                }
                if (height === 0 && amount === 0) {
                    return 'Invalid height or amount';
                }
            }
            else {
                if (height < this.block.height + MIN_LOCK_HEIGHT) {
                    return 'Invalid lock height';
                }
                if (amount === 0) {
                    return 'Invalid amount';
                }
            }
            if (!sender.isLocked) {
                sender.isLocked = 1;
            }
            if (height !== 0) {
                sender.lockHeight = height;
            }
            if (amount !== 0) {
                sender.gny -= amount;
                sender.lockAmount += amount;
                global.app.sdb.update('Account', sender, { address: sender.address });
                const voteList = yield global.app.sdb.findAll('Vote', { condition: { address: senderId } });
                if (voteList && voteList.length > 0) {
                    for (const voteItem of voteList) {
                        global.app.sdb.increase('Delegate', { votes: amount }, { username: voteItem.delegate });
                    }
                }
            }
            return null;
        });
    },
    unlock() {
        return __awaiter(this, void 0, void 0, function* () {
            const senderId = this.sender.address;
            global.app.sdb.lock(`basic.account@${senderId}`);
            const sender = this.sender;
            if (!sender)
                return 'Account not found';
            if (!sender.isLocked)
                return 'Account is not locked';
            if (this.block.height <= sender.lockHeight)
                return 'Account cannot unlock';
            sender.isLocked = 0;
            sender.lockHeight = 0;
            sender.gny += sender.lockAmount;
            sender.lockAmount = 0;
            global.app.sdb.update('Account', sender, { address: senderId });
            return null;
        });
    },
    registerDelegate() {
        return __awaiter(this, void 0, void 0, function* () {
            const senderId = this.sender.address;
            if (this.block.height > 0)
                global.app.sdb.lock(`basic.account@${senderId}`);
            const sender = this.sender;
            if (!sender)
                return 'Account not found';
            if (!sender.username)
                return 'Account has not a name';
            global.app.sdb.create('Delegate', {
                address: senderId,
                username: sender.username,
                transactionId: this.trs.id,
                publicKey: this.trs.senderPublicKey,
                votes: 0,
                producedBlocks: 0,
                missedBlocks: 0,
                fees: 0,
                rewards: 0,
            });
            sender.isDelegate = 1;
            global.app.sdb.update('Account', { isDelegate: 1 }, { address: senderId });
            return null;
        });
    },
    vote(delegates) {
        return __awaiter(this, void 0, void 0, function* () {
            const senderId = this.sender.address;
            global.app.sdb.lock(`basic.account@${senderId}`);
            const sender = this.sender;
            if (!sender.isLocked)
                return 'Account is not locked';
            delegates = delegates.split(',');
            if (!delegates || !delegates.length)
                return 'Invalid delegates';
            if (delegates.length > 33)
                return 'Voting limit exceeded';
            if (!isUniq(delegates))
                return 'Duplicated vote item';
            const currentVotes = yield global.app.sdb.findAll('Vote', { condition: { voterAddress: senderId } });
            if (currentVotes) {
                if (currentVotes.length + delegates.length > 101) {
                    return 'Maximum number of votes exceeded';
                }
                const currentVotedDelegates = new Set();
                for (const v of currentVotes) {
                    currentVotedDelegates.add(v.delegate);
                }
                for (const name of delegates) {
                    if (currentVotedDelegates.has(name)) {
                        return `Already voted for delegate: ${name}`;
                    }
                }
            }
            for (const username of delegates) {
                const exists = yield global.app.sdb.exists('Delegate', { username });
                if (!exists)
                    return `Voted delegate not exists: ${username}`;
            }
            for (const username of delegates) {
                const votes = (sender.lockAmount);
                global.app.sdb.increase('Delegate', { votes }, { username });
                global.app.sdb.create('Vote', {
                    voterAddress: senderId,
                    delegate: username,
                });
            }
            return null;
        });
    },
    unvote(delegates) {
        return __awaiter(this, void 0, void 0, function* () {
            const senderId = this.sender.address;
            global.app.sdb.lock(`account@${senderId}`);
            const sender = this.sender;
            if (!sender.isLocked)
                return 'Account is not locked';
            delegates = delegates.split(',');
            if (!delegates || !delegates.length)
                return 'Invalid delegates';
            if (delegates.length > 33)
                return 'Voting limit exceeded';
            if (!isUniq(delegates))
                return 'Duplicated vote item';
            const currentVotes = yield global.app.sdb.findAll('Vote', { condition: { voterAddress: senderId } });
            if (currentVotes) {
                const currentVotedDelegates = new Set();
                for (const v of currentVotes) {
                    currentVotedDelegates.add(v.delegate);
                }
                for (const name of delegates) {
                    if (!currentVotedDelegates.has(name)) {
                        return `Delegate not voted yet: ${name}`;
                    }
                }
            }
            for (const username of delegates) {
                const exists = yield global.app.sdb.exists('Delegate', { username });
                if (!exists)
                    return `Voted delegate not exists: ${username}`;
            }
            for (const username of delegates) {
                const votes = -(sender.lockAmount);
                global.app.sdb.increase('Delegate', { votes }, { username });
                global.app.sdb.del('Vote', { voterAddress: senderId, delegate: username });
            }
            return null;
        });
    },
};
//# sourceMappingURL=basic.js.map