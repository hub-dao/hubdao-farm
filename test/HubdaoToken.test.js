const { advanceBlockTo } = require('@openzeppelin/test-helpers/src/time');
const { assert } = require('chai');
const HDToken = artifacts.require('HDToken');
const HubdaoToken = artifacts.require('HubdaoToken');

contract('HubdaoToken', ([alice, bob, carol, dev, minter]) => {
  beforeEach(async () => {
    this.hd = await HDToken.new({ from: minter });
    this.hdt = await HubdaoToken.new(this.hd.address, { from: minter });
  });

  it('mint', async () => {
    await this.hdt.mint(alice, 1000, { from: minter });
    assert.equal((await this.hdt.balanceOf(alice)).toString(), '1000');
  });

  it('burn', async () => {
    await advanceBlockTo('650');
    await this.hdt.mint(alice, 1000, { from: minter });
    await this.hdt.mint(bob, 1000, { from: minter });
    assert.equal((await this.hdt.totalSupply()).toString(), '2000');
    await this.hdt.burn(alice, 200, { from: minter });

    assert.equal((await this.hdt.balanceOf(alice)).toString(), '800');
    assert.equal((await this.hdt.totalSupply()).toString(), '1800');
  });

  it('safeHDTransfer', async () => {
    assert.equal(
      (await this.hd.balanceOf(this.hdt.address)).toString(),
      '0'
    );
    await this.hd.mint(this.hdt.address, 1000, { from: minter });
    await this.hdt.safeHDTransfer(bob, 200, { from: minter });
    assert.equal((await this.hd.balanceOf(bob)).toString(), '200');
    assert.equal(
      (await this.hd.balanceOf(this.hdt.address)).toString(),
      '800'
    );
    await this.hdt.safeHDTransfer(bob, 2000, { from: minter });
    assert.equal((await this.hd.balanceOf(bob)).toString(), '1000');
  });
});
