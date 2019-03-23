"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BigNumber = require('bignumber.js');
const constants_1 = require("./constants");
class BlockReward {
    constructor() {
        this.distance = Math.floor(constants_1.REWARDS.DISTANCE);
        this.rewardOffset = Math.floor(constants_1.REWARDS.OFFSET);
    }
    parseHeight(height) {
        if (isNaN(height)) {
            throw new Error('Invalid block height');
        }
        else {
            return Math.abs(height);
        }
    }
    calculateMilestone(height) {
        height = this.parseHeight(height);
        const location = Math.trunc((height - this.rewardOffset) / this.distance);
        const lastMilestone = constants_1.REWARDS.MILESTONES[constants_1.REWARDS.MILESTONES.length - 1];
        if (location > constants_1.REWARDS.MILESTONES.length - 1) {
            return constants_1.REWARDS.MILESTONES.lastIndexOf(lastMilestone);
        }
        return Math.abs(location);
    }
    calculateReward(height) {
        height = this.parseHeight(height);
        if (height < this.rewardOffset) {
            return 0;
        }
        return constants_1.REWARDS.MILESTONES[this.calculateMilestone(height)];
    }
    calculateSupply(height) {
        height = this.parseHeight(height);
        let supply = new BigNumber(constants_1.TOTAL_AMOUNT);
        if (height < this.rewardOffset) {
            return supply;
        }
        const milestone = this.calculateMilestone(height);
        const rewards = [];
        let amount = 0;
        let multiplier = 0;
        height = (height - this.rewardOffset) + 1;
        for (let i = 0; i < constants_1.REWARDS.MILESTONES.length; i++) {
            if (milestone >= i) {
                multiplier = constants_1.REWARDS.MILESTONES[i];
                if (height < this.distance) {
                    amount = height % this.distance;
                }
                else {
                    amount = this.distance;
                    height -= this.distance;
                    if (height > 0 && i === constants_1.REWARDS.MILESTONES.length - 1) {
                        amount += height;
                    }
                }
                rewards.push([amount, multiplier]);
            }
            else {
                break;
            }
        }
        for (let i = 0; i < rewards.length; i++) {
            const reward = rewards[i];
            supply = supply.plus(new BigNumber(reward[0]).multipliedBy(reward[1]));
        }
        return supply;
    }
}
exports.default = BlockReward;
//# sourceMappingURL=block-reward.js.map