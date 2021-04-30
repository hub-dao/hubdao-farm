const { expectRevert, time } = require('@openzeppelin/test-helpers');
const HDToken = artifacts.require('HDToken');
const MasterHub = artifacts.require('MasterHub');
const HubdaoToken = artifacts.require('HubdaoToken');
const HubDao = artifacts.require('HubDao');
const MockHRC20 = artifacts.require('libs/MockHRC20');

contract('HubDao', ([alice, bob, carol, dev, minter]) => {
  beforeEach(async () => {
    this.hdt = await MockHRC20.new('LPToken', 'LP1', '1000000', {
      from: minter,
    });
    this.hub = await HubDao.new(this.hdt.address, '40', '300', '400', {
      from: minter,
    });
  });

  it('hubdao now', async () => {
    await this.hdt.transfer(bob, '1000', { from: minter });
    await this.hdt.transfer(carol, '1000', { from: minter });
    await this.hdt.transfer(alice, '1000', { from: minter });
    assert.equal((await this.hdt.balanceOf(bob)).toString(), '1000');

    await this.hdt.approve(this.hub.address, '1000', { from: bob });
    await this.hdt.approve(this.hub.address, '1000', { from: alice });
    await this.hdt.approve(this.hub.address, '1000', { from: carol });

    await this.hub.deposit('10', { from: bob });
    assert.equal(
      (await this.hdt.balanceOf(this.hub.address)).toString(),
      '10'
    );

    await time.advanceBlockTo('300');

    await this.hub.deposit('30', { from: alice });
    assert.equal(
      (await this.hdt.balanceOf(this.hub.address)).toString(),
      '40'
    );
    assert.equal(
      (await this.hub.pendingReward(bob, { from: bob })).toString(),
      '40'
    );

    await time.advanceBlockTo('302');
    assert.equal(
      (await this.hub.pendingReward(bob, { from: bob })).toString(),
      '50'
    );
    assert.equal(
      (await this.hub.pendingReward(alice, { from: alice })).toString(),
      '30'
    );

    await this.hub.deposit('40', { from: carol });
    assert.equal(
      (await this.hdt.balanceOf(this.hub.address)).toString(),
      '80'
    );
    await time.advanceBlockTo('304');
    //  bob 10, alice 30, carol 40
    assert.equal(
      (await this.hub.pendingReward(bob, { from: bob })).toString(),
      '65'
    );
    assert.equal(
      (await this.hub.pendingReward(alice, { from: alice })).toString(),
      '75'
    );
    assert.equal(
      (await this.hub.pendingReward(carol, { from: carol })).toString(),
      '20'
    );

    await this.hub.deposit('20', { from: alice }); // 305 bob 10, alice 50, carol 40
    await this.hub.deposit('30', { from: bob }); // 306  bob 40, alice 50, carol 40

    assert.equal(
      (await this.hub.pendingReward(bob, { from: bob })).toString(),
      '74'
    );
    assert.equal(
      (await this.hub.pendingReward(alice, { from: alice })).toString(),
      '110'
    );

    await time.advanceBlockTo('307');
    assert.equal(
      (await this.hub.pendingReward(bob, { from: bob })).toString(),
      '86'
    );
    assert.equal(
      (await this.hub.pendingReward(alice, { from: alice })).toString(),
      '125'
    );

    await this.hub.withdraw('20', { from: alice }); // 308 bob 40, alice 30, carol 40
    await this.hub.withdraw('30', { from: bob }); // 309  bob 10, alice 30, carol 40

    await time.advanceBlockTo('310');
    assert.equal(
      (await this.hub.pendingReward(bob, { from: bob })).toString(),
      '118'
    );
    assert.equal(
      (await this.hub.pendingReward(alice, { from: alice })).toString(),
      '166'
    );
    assert.equal(
      (await this.hdt.balanceOf(this.hub.address)).toString(),
      '80'
    );

    await time.advanceBlockTo('400');
    assert.equal(
      (await this.hub.pendingReward(bob, { from: bob })).toString(),
      '568'
    );
    assert.equal(
      (await this.hub.pendingReward(alice, { from: alice })).toString(),
      '1516'
    );
    assert.equal(
      (await this.hub.pendingReward(carol, { from: alice })).toString(),
      '1915'
    );

    await time.advanceBlockTo('420');
    assert.equal(
      (await this.hub.pendingReward(bob, { from: bob })).toString(),
      '568'
    );
    assert.equal(
      (await this.hub.pendingReward(alice, { from: alice })).toString(),
      '1516'
    );
    assert.equal(
      (await this.hub.pendingReward(carol, { from: alice })).toString(),
      '1915'
    );

    await this.hub.withdraw('10', { from: bob });
    await this.hub.withdraw('30', { from: alice });
    await expectRevert(this.hub.withdraw('50', { from: carol }), 'not enough');
    await this.hub.deposit('30', { from: carol });
    await time.advanceBlockTo('450');
    assert.equal(
      (await this.hub.pendingReward(bob, { from: bob })).toString(),
      '568'
    );
    assert.equal(
      (await this.hub.pendingReward(alice, { from: alice })).toString(),
      '1516'
    );
    assert.equal(
      (await this.hub.pendingReward(carol, { from: alice })).toString(),
      '1915'
    );
    await this.hub.withdraw('70', { from: carol });
    assert.equal((await this.hub.addressLength()).toString(), '3');
  });

  it('try hdt', async () => {
    this.hd = await HDToken.new({ from: minter });
    this.hdt = await HubdaoToken.new(this.hd.address, { from: minter });
    this.lp1 = await MockHRC20.new('LPToken', 'LP1', '1000000', {
      from: minter,
    });
    this.hub = await MasterHub.new(
      this.hd.address,
      this.hdt.address,
      dev,
      '1000',
      '300',
      { from: minter }
    );
    await this.hd.transferOwnership(this.hub.address, { from: minter });
    await this.hdt.transferOwnership(this.hub.address, { from: minter });
    await this.lp1.transfer(bob, '2000', { from: minter });
    await this.lp1.transfer(alice, '2000', { from: minter });

    await this.lp1.approve(this.hub.address, '1000', { from: alice });
    await this.hd.approve(this.hub.address, '1000', { from: alice });

    await this.hub.add('1000', this.lp1.address, true, { from: minter });
    await this.hub.deposit(1, '20', { from: alice });
    await time.advanceBlockTo('500');
    await this.hub.deposit(1, '0', { from: alice });
    await this.hub.add('1000', this.lp1.address, true, { from: minter });

    await this.hub.enterStaking('10', { from: alice });
    await time.advanceBlockTo('510');
    await this.hub.enterStaking('10', { from: alice });

    this.hub2 = await HubDao.new(this.hdt.address, '40', '600', '800', {
      from: minter,
    });
    await this.hdt.approve(this.hub2.address, '10', { from: alice });
    await time.advanceBlockTo('590');
    this.hub2.deposit('10', { from: alice }); //520
    await time.advanceBlockTo('610');
    assert.equal(
      (await this.hdt.balanceOf(this.hub2.address)).toString(),
      '10'
    );
    assert.equal(
      (await this.hub2.pendingReward(alice, { from: alice })).toString(),
      '400'
    );
  });

  it('emergencyWithdraw', async () => {
    await this.hdt.transfer(alice, '1000', { from: minter });
    assert.equal((await this.hdt.balanceOf(alice)).toString(), '1000');

    await this.hdt.approve(this.hub.address, '1000', { from: alice });
    await this.hub.deposit('10', { from: alice });
    assert.equal((await this.hdt.balanceOf(alice)).toString(), '990');
    await this.hub.emergencyWithdraw({ from: alice });
    assert.equal((await this.hdt.balanceOf(alice)).toString(), '1000');
    assert.equal(
      (await this.hub.pendingReward(alice, { from: alice })).toString(),
      '0'
    );
  });
});
