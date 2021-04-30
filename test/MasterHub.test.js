const { expectRevert, time } = require('@openzeppelin/test-helpers');
const HDToken = artifacts.require('HDToken');
const HubdaoToken = artifacts.require('HubdaoToken');
const MasterHub = artifacts.require('MasterHub');
const MockHRC20 = artifacts.require('libs/MockHRC20');

contract('MasterHub', ([alice, bob, carol, dev, minter]) => {
    beforeEach(async () => {
        this.hd = await HDToken.new({ from: minter });
        this.hdt = await HubdaoToken.new(this.hd.address, { from: minter });
        this.lp1 = await MockHRC20.new('LPToken', 'LP1', '1000000', { from: minter });
        this.lp2 = await MockHRC20.new('LPToken', 'LP2', '1000000', { from: minter });
        this.lp3 = await MockHRC20.new('LPToken', 'LP3', '1000000', { from: minter });
        this.hub = await MasterHub.new(this.hd.address, this.hdt.address, dev, '1000', '100', { from: minter });
        await this.hd.transferOwnership(this.hub.address, { from: minter });
        await this.hdt.transferOwnership(this.hub.address, { from: minter });

        await this.lp1.transfer(bob, '2000', { from: minter });
        await this.lp2.transfer(bob, '2000', { from: minter });
        await this.lp3.transfer(bob, '2000', { from: minter });

        await this.lp1.transfer(alice, '2000', { from: minter });
        await this.lp2.transfer(alice, '2000', { from: minter });
        await this.lp3.transfer(alice, '2000', { from: minter });
    });
    it('real case', async () => {
      this.lp4 = await MockHRC20.new('LPToken', 'LP1', '1000000', { from: minter });
      this.lp5 = await MockHRC20.new('LPToken', 'LP2', '1000000', { from: minter });
      this.lp6 = await MockHRC20.new('LPToken', 'LP3', '1000000', { from: minter });
      this.lp7 = await MockHRC20.new('LPToken', 'LP1', '1000000', { from: minter });
      this.lp8 = await MockHRC20.new('LPToken', 'LP2', '1000000', { from: minter });
      this.lp9 = await MockHRC20.new('LPToken', 'LP3', '1000000', { from: minter });
      await this.hub.add('2000', this.lp1.address, true, { from: minter });
      await this.hub.add('1000', this.lp2.address, true, { from: minter });
      await this.hub.add('500', this.lp3.address, true, { from: minter });
      await this.hub.add('500', this.lp3.address, true, { from: minter });
      await this.hub.add('500', this.lp3.address, true, { from: minter });
      await this.hub.add('500', this.lp3.address, true, { from: minter });
      await this.hub.add('500', this.lp3.address, true, { from: minter });
      await this.hub.add('100', this.lp3.address, true, { from: minter });
      await this.hub.add('100', this.lp3.address, true, { from: minter });
      assert.equal((await this.hub.poolLength()).toString(), "10");

      await time.advanceBlockTo('766');
      await this.lp1.approve(this.hub.address, '1000', { from: alice });
      assert.equal((await this.hd.balanceOf(alice)).toString(), '0');
      await this.hub.deposit(1, '20', { from: alice });
      await this.hub.withdraw(1, '20', { from: alice });
      assert.equal((await this.hd.balanceOf(alice)).toString(), '263');

      await this.hd.approve(this.hub.address, '1000', { from: alice });
      await this.hub.enterStaking('20', { from: alice });
      await this.hub.enterStaking('0', { from: alice });
      await this.hub.enterStaking('0', { from: alice });
      await this.hub.enterStaking('0', { from: alice });
      assert.equal((await this.hd.balanceOf(alice)).toString(), '993');
      // assert.equal((await this.hub.getPoolPoint(0, { from: minter })).toString(), '1900');
    })


    it('deposit/withdraw', async () => {
      await this.hub.add('1000', this.lp1.address, true, { from: minter });
      await this.hub.add('1000', this.lp2.address, true, { from: minter });
      await this.hub.add('1000', this.lp3.address, true, { from: minter });

      await this.lp1.approve(this.hub.address, '100', { from: alice });
      await this.hub.deposit(1, '20', { from: alice });
      await this.hub.deposit(1, '0', { from: alice });
      await this.hub.deposit(1, '40', { from: alice });
      await this.hub.deposit(1, '0', { from: alice });
      assert.equal((await this.lp1.balanceOf(alice)).toString(), '1940');
      await this.hub.withdraw(1, '10', { from: alice });
      assert.equal((await this.lp1.balanceOf(alice)).toString(), '1950');
      assert.equal((await this.hd.balanceOf(alice)).toString(), '999');
      assert.equal((await this.hd.balanceOf(dev)).toString(), '100');

      await this.lp1.approve(this.hub.address, '100', { from: bob });
      assert.equal((await this.lp1.balanceOf(bob)).toString(), '2000');
      await this.hub.deposit(1, '50', { from: bob });
      assert.equal((await this.lp1.balanceOf(bob)).toString(), '1950');
      await this.hub.deposit(1, '0', { from: bob });
      assert.equal((await this.hd.balanceOf(bob)).toString(), '125');
      await this.hub.emergencyWithdraw(1, { from: bob });
      assert.equal((await this.lp1.balanceOf(bob)).toString(), '2000');
    })

    it('staking/unstaking', async () => {
      await this.hub.add('1000', this.lp1.address, true, { from: minter });
      await this.hub.add('1000', this.lp2.address, true, { from: minter });
      await this.hub.add('1000', this.lp3.address, true, { from: minter });

      await this.lp1.approve(this.hub.address, '10', { from: alice });
      await this.hub.deposit(1, '2', { from: alice }); //0
      await this.hub.withdraw(1, '2', { from: alice }); //1

      await this.hd.approve(this.hub.address, '250', { from: alice });
      await this.hub.enterStaking('240', { from: alice }); //3
      assert.equal((await this.hdt.balanceOf(alice)).toString(), '240');
      assert.equal((await this.hd.balanceOf(alice)).toString(), '10');
      await this.hub.enterStaking('10', { from: alice }); //4
      assert.equal((await this.hdt.balanceOf(alice)).toString(), '250');
      assert.equal((await this.hd.balanceOf(alice)).toString(), '249');
      await this.hub.leaveStaking(250);
      assert.equal((await this.hdt.balanceOf(alice)).toString(), '0');
      assert.equal((await this.hd.balanceOf(alice)).toString(), '749');

    });


    it('update multiplier', async () => {
      await this.hub.add('1000', this.lp1.address, true, { from: minter });
      await this.hub.add('1000', this.lp2.address, true, { from: minter });
      await this.hub.add('1000', this.lp3.address, true, { from: minter });

      await this.lp1.approve(this.hub.address, '100', { from: alice });
      await this.lp1.approve(this.hub.address, '100', { from: bob });
      await this.hub.deposit(1, '100', { from: alice });
      await this.hub.deposit(1, '100', { from: bob });
      await this.hub.deposit(1, '0', { from: alice });
      await this.hub.deposit(1, '0', { from: bob });

      await this.hd.approve(this.hub.address, '100', { from: alice });
      await this.hd.approve(this.hub.address, '100', { from: bob });
      await this.hub.enterStaking('50', { from: alice });
      await this.hub.enterStaking('100', { from: bob });

      await this.hub.updateMultiplier('0', { from: minter });

      await this.hub.enterStaking('0', { from: alice });
      await this.hub.enterStaking('0', { from: bob });
      await this.hub.deposit(1, '0', { from: alice });
      await this.hub.deposit(1, '0', { from: bob });

      assert.equal((await this.hd.balanceOf(alice)).toString(), '700');
      assert.equal((await this.hd.balanceOf(bob)).toString(), '150');

      await time.advanceBlockTo('857');

      await this.hub.enterStaking('0', { from: alice });
      await this.hub.enterStaking('0', { from: bob });
      await this.hub.deposit(1, '0', { from: alice });
      await this.hub.deposit(1, '0', { from: bob });

      assert.equal((await this.hd.balanceOf(alice)).toString(), '700');
      assert.equal((await this.hd.balanceOf(bob)).toString(), '150');

      await this.hub.leaveStaking('50', { from: alice });
      await this.hub.leaveStaking('100', { from: bob });
      await this.hub.withdraw(1, '100', { from: alice });
      await this.hub.withdraw(1, '100', { from: bob });

    });

    it('should allow dev and only dev to update dev', async () => {
        assert.equal((await this.hub.devaddr()).valueOf(), dev);
        await expectRevert(this.hub.dev(bob, { from: bob }), 'dev: wut?');
        await this.hub.dev(bob, { from: dev });
        assert.equal((await this.hub.devaddr()).valueOf(), bob);
        await this.hub.dev(alice, { from: bob });
        assert.equal((await this.hub.devaddr()).valueOf(), alice);
    })
});
