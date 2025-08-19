// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CashbackRewards is Ownable {
    IERC20 public usdc; // Stablecoin used (e.g., USDC on Base)

    // global config
    uint256 public feeBp = 0; // platform fee in basis points (100 = 1%)
    uint256 public constant POINTS_PER_USDC = 100; // 100 points = 1 USDC

    struct Merchant {
        address destination;
        uint256 cashbackBp; // e.g. 500 = 5%
        bool active;
    }

    mapping(address => Merchant) public merchants;
    mapping(address => uint256) public pointsBalance; // user -> points (100 points = 1 USDC unit)

    event MerchantUpdated(address indexed merchant, address destination, uint256 cashbackBp);
    event ConfigUpdated(uint256 feeBp);
    event Purchase(address indexed user, address indexed merchant, uint256 amount, uint256 netToMerchant, uint256 cashbackPoints);
    event Redeem(address indexed user, address indexed merchant, uint256 amount, uint256 pointsUsed);
    event PointsRedeemed(address indexed user, uint256 pointsRedeemed, uint256 usdcAmount);
    event AdminWithdraw(address indexed admin, uint256 amount);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    // ----------- Admin Methods ----------- //
    function setFeeBp(uint256 _feeBp) external onlyOwner {
        require(_feeBp <= 1000, "fee too high"); // max 10%
        feeBp = _feeBp;
        emit ConfigUpdated(_feeBp);
    }

    function setMerchant(address _merchant, address _destination, uint256 _cashbackBp) external onlyOwner {
        merchants[_merchant] = Merchant({
            destination: _destination,
            cashbackBp: _cashbackBp,
            active: true
        });
        emit MerchantUpdated(_merchant, _destination, _cashbackBp);
    }

    // Admin function to withdraw USDC balance
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(amount > 0, "amount must be greater than 0");
        require(usdc.balanceOf(address(this)) >= amount, "insufficient USDC balance");
        
        require(usdc.transfer(msg.sender, amount), "withdraw failed");
        emit AdminWithdraw(msg.sender, amount);
    }

    // ----------- User Methods ----------- //
    function purchase(address merchant, uint256 amount) external {
        Merchant memory m = merchants[merchant];
        require(m.active, "merchant not active");

        // pull USDC from user
        require(usdc.transferFrom(msg.sender, address(this), amount), "payment failed");

        // calculate fee + cashback
        uint256 fee = (amount * feeBp) / 10000;
        uint256 cashback = (amount * m.cashbackBp) / 10000;
        uint256 netToMerchant = amount - fee - cashback;

        // send to merchant
        require(usdc.transfer(m.destination, netToMerchant), "merchant transfer failed");

        // credit cashback points to user (convert USDC to points)
        uint256 cashbackPoints = cashback * POINTS_PER_USDC;
        pointsBalance[msg.sender] += cashbackPoints;

        emit Purchase(msg.sender, merchant, amount, netToMerchant, cashbackPoints);
    }

    // Redeem points (points offset purchase, deducted from pool)
    function redeemWithPoints(address merchant, uint256 itemPrice) external {
        uint256 requiredPoints = itemPrice * POINTS_PER_USDC;
        require(pointsBalance[msg.sender] >= requiredPoints, "not enough points");
        Merchant memory m = merchants[merchant];
        require(m.active, "merchant not active");

        pointsBalance[msg.sender] -= requiredPoints;

        // pool pays merchant in USDC for the redeemed value
        require(usdc.transfer(m.destination, itemPrice), "redeem transfer failed");

        emit Redeem(msg.sender, merchant, itemPrice, requiredPoints);
    }

    // Redeem points for USDC (100 points = 1 USDC)
    function redeemPointsForUSDC(uint256 pointsToRedeem) external {
        require(pointsToRedeem > 0, "points must be greater than 0");
        require(pointsBalance[msg.sender] >= pointsToRedeem, "not enough points");
        require(pointsToRedeem % POINTS_PER_USDC == 0, "points must be multiple of 100");

        uint256 usdcAmount = pointsToRedeem / POINTS_PER_USDC;
        require(usdc.balanceOf(address(this)) >= usdcAmount, "insufficient USDC balance");

        pointsBalance[msg.sender] -= pointsToRedeem;
        require(usdc.transfer(msg.sender, usdcAmount), "USDC transfer failed");

        emit PointsRedeemed(msg.sender, pointsToRedeem, usdcAmount);
    }

    // view helper
    function getUserPoints(address user) external view returns (uint256) {
        return pointsBalance[user];
    }

    // view helper to get USDC equivalent of points
    function getPointsInUSDC(uint256 points) external pure returns (uint256) {
        return points / POINTS_PER_USDC;
    }

    // view helper to get contract's USDC balance
    function getContractUSDCBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}