pragma solidity 0.6.12;

import '@hubdao-finance/hubdao-lib/contracts/token/HRC20/IHRC20.sol';
import '@hubdao-finance/hubdao-lib/contracts/token/HRC20/SafeHRC20.sol';
import '@hubdao-finance/hubdao-lib/contracts/access/Ownable.sol';

import './MasterHub.sol';

contract LotteryRewardPool is Ownable {
    using SafeHRC20 for IHRC20;

    MasterHub public hub;
    address public adminAddress;
    address public receiver;
    IHRC20 public lptoken;
    IHRC20 public hd;

    constructor(
        MasterHub _hub,
        IHRC20 _hd,
        address _admin,
        address _receiver
    ) public {
        hub = _hub;
        hd = _hd;
        adminAddress = _admin;
        receiver = _receiver;
    }

    event StartFarming(address indexed user, uint256 indexed pid);
    event Harvest(address indexed user, uint256 indexed pid);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == adminAddress, "admin: wut?");
        _;
    }

    function startFarming(uint256 _pid, IHRC20 _lptoken, uint256 _amount) external onlyAdmin {
        _lptoken.safeApprove(address(hub), _amount);
        hub.deposit(_pid, _amount);
        emit StartFarming(msg.sender, _pid);
    }

    function  harvest(uint256 _pid) external onlyAdmin {
        hub.deposit(_pid, 0);
        uint256 balance = hd.balanceOf(address(this));
        hd.safeTransfer(receiver, balance);
        emit Harvest(msg.sender, _pid);
    }

    function setReceiver(address _receiver) external onlyAdmin {
        receiver = _receiver;
    }

    function  pendingReward(uint256 _pid) external view returns (uint256) {
        return hub.pendingCake(_pid, address(this));
    }

    // EMERGENCY ONLY.
    function emergencyWithdraw(IHRC20 _token, uint256 _amount) external onlyOwner {
        hd.safeTransfer(address(msg.sender), _amount);
        emit EmergencyWithdraw(msg.sender, _amount);
    }

    function setAdmin(address _admin) external onlyOwner {
        adminAddress = _admin;
    }

}
