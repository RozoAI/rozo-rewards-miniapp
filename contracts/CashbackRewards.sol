// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CashbackRewards is Ownable {
    IERC20 public usdc; // Stablecoin used (e.g., USDC on Base)

    // global config
    uint256 public feeBp = 100; // platform fee in basis points (100 = 1%)
    uint256 public constant POINTS_PER_USDC = 100; // 100 points = 1 USDC

    struct Merchant {
        uint256 merchantId; // e.g. 500 = 5%
        address destination;
        uint256 cashbackBp; // e.g. 500 = 5%
        bool active;
    }

    mapping(uint256 => Merchant) public merchants;
    mapping(address => uint256) public pointsBalance; // user -> points (100 points = 1 USDC unit)
    mapping(address => bool) public hasClaimed; // track if user has claimed welcome bonus

    event MerchantUpdated(uint256 merchantId, address destination, uint256 cashbackBp);
    event ConfigUpdated(uint256 feeBp);
    event Purchase(address indexed user, address indexed merchant, uint256 amount, uint256 netToMerchant, uint256 cashbackPoints);
    event Redeem(address indexed user, address indexed merchant, uint256 amount, uint256 pointsUsed);
    event PointsRedeemed(address indexed user, uint256 pointsRedeemed, uint256 usdcAmount);
    event AdminWithdraw(address indexed admin, uint256 amount);
    event WelcomeBonusClaimed(address indexed user, uint256 points);
    event AdminCashbackAdded(address indexed user, uint256 pointsAdded);
    event AdminRedeemPoints(address indexed user, address indexed merchant, uint256 itemPrice, uint256 pointsUsed);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    // ----------- Admin Methods ----------- //
    function setFeeBp(uint256 _feeBp) external onlyOwner {
        require(_feeBp <= 1000, "fee too high"); // max 10%
        feeBp = _feeBp;
        emit ConfigUpdated(_feeBp);
    }

    function setMerchant(uint256 _merchantId, address _destination, uint256 _cashbackBp) external onlyOwner {
        merchants[_merchantId] = Merchant({
            merchantId: _merchantId,
            destination: _destination,
            cashbackBp: _cashbackBp,
            active: true
        });
        emit MerchantUpdated(_merchantId, _destination, _cashbackBp);
    }

    // Admin function to withdraw USDC balance
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(amount > 0, "amount must be greater than 0");
        require(amount <= 1000000000, "amount must be less than 1000 USDC");
        require(usdc.balanceOf(address(this)) >= amount, "insufficient USDC balance");
        
        require(usdc.transfer(msg.sender, amount), "withdraw failed");
        emit AdminWithdraw(msg.sender, amount);
    }

    // Admin function to add cashback points to a specific user
    function adminAddCashback(address user, uint256 pointsToAdd) external onlyOwner {
        require(user != address(0), "invalid user address");
        require(pointsToAdd > 0, "points must be greater than 0");
        
        pointsBalance[user] += pointsToAdd;
        emit AdminCashbackAdded(user, pointsToAdd);
    }

    // Admin function to redeem points for a specific user
    function adminRedeemPoints(address user, address merchant, uint256 itemPrice) external onlyOwner {
        require(user != address(0), "invalid user address");
        require(merchant != address(0), "invalid merchant address");
        require(itemPrice > 0, "item price must be greater than 0");
        
        uint256 requiredPoints = itemPrice * POINTS_PER_USDC;
        require(pointsBalance[user] >= requiredPoints, "user has insufficient points");
        Merchant memory m = merchants[merchant];
        require(m.active, "merchant not active");

        pointsBalance[user] -= requiredPoints;

        // pool pays merchant in USDC for the redeemed value
        require(usdc.transfer(m.destination, itemPrice), "redeem transfer failed");

        emit AdminRedeemPoints(user, merchant, itemPrice, requiredPoints);
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
        uint256 UNIT = 1000000; // 1 USDC = 1000000 USDC units
        uint256 cashbackPoints = cashback * POINTS_PER_USDC / UNIT;
        pointsBalance[msg.sender] += cashbackPoints;

        emit Purchase(msg.sender, merchant, amount, netToMerchant, cashbackPoints);
    }

    // Redeem points (points offset purchase, deducted from pool)
    function redeemWithPoints(address merchant, uint256 itemPrice) external {
        uint256 requiredPoints = itemPrice * POINTS_PER_USDC / UNIT;
        require(pointsBalance[msg.sender] >= requiredPoints, "not enough points");
        Merchant memory m = merchants[merchant];
        require(m.active, "merchant not active");

        pointsBalance[msg.sender] -= requiredPoints;

        // pool pays merchant in USDC for the redeemed value
        require(usdc.transfer(m.destination, itemPrice), "redeem transfer failed");

        emit Redeem(msg.sender, merchant, itemPrice, requiredPoints);
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