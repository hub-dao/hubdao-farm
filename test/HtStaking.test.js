const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');
const HDToken = artifacts.require('HDToken');
const HtStaking = artifacts.require('HtStaking');
const MockHRC20 = artifacts.require('libs/MockHRC20');
const WHT = artifacts.require('libs/WHT');

contract('HtStaking.......', async ([alice, bob, admin, dev, minter]) => {
  beforeEach(async () => {
    this.rewardToken = await HDToken.new({ from: minter });
    this.lpToken = await MockHRC20.new('LPToken', 'LP1', '1000000', {
      from: minter,
    });
    this.wHT = await WHT.new({ from: minter });
    this.htHub = await HtStaking.new(
      this.wHT.address,
      this.rewardToken.address,
      1000,
      10,
      1010,
      admin,
      this.wHT.address,
      { from: minter }
    );
    await this.rewardToken.mint(this.htHub.address, 100000, { from: minter });
  });

  it('deposit/withdraw', async () => {
    await time.advanceBlockTo('10');
    await this.htHub.deposit({ from: alice, value: 100 });
    await this.htHub.deposit({ from: bob, value: 200 });
    assert.equal(
      (await this.wHT.balanceOf(this.htHub.address)).toString(),
      '300'
    );
    assert.equal((await this.htHub.pendingReward(alice)).toString(), '1000');
    await this.htHub.deposit({ from: alice, value: 300 });
    assert.equal((await this.htHub.pendingReward(alice)).toString(), '0');
    assert.equal((await this.rewardToken.balanceOf(alice)).toString(), '1333');
    await this.htHub.withdraw('100', { from: alice });
    assert.equal(
      (await this.wHT.balanceOf(this.htHub.address)).toString(),
      '500'
    );
    await this.htHub.emergencyRewardWithdraw(1000, { from: minter });
    assert.equal((await this.htHub.pendingReward(bob)).toString(), '1399');
  });

  it('should block man who in blanklist', async () => {
    await this.htHub.setBlackList(alice, { from: admin });
    await expectRevert(
      this.htHub.deposit({ from: alice, value: 100 }),
      'in black list'
    );
    await this.htHub.removeBlackList(alice, { from: admin });
    await this.htHub.deposit({ from: alice, value: 100 });
    await this.htHub.setAdmin(dev, { from: minter });
    await expectRevert(
      this.htHub.setBlackList(alice, { from: admin }),
      'admin: wut?'
    );
  });

  it('emergencyWithdraw', async () => {
    await this.htHub.deposit({ from: alice, value: 100 });
    await this.htHub.deposit({ from: bob, value: 200 });
    assert.equal(
      (await this.wHT.balanceOf(this.htHub.address)).toString(),
      '300'
    );
    await this.htHub.emergencyWithdraw({ from: alice });
    assert.equal(
      (await this.wHT.balanceOf(this.htHub.address)).toString(),
      '200'
    );
    assert.equal((await this.wHT.balanceOf(alice)).toString(), '100');
  });

  it('emergencyRewardWithdraw', async () => {
    await expectRevert(
      this.htHub.emergencyRewardWithdraw(100, { from: alice }),
      'caller is not the owner'
    );
    await this.htHub.emergencyRewardWithdraw(1000, { from: minter });
    assert.equal((await this.rewardToken.balanceOf(minter)).toString(), '1000');
  });

  it('setLimitAmount', async () => {
    // set limit to 1e-12 HT
    await this.htHub.setLimitAmount('1000000', { from: minter });
    await expectRevert(
      this.htHub.deposit({ from: alice, value: 100000000 }),
      'exceed the to'
    );
  });
});
