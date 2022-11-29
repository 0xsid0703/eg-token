const { ethers } = require("hardhat");
const { expect } = require("chai");

const BINANCE_ROUTER_ADDRESS = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3";
const tradeStartDelay = 9;
const tradeStartCoolDown = 100;

describe("EGToken TestCase", function () {
  before(async () => {
    egContract = await ethers.getContractFactory("EG");
    [owner, addr1, addr2, addr3, addr4, addr4, addr5, ...addrs] =
      await ethers.getSigners();
    egToken = await egContract.connect(owner).deploy();
    await egToken.connect(owner).initialize(BINANCE_ROUTER_ADDRESS);

    uniswapV2Router02 = await ethers.getContractAt(
      "IUniswapV2Router02",
      BINANCE_ROUTER_ADDRESS
    );
  });

  describe("Deployment", () => {
    it("should set owner correctly", async () => {
      expect(await egToken.owner()).to.equal(owner.address);
    });

    it("check the initialize function only once", async () => {
      await expect(
        egToken.connect(owner).initialize(BINANCE_ROUTER_ADDRESS)
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
  });

  describe("Initialize", () => {
    it("Set maxTransactionAmount as 0%", async () => {
      const maxTransactionAmount = await egToken.maxTransactionAmount();
      expect(BigInt(0)).to.equal(maxTransactionAmount);
    });

    it("Set maxTransactionCoolDownAmount as 0.1%", async () => {
      const totalSupply = await egToken.totalSupply();
      const maxTransactionCoolDownAmount =
        await egToken.maxTransactionCoolDownAmount();
      expect(totalSupply.div(1000)).to.equal(maxTransactionCoolDownAmount);
    });

    it("Set buyFee as 5%", async () => {
      expect(await egToken.buyFee()).to.be.equal(BigInt(5));
    });

    it("Set sellFee as 5%", async () => {
      expect(await egToken.sellFee()).to.be.equal(BigInt(5));
    });

    it("Set transferFee as 0%", async () => {
      expect(await egToken.transferFee()).to.be.equal(BigInt(0));
    });

    it("Set marketingWalletFee as 20%", async () => {
      expect(await egToken.marketingWalletFee()).to.be.equal(BigInt(20));
    });

    it("Set liquidityWalletFee as 20%", async () => {
      expect(await egToken.liquidityWalletFee()).to.be.equal(BigInt(20));
    });

    it("Set techWalletFee as 30%", async () => {
      expect(await egToken.techWalletFee()).to.be.equal(BigInt(30));
    });

    it("Set donationsWalletFee as 10%", async () => {
      expect(await egToken.donationsWalletFee()).to.be.equal(BigInt(10));
    });

    it("Set stakingRewardsWalletFee as 20%", async () => {
      expect(await egToken.stakingRewardsWalletFee()).to.be.equal(BigInt(20));
    });

    it("Should set uniswap v2 router address correctly", async () => {
      expect(await egToken.uniswapV2Router()).to.equal(BINANCE_ROUTER_ADDRESS);
    });

    it("Set owner balance as totalSupply", async () => {
      const totalSupply = await egToken.totalSupply();
      const ownerBalance = await egToken.balanceOf(owner.address);
      expect(totalSupply).to.equal(ownerBalance);
    });
  });

  describe("Check all functions", () => {
    it("transfer(address recipient, uint256 amount)", async () => {
      const _beforeBalance = await egToken.balanceOf(addr1.address);
      await egToken
        .connect(owner)
        .transfer(addr1.address, BigInt(1000000000000000000));
      const _afterBalance = await egToken.balanceOf(addr1.address);
      expect(_afterBalance.sub(_beforeBalance)).to.equal(
        BigInt(1000000000000000000)
      );
    });

    it("Check transferFrom, approve", async () => {
      const _beforeBalance = await egToken.balanceOf(addr1.address);
      await egToken
        .connect(owner)
        .approve(addr1.address, BigInt(1000000000000000000));
      await egToken
        .connect(addr1)
        .transferFrom(
          owner.address,
          addr1.address,
          BigInt(1000000000000000000)
        );
      const _afterBalance = await egToken.balanceOf(addr1.address);
      expect(_afterBalance.sub(_beforeBalance)).to.equal(
        BigInt(1000000000000000000)
      );
    });

    it("Check allowance(address ownerAddress, address delegate)", async () => {
      const _beforeAllowance = await egToken.allowance(
        owner.address,
        addr1.address
      );
      await egToken.connect(owner).approve(addr1.address, BigInt(10000));
      const _afterAllowance = await egToken.allowance(
        owner.address,
        addr1.address
      );
      expect(_afterAllowance.sub(_beforeAllowance)).to.equal(BigInt(10000));
    });

    it("Check owner in whiteList", async () => {
      expect(await egToken.connect(owner).whiteList(owner.address)).to.equal(
        true
      );
    });

    it("Check isTradingEnabled", async () => {
      expect(await egToken.isTradingEnabled()).to.equal(false);
    });

    it("Check inTradingStartCoolDown", async () => {
      expect(await egToken.inTradingStartCoolDown()).to.equal(true);
    });

    it("Check setTradingEnabled", async () => {
      await expect(
        egToken.connect(owner).setTradingEnabled(10, 150)
      ).to.be.revertedWith(
        "EG: tradeStartDelay should be less than 10 minutes"
      );
      await expect(
        egToken.connect(owner).setTradingEnabled(9, 150)
      ).to.be.revertedWith(
        "EG: tradeStartCoolDown should be less than 120 minutes"
      );
      await expect(
        egToken.connect(owner).setTradingEnabled(9, 8)
      ).to.be.revertedWith(
        "EG: tradeStartDelay must be less than tradeStartCoolDown"
      );

      await egToken.connect(owner).setTradingEnabled(9, 100);

      expect(await egToken.isTradingEnabled()).to.equal(false);
      expect(await egToken.inTradingStartCoolDown()).to.equal(true);

      await ethers.provider.send("evm_increaseTime", [10 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      expect(await egToken.isTradingEnabled()).to.equal(true);

      await ethers.provider.send("evm_increaseTime", [101 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      expect(await egToken.inTradingStartCoolDown()).to.equal(false);
    });

    it("Check setRouterAddress", async () => {
      await egToken.connect(owner).setRouterAddress(BINANCE_ROUTER_ADDRESS);
      expect(await egToken.uniswapV2Router()).to.equal(BINANCE_ROUTER_ADDRESS);
    });

    it("Check setMarketingWallet", async () => {
      await expect(
        egToken.connect(owner).setMarketingWallet(ethers.constants.AddressZero)
      ).to.be.revertedWith(
        "EG: The marketing wallet should not be the zero address"
      );
      await egToken.connect(owner).setMarketingWallet(addr1.address);
      expect(await egToken.marketingWallet()).to.equal(addr1.address);
    });

    it("Check setMarketingWalletFee", async () => {
      await egToken.connect(owner).setMarketingWalletFee(20);
      expect(await egToken.marketingWalletFee()).to.equal(BigInt(20));
    });

    it("Check setLiquidityWallet", async () => {
      await expect(
        egToken.connect(owner).setLiquidityWallet(ethers.constants.AddressZero)
      ).to.be.revertedWith(
        "EG: The liquidity wallet should not be the zero address"
      );
      await egToken.connect(owner).setLiquidityWallet(addr2.address);
      expect(await egToken.liquidityWallet()).to.equal(addr2.address);
    });

    it("Check setLiquidityWalletFee", async () => {
      await egToken.connect(owner).setLiquidityWalletFee(BigInt(20));
      expect(await egToken.liquidityWalletFee()).to.equal(BigInt(20));
    });

    it("Check setTechWallet", async () => {
      await expect(
        egToken.connect(owner).setTechWallet(ethers.constants.AddressZero)
      ).to.be.revertedWith(
        "EG: The tech wallet should not be the zero address"
      );
      await egToken.connect(owner).setTechWallet(addr3.address);
      expect(await egToken.techWallet()).to.equal(addr3.address);
    });

    it("Check setTechWalletFee", async () => {
      await egToken.connect(owner).setTechWalletFee(BigInt(20));
      expect(await egToken.techWalletFee()).to.equal(BigInt(20));
    });

    it("Check setDonationsWallet", async () => {
      await expect(
        egToken.connect(owner).setDonationsWallet(ethers.constants.AddressZero)
      ).to.be.revertedWith(
        "EG: The donation wallet should not be the zero address"
      );
      await egToken.connect(owner).setDonationsWallet(addr4.address);
      expect(await egToken.donationsWallet()).to.equal(addr4.address);
    });

    it("Check setDonationsWalletFee", async () => {
      await egToken.connect(owner).setDonationsWalletFee(BigInt(20));
      expect(await egToken.donationsWalletFee()).to.equal(BigInt(20));
    });

    it("Check setStakingRewardsWallet", async () => {
      await expect(
        egToken
          .connect(owner)
          .setStakingRewardsWallet(ethers.constants.AddressZero)
      ).to.be.revertedWith(
        "EG: The staking wallet should not be the zero address"
      );
      await egToken.connect(owner).setStakingRewardsWallet(addr5.address);
      expect(await egToken.stakingRewardsWallet()).to.equal(addr5.address);
    });

    it("Check setStakingRewardsWalletFee", async () => {
      await egToken.connect(owner).setStakingRewardsWalletFee(BigInt(20));
      expect(await egToken.stakingRewardsWalletFee()).to.equal(BigInt(20));
    });

    it("Check setMaxTransactionAmount", async () => {
      const _before = await egToken.maxTransactionAmount();
      await egToken.connect(owner).setMaxTransactionAmount(1000);
      const _after = await egToken.maxTransactionAmount();
      expect(_after).to.equal(BigInt(1000));
      await egToken.connect(owner).setMaxTransactionAmount(_before);
    });

    it("Check setMaxTransactionCoolDownAmount", async () => {
      const _before = await egToken.maxTransactionCoolDownAmount();
      await egToken.connect(owner).setMaxTransactionCoolDownAmount(1000);
      const _after = await egToken.maxTransactionCoolDownAmount();
      expect(_after).to.equal(BigInt(1000));
      await egToken.connect(owner).setMaxTransactionCoolDownAmount(_before);
    });

    it("Check addClientsToWhiteList", async () => {
      await egToken.connect(owner).addClientsToWhiteList([addr1.address]);
      expect(await egToken.whiteList(addr1.address)).to.equal(true);
    });

    it("Check removeClientsFromWhiteList", async () => {
      await egToken.connect(owner).removeClientsFromWhiteList([addr1.address]);
      expect(await egToken.whiteList(addr1.address)).to.equal(false);
    });

    it("Check addClientsToBlackList", async () => {
      await egToken.connect(owner).addClientsToBlackList([addr1.address]);
      expect(await egToken.blackList(addr1.address)).to.equal(true);
    });

    it("Check transferFrom the blacklist address to onwer", async() => {
      const _beforeBalance = await egToken.balanceOf(owner.address);
      await egToken
        .connect(addr1)
        .transfer(owner.address, BigInt(1000000000000000000));
      const _afterBalance = await egToken.balanceOf(owner.address);
      expect(_afterBalance.sub(_beforeBalance)).to.equal(
        BigInt(1000000000000000000)
      );
    });

    it("Check removeClientsFromBlackList", async () => {
      await egToken.connect(owner).removeClientsFromBlackList([addr1.address]);
      expect(await egToken.blackList(addr1.address)).to.equal(false);
    });

    it("Check setBuyFee", async () => {
      await egToken.connect(owner).setBuyFee(10);
      expect(await egToken.buyFee()).to.be.equal(BigInt(10));
      await expect(egToken.connect(owner).setBuyFee(100)).to.be.revertedWith(
        "EG: buyFeeRate should be less than 100%"
      );
    });

    it("Check setSellFee", async () => {
      await egToken.connect(owner).setSellFee(10);
      expect(await egToken.sellFee()).to.be.equal(BigInt(10));
      await expect(egToken.connect(owner).setSellFee(100)).to.be.revertedWith(
        "EG: sellFeeRate should be less than 100%"
      );
    });

    it("Check setTransferFee", async () => {
      await egToken.connect(owner).setTransferFee(10);
      expect(await egToken.transferFee()).to.equal(BigInt(10));
      await expect(
        egToken.connect(owner).setTransferFee(100)
      ).to.be.revertedWith("EG: transferFeeRate should be less than 100%");
    });

    it("Check withdrawTokens", async () => {
      await expect(egToken.connect(owner).withdrawTokens()).to.be.revertedWith(
        "EG: There are no tokens to withdraw."
      );
      const _beforeWithdrawBalance = await egToken.balanceOf(
        await egToken.marketingWallet()
      );
      await egToken.connect(owner).transfer(await egToken.address, 100);
      await egToken.connect(owner).withdrawTokens();
      const _afterWithdrawBalance = await egToken.balanceOf(
        await egToken.marketingWallet()
      );
      expect(_afterWithdrawBalance.sub(_beforeWithdrawBalance)).to.equal(
        await egToken.marketingWalletFee()
      );
      expect(await egToken.balanceOf(await egToken.liquidityWallet())).to.equal(
        await egToken.liquidityWalletFee()
      );
      expect(await egToken.balanceOf(await egToken.techWallet())).to.equal(
        await egToken.techWalletFee()
      );
      expect(await egToken.balanceOf(await egToken.donationsWallet())).to.equal(
        await egToken.donationsWalletFee()
      );
      expect(
        await egToken.balanceOf(await egToken.stakingRewardsWallet())
      ).to.equal(await egToken.stakingRewardsWalletFee());
    });
  });
});

describe("EGToken TestCase for SWAP", function () {
  before(async () => {
    egContract = await ethers.getContractFactory("EG");
    [owner, addr1, addr2, addr3, addr4, addr4, addr5, ...addrs] =
      await ethers.getSigners();
    egToken = await egContract.connect(owner).deploy();
    await egToken.connect(owner).initialize(BINANCE_ROUTER_ADDRESS);

    uniswapV2Router02 = await ethers.getContractAt(
      "IUniswapV2Router02",
      BINANCE_ROUTER_ADDRESS
    );
  });
  describe("Check swap functions", () => {
    it("No one should be able to create a liquidity pool before", async () => {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const blockTimestamp = block.timestamp;
      let deadline = blockTimestamp + 60 * 20;

      await egToken
        .connect(addr1)
        .approve(BINANCE_ROUTER_ADDRESS, ethers.utils.parseEther("100"));

      await expect(
        uniswapV2Router02.connect(addr1).addLiquidityETH(
          egToken.address,
          ethers.utils.parseEther("10"), // amountTokenDesired
          ethers.utils.parseEther("10"), // amountTokenMin
          ethers.utils.parseEther("1"), // amountETHMin
          owner.address,
          BigInt(deadline),
          { value: ethers.utils.parseEther("10") }
        )
      ).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");
    });

    it("Only the owner can create a liquidity pool", async () => {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const blockTimestamp = block.timestamp;
      let deadline = blockTimestamp + 60 * 20;

      await egToken
        .connect(owner)
        .approve(BINANCE_ROUTER_ADDRESS, ethers.utils.parseEther("10"));

      await uniswapV2Router02.connect(owner).addLiquidityETH(
        egToken.address,
        ethers.utils.parseEther("10"), // amountTokenDesired
        ethers.utils.parseEther("10"), // amountTokenMin
        ethers.utils.parseEther("1"), // amountETHMin
        owner.address,
        BigInt(deadline),
        { value: ethers.utils.parseEther("10") }
      );
    });

    it("No one should be able to create a liquidity pool an alternative liquidity pool outside the official liquidity", async () => {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const blockTimestamp = block.timestamp;
      let deadline = blockTimestamp + 60 * 20;

      await egToken
        .connect(addr1)
        .approve(BINANCE_ROUTER_ADDRESS, ethers.utils.parseEther("100"));

      await expect(
        uniswapV2Router02.connect(addr1).addLiquidityETH(
          egToken.address,
          ethers.utils.parseEther("10"), // amountTokenDesired
          ethers.utils.parseEther("10"), // amountTokenMin
          ethers.utils.parseEther("1"), // amountETHMin
          owner.address,
          BigInt(deadline),
          { value: ethers.utils.parseEther("10") }
        )
      ).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");
    });

    it("set trading enable by owner", async () => {
      await egToken
        .connect(owner)
        .setTradingEnabled(tradeStartDelay, tradeStartCoolDown);
    });

    it("isTradingEnabled is false and cooldown is true after trading started", async () => {
      /**
       * @dev start trading after tradeStartDelay
       **/
      expect(await egToken.isTradingEnabled()).to.equal(false);

      /**
       * @dev inTradingStartCoolDown returns true as default
       **/
      expect(await egToken.inTradingStartCoolDown()).to.equal(true);
    });

    it("start trading after startDelay time later", async () => {
      await ethers.provider.send("evm_increaseTime", [
        tradeStartDelay * 60 + 10,
      ]);
      await ethers.provider.send("evm_mine");
      /**
       * @dev start trading after tradeStartDelay
       **/
      expect(await egToken.isTradingEnabled()).to.equal(true);
    });

    it("checking cooldown status is ture in cooldown time", async () => {
      /**
       * @dev inTradingStartCoolDown in cooldown time
       **/
      expect(await egToken.inTradingStartCoolDown()).to.equal(true);
    });

    it("Max transaction amount will be 0.01% of the supply; swap will fail because the swap token amount is bigger than the maxTransactionCoolDownAmount ", async () => {
      const _blockNumber = await ethers.provider.getBlockNumber();
      const _block = await ethers.provider.getBlock(_blockNumber);
      const _blockTimestamp = _block.timestamp;
      let _deadline = _blockTimestamp + 60;
      const path = [egToken.address, await uniswapV2Router02.WETH()];
      let _amountIn = await egToken.maxTransactionCoolDownAmount();
      _amountIn = _amountIn.add(1);
      await egToken.connect(owner).transfer(addr1.address, _amountIn);
      await egToken.connect(addr1).approve(BINANCE_ROUTER_ADDRESS, _amountIn);
      await expect(
        uniswapV2Router02
          .connect(addr1)
          .swapExactTokensForETHSupportingFeeOnTransferTokens(
            _amountIn,
            0,
            path,
            addr1.address,
            _deadline
          )
      ).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");
      await egToken.connect(addr1).transfer(owner.address, _amountIn);
    });

    it("Max transaction amount will be 0.01% of the supply, swap is working well less than maxTransactionCoolDownAmount, checked sellFee", async () => {
      await ethers.provider.send("evm_mine");
      const _blockNumber = await ethers.provider.getBlockNumber();
      const _block = await ethers.provider.getBlock(_blockNumber);
      const _blockTimestamp = _block.timestamp;
      let _deadline = _blockTimestamp + 100 * 60;
      const path = [egToken.address, await uniswapV2Router02.WETH()];
      const _amountIn = await egToken.maxTransactionCoolDownAmount();
      await egToken.connect(owner).transfer(addr1.address, _amountIn);

      const _beforeAddr1Balance = await egToken.balanceOf(addr1.address);
      const _beforeAddr1NativeBalance = await ethers.provider.getBalance(
        addr1.address
      );

      const _beforeContractBalance = await egToken.balanceOf(egToken.address);
      await egToken.connect(addr1).approve(BINANCE_ROUTER_ADDRESS, _amountIn);
      await uniswapV2Router02
        .connect(addr1)
        .swapExactTokensForETHSupportingFeeOnTransferTokens(
          _amountIn,
          0,
          path,
          addr1.address,
          _deadline
        );

      const _afterAddr1Balance = await egToken.balanceOf(addr1.address);
      const _afterAddr1NativeBalance = await ethers.provider.getBalance(
        addr1.address
      );
      const _deltaAddr1NativeBalance = _afterAddr1NativeBalance.sub(
        _beforeAddr1NativeBalance
      );
      expect(parseInt(_deltaAddr1NativeBalance)).to.be.greaterThan(0);

      expect(_beforeAddr1Balance.sub(_afterAddr1Balance)).to.equal(_amountIn);
      expect(_afterAddr1Balance).to.equal(BigInt(0));

      const _afterContractBalance = await egToken.balanceOf(egToken.address);
      const _sellFee = await egToken.sellFee();
      expect(_afterContractBalance.sub(_beforeContractBalance)).to.equal(
        _amountIn.mul(_sellFee).div(100)
      );
    });

    it("Multiple trades in the others blockchain blocks are working well", async () => {
      await ethers.provider.send("evm_mine");
      const _blockNumber = await ethers.provider.getBlockNumber();
      const _block = await ethers.provider.getBlock(_blockNumber);
      const _blockTimestamp = _block.timestamp;
      let _deadline = _blockTimestamp + 100 * 60;
      const path = [egToken.address, await uniswapV2Router02.WETH()];
      const _amountIn = await egToken.maxTransactionCoolDownAmount();
      await egToken.connect(owner).transfer(addr1.address, _amountIn.mul(2));

      await egToken
        .connect(addr1)
        .approve(BINANCE_ROUTER_ADDRESS, _amountIn.mul(2));

      await uniswapV2Router02
        .connect(addr1)
        .swapExactTokensForETHSupportingFeeOnTransferTokens(
          _amountIn,
          0,
          path,
          addr1.address,
          _deadline
        );

      await uniswapV2Router02
        .connect(addr1)
        .swapExactTokensForETHSupportingFeeOnTransferTokens(
          _amountIn,
          0,
          path,
          addr1.address,
          _deadline
        );
    });

    it("checking cooldown status is false after cooldown time", async () => {
      await ethers.provider.send("evm_increaseTime", [
        tradeStartCoolDown * 60 + 10,
      ]);
      await ethers.provider.send("evm_mine");
      expect(await egToken.inTradingStartCoolDown()).to.equal(false);
    });

    it("maxTransactionAmount is working after cooldown time", async () => {
      await ethers.provider.send("evm_mine");
      const _blockNumber = await ethers.provider.getBlockNumber();
      const _block = await ethers.provider.getBlock(_blockNumber);
      const _blockTimestamp = _block.timestamp;
      let _deadline = _blockTimestamp + 100 * 60;
      const path = [egToken.address, await uniswapV2Router02.WETH()];
      let _amountIn = await egToken.maxTransactionCoolDownAmount();
      _amountIn.add(ethers.utils.parseEther("10"));
      await egToken.connect(owner).transfer(addr1.address, _amountIn);

      const _beforeAddr1Balance = await egToken.balanceOf(addr1.address);
      const _beforeAddr1NativeBalance = await ethers.provider.getBalance(
        addr1.address
      );

      const _beforeContractBalance = await egToken.balanceOf(egToken.address);
      await egToken.connect(addr1).approve(BINANCE_ROUTER_ADDRESS, _amountIn);
      await uniswapV2Router02
        .connect(addr1)
        .swapExactTokensForETHSupportingFeeOnTransferTokens(
          _amountIn,
          0,
          path,
          addr1.address,
          _deadline
        );

      const _afterAddr1Balance = await egToken.balanceOf(addr1.address);
      const _afterAddr1NativeBalance = await ethers.provider.getBalance(
        addr1.address
      );
      const _deltaAddr1NativeBalance = _afterAddr1NativeBalance.sub(
        _beforeAddr1NativeBalance
      );
      expect(parseInt(_deltaAddr1NativeBalance)).to.be.greaterThan(0);

      expect(_beforeAddr1Balance.sub(_afterAddr1Balance)).to.equal(_amountIn);
      expect(_afterAddr1Balance).to.equal(BigInt(0));

      const _afterContractBalance = await egToken.balanceOf(egToken.address);
      const _sellFee = await egToken.sellFee();
      expect(_afterContractBalance.sub(_beforeContractBalance)).to.equal(
        _amountIn.mul(_sellFee).div(100)
      );
    });

    it("token _transfer will be fail in case blacklist member", async () => {
      await egToken.connect(owner).addClientsToBlackList([addr1.address]);

      await ethers.provider.send("evm_mine");
      const _blockNumber = await ethers.provider.getBlockNumber();
      const _block = await ethers.provider.getBlock(_blockNumber);
      const _blockTimestamp = _block.timestamp;
      let _deadline = _blockTimestamp + 100 * 60;
      const path = [egToken.address, await uniswapV2Router02.WETH()];
      let _amountIn = await egToken.maxTransactionCoolDownAmount();
      _amountIn.add(ethers.utils.parseEther("10"));
      await expect(
        egToken.connect(owner).transfer(addr1.address, _amountIn)
      ).to.be.revertedWith(
        "EG: transfer to the blacklist address is not allowed"
      );
    });

    it("swap will be success after remove clients from blacklist", async () => {
      await egToken.connect(owner).removeClientsFromBlackList([addr1.address]);

      await ethers.provider.send("evm_mine");
      const _blockNumber = await ethers.provider.getBlockNumber();
      const _block = await ethers.provider.getBlock(_blockNumber);
      const _blockTimestamp = _block.timestamp;
      let _deadline = _blockTimestamp + 100 * 60;
      const path = [egToken.address, await uniswapV2Router02.WETH()];
      let _amountIn = await egToken.maxTransactionCoolDownAmount();
      _amountIn.add(ethers.utils.parseEther("10"));
      await egToken.connect(owner).transfer(addr1.address, _amountIn);

      const _beforeAddr1Balance = await egToken.balanceOf(addr1.address);
      const _beforeAddr1NativeBalance = await ethers.provider.getBalance(
        addr1.address
      );

      const _beforeContractBalance = await egToken.balanceOf(egToken.address);
      await egToken.connect(addr1).approve(BINANCE_ROUTER_ADDRESS, _amountIn);
      await uniswapV2Router02
        .connect(addr1)
        .swapExactTokensForETHSupportingFeeOnTransferTokens(
          _amountIn,
          0,
          path,
          addr1.address,
          _deadline
        );

      const _afterAddr1Balance = await egToken.balanceOf(addr1.address);
      const _afterAddr1NativeBalance = await ethers.provider.getBalance(
        addr1.address
      );
      const _deltaAddr1NativeBalance = _afterAddr1NativeBalance.sub(
        _beforeAddr1NativeBalance
      );
      expect(parseInt(_deltaAddr1NativeBalance)).to.be.greaterThan(0);

      expect(_beforeAddr1Balance.sub(_afterAddr1Balance)).to.equal(_amountIn);
      expect(_afterAddr1Balance).to.equal(BigInt(0));

      const _afterContractBalance = await egToken.balanceOf(egToken.address);
      const _sellFee = await egToken.sellFee();
      expect(_afterContractBalance.sub(_beforeContractBalance)).to.equal(
        _amountIn.mul(_sellFee).div(100)
      );
    });
  });
});
