const { expectRevert, time } = require('@openzeppelin/test-helpers');
const ethers = require('ethers');
const HDToken = artifacts.require('HDToken');
const MasterHub = artifacts.require('MasterHub');
const MockHRC20 = artifacts.require('libs/MockHRC20');
const Timelock = artifacts.require('Timelock');
const HubdaoToken = artifacts.require('HubdaoToken');

function encodeParameters(types, values) {
    const abi = new ethers.utils.AbiCoder();
    return abi.encode(types, values);
}

contract('Timelock', ([alice, bob, carol, dev, minter]) => {
    beforeEach(async () => {
        this.hd = await HDToken.new({ from: alice });
        this.timelock = await Timelock.new(bob, '28800', { from: alice }); //8hours
    });

    it('should not allow non-owner to do operation', async () => {
        await this.hd.transferOwnership(this.timelock.address, { from: alice });
        await expectRevert(
            this.hd.transferOwnership(carol, { from: alice }),
            'Ownable: caller is not the owner',
        );
        await expectRevert(
            this.hd.transferOwnership(carol, { from: bob }),
            'Ownable: caller is not the owner',
        );
        await expectRevert(
            this.timelock.queueTransaction(
                this.hd.address, '0', 'transferOwnership(address)',
                encodeParameters(['address'], [carol]),
                (await time.latest()).add(time.duration.hours(6)),
                { from: alice },
            ),
            'Timelock::queueTransaction: Call must come from admin.',
        );
    });

    it('should do the timelock thing', async () => {
        await this.hd.transferOwnership(this.timelock.address, { from: alice });
        const eta = (await time.latest()).add(time.duration.hours(9));
        await this.timelock.queueTransaction(
            this.hd.address, '0', 'transferOwnership(address)',
            encodeParameters(['address'], [carol]), eta, { from: bob },
        );
        await time.increase(time.duration.hours(1));
        await expectRevert(
            this.timelock.executeTransaction(
                this.hd.address, '0', 'transferOwnership(address)',
                encodeParameters(['address'], [carol]), eta, { from: bob },
            ),
            "Timelock::executeTransaction: Transaction hasn't surpassed time lock.",
        );
        await time.increase(time.duration.hours(8));
        await this.timelock.executeTransaction(
            this.hd.address, '0', 'transferOwnership(address)',
            encodeParameters(['address'], [carol]), eta, { from: bob },
        );
        assert.equal((await this.hd.owner()).valueOf(), carol);
    });

    it('should also work with MasterHub', async () => {
        this.lp1 = await MockHRC20.new('LPToken', 'LP', '10000000000', { from: minter });
        this.lp2 = await MockHRC20.new('LPToken', 'LP', '10000000000', { from: minter });
        this.hdt = await HubdaoToken.new(this.hd.address, { from: minter });
        this.hub = await MasterHub.new(this.hd.address, this.hdt.address, dev, '1000', '0', { from: alice });
        await this.hd.transferOwnership(this.hub.address, { from: alice });
        await this.hdt.transferOwnership(this.hub.address, { from: minter });
        await this.hub.add('100', this.lp1.address, true, { from: alice });
        await this.hub.transferOwnership(this.timelock.address, { from: alice });
        await expectRevert(
            this.hub.add('100', this.lp1.address, true, { from: alice }),
            "revert Ownable: caller is not the owner",
        );

        const eta = (await time.latest()).add(time.duration.hours(9));
        await this.timelock.queueTransaction(
            this.hub.address, '0', 'transferOwnership(address)',
            encodeParameters(['address'], [minter]), eta, { from: bob },
        );
        // await this.timelock.queueTransaction(
        //     this.hub.address, '0', 'add(uint256,address,bool)',
        //     encodeParameters(['uint256', 'address', 'bool'], ['100', this.lp2.address, false]), eta, { from: bob },
        // );
        await time.increase(time.duration.hours(9));
        await this.timelock.executeTransaction(
            this.hub.address, '0', 'transferOwnership(address)',
            encodeParameters(['address'], [minter]), eta, { from: bob },
        );
        await expectRevert(
            this.hub.add('100', this.lp1.address, true, { from: alice }),
            "revert Ownable: caller is not the owner",
        );
        await this.hub.add('100', this.lp1.address, true, { from: minter })
        // await this.timelock.executeTransaction(
        //     this.hub.address, '0', 'add(uint256,address,bool)',
        //     encodeParameters(['uint256', 'address', 'bool'], ['100', this.lp2.address, false]), eta, { from: bob },
        // );
        // assert.equal((await this.hub.poolInfo('0')).valueOf().allocPoint, '200');
        // assert.equal((await this.hub.totalAllocPoint()).valueOf(), '300');
        // assert.equal((await this.hub.poolLength()).valueOf(), '2');
    });
});
