/* eslint-env browser */
"use strict";

var $ = require("jquery");
const ethers = require("ethers");
const ArbProvider = require("arb-provider-ethers").ArbProvider;
const ArbERC20Factory = require("arb-provider-ethers/dist/lib/abi/ArbERC20Factory")
  .ArbERC20Factory;
const ArbERC721Factory = require("arb-provider-ethers/dist/lib/abi/ArbERC721Factory")
  .ArbERC721Factory;
const ArbSysFactory = require("arb-provider-ethers/dist/lib/abi/ArbSysFactory")
  .ArbSysFactory;

require("bootstrap/dist/css/bootstrap.min.css");
require("bootstrap/js/dist/tab.js");
require("bootstrap/js/dist/alert.js");
require("bootstrap/js/dist/util.js");

const erc20ABI = require("./ERC20.json");
const erc721ABI = require("./ERC721.json");

const delay = ms => new Promise(res => setTimeout(res, ms));

class App {
  constructor() {
    this.ethProvider = null;
    this.arbProvider = null;
    this.arbWallet = null;
    this.contracts = {};
    this.ethAddress = "0x0000000000000000000000000000000000000000";
    this.gld_units = null;
    return this.initWeb3();
  }

  async initWeb3() {
    // Modern dapp browsers...
    var standardProvider = null;
    if (window.ethereum) {
      standardProvider = window.ethereum;
      try {
        // Request account access if needed
        await window.ethereum.enable();
      } catch (error) {
        console.log("User denied account access");
      }
    } else if (window.web3) {
      // Legacy dapp browsers...
      standardProvider = window.web3.currentProvider;
    } else {
      // Non-dapp browsers...
      console.log(
        "Non-Ethereum browser detected. You should consider trying MetaMask!"
      );
    }

    this.ethProvider = new ethers.providers.Web3Provider(standardProvider);
    this.arbProvider = new ArbProvider(
      "http://localhost:1235",
      new ethers.providers.Web3Provider(standardProvider)
    );
    this.ethWallet = this.ethProvider.getSigner(0);
    this.arbWallet = this.arbProvider.getSigner(0);

    this.walletAddress = await this.ethWallet.getAddress();
    return this.initContracts();
  }

  async initContracts() {
    this.validERC20Selected = false;
    this.validERC721Selected = false;

    this.listenForEvents();
    this.setupHooks();
    return this.render();
  }

  async setupERC20(erc20Address) {
    let ethTestTokenContractRaw = new ethers.Contract(
      erc20Address,
      erc20ABI,
      this.ethProvider
    );

    let arbTestTokenContractRaw = ArbERC20Factory.connect(
      erc20Address,
      this.arbProvider
    );

    this.contracts.ArbTestToken = arbTestTokenContractRaw.connect(
      this.arbWallet
    );
    this.contracts.EthTestToken = ethTestTokenContractRaw.connect(
      this.ethWallet
    );

    this.gld_units = await this.contracts.EthTestToken.decimals();
  }

  async setupERC721(erc721Address) {
    let ethTestItemContractRaw = new ethers.Contract(
      erc721Address,
      erc721ABI,
      this.ethProvider
    );

    let arbTestItemContractRaw = ArbERC721Factory.connect(
      erc721Address,
      this.arbProvider
    );

    this.contracts.ArbTestItem = arbTestItemContractRaw.connect(this.arbWallet);
    this.contracts.EthTestItem = ethTestItemContractRaw.connect(this.ethWallet);
  }

  setupHooks() {
    // ETH
    $("#depositETHForm").submit(event => {
      this.depositEth();
      event.preventDefault();
    });
    $("#withdrawETHForm").submit(event => {
      this.withdrawETH();
      event.preventDefault();
    });
    $("#withdrawLockboxETHForm").submit(event => {
      this.withdrawLockboxETH();
      event.preventDefault();
    });

    $("#erc20Address").on("change keyup paste", event => {
      this.changedERC20();
    })

    // ERC20
    $("#approveERC20Form").submit(event => {
      this.approveERC20();
      event.preventDefault();
    });
    $("#depositERC20Form").submit(event => {
      this.depositERC20();
      event.preventDefault();
    });
    $("#withdrawERC20Form").submit(event => {
      this.withdrawERC20();
      event.preventDefault();
    });
    $("#withdrawLockboxERC20Form").submit(event => {
      this.withdrawLockboxERC20();
      event.preventDefault();
    });

    $("#erc721Address").on("change keyup paste", event => {
      this.changedERC721();
    })

    // ERC721
    $("#approveERC721Form").submit(event => {
      this.approveERC721();
      event.preventDefault();
    });
    $("#depositERC721Form").submit(event => {
      this.depositERC721();
      event.preventDefault();
    });
    $("#withdrawERC721Form").submit(event => {
      this.withdrawERC721();
      event.preventDefault();
    });
    $("#withdrawLockboxERC721Form").submit(event => {
      this.withdrawLockboxERC721();
      event.preventDefault();
    });
  }

  async changedERC20() {
    let address = $("#erc20Address").val();
    try {
      let code = await this.ethProvider.getCode(address);
      if (code.length > 2) {
         await this.setupERC20(address);
         this.validERC20Selected = true;
      } else {
        this.validERC20Selected = false;
      }
    } catch(e) {
      this.validERC20Selected = false;
    }
    this.render();
  }

  async changedERC721() {
    let address = $("#erc721Address").val();
    try {
      let code = await this.ethProvider.getCode(address);
      if (code.length > 2) {
        console.log("erc721Address", address);
         await this.setupERC721(address);
         this.validERC721Selected = true;
      } else {
        this.validERC721Selected = false;
      }
    } catch(e) {
      this.validERC721Selected = false;
    }
    this.render();
  }

  // Listen for events emitted from the contract
  async listenForEvents() {
    const arbRollup = await this.arbProvider.arbRollupConn();
    arbRollup.on("ConfirmedAssertion", () => {
      this.render();
    });

    var accountInterval = setInterval(async () => {
      let address = await this.arbWallet.getAddress();

      if (address != this.account) {
        this.account = address;
        this.render();
      }
    }, 200);
  }

  async render() {
    var content = $("#content");
    if (this.walletAddress) {
      $("#accountAddress").html(this.walletAddress);
      try {
        await this.renderETHInfo();
      } catch (e) {
        console.log("Error rendering eth", e);
      }

      try {
        await this.renderERC20Info();
      } catch (e) {
        console.log("Error rendering erc-20", e);
      }

      try {
        await this.renderERC721Info();
      } catch (e) {
        console.log("Error rendering erc-721", e);
      }
    } else {
      $("#accountAddress").html("Loading");
    }

    content.show();
  }

  async renderETHInfo() {
    const vmId = await this.arbProvider.getVmID();
    const inboxManager = await this.arbProvider.globalInboxConn();

    const eth = await this.ethWallet.getBalance();
    $("#ethereumBalance").html(ethers.utils.formatEther(eth));

    const vmBalance = await inboxManager.getEthBalance(vmId);
    $("#vmEthBalance").html(ethers.utils.formatEther(vmBalance));

    const userWithdrawnBalance = await inboxManager.getEthBalance(
      this.walletAddress
    );
    $("#withdrawnEthBalance").html(
      ethers.utils.formatEther(userWithdrawnBalance)
    );

    const arbEth = await this.arbProvider.getBalance(this.walletAddress);
    $("#arbEthBalance").html(ethers.utils.formatEther(arbEth));
  }

  async renderERC20Info() {
    if (!this.validERC20Selected) {
      $("#approveERC20Submit").prop('disabled', true);
      $("#depositERC20Submit").prop('disabled', true);
      $("#withdrawERC20Submit").prop('disabled', true);
      $("#withdrawLockboxERC20Submit").prop('disabled', true);
      $("#ethERC20Balance").html("0");
      $("#vmERC20Balance").html("0");
      $("#withdrawnERC20Balance").html("0");
      $("#arbERC20Balance").html("0");
    } else {
      const vmId = await this.arbProvider.getVmID();
      const inboxManager = await this.arbProvider.globalInboxConn();

      const ethBalance = await this.contracts.EthTestToken.balanceOf(
        this.walletAddress
      );
      $("#ethERC20Balance").html(
        ethers.utils.formatUnits(ethBalance, this.gld_units)
      );

      const vmBalance = await inboxManager.getERC20Balance(
        this.contracts.EthTestToken.address,
        vmId
      );
      $("#vmERC20Balance").html(
        ethers.utils.formatUnits(vmBalance, this.gld_units)
      );

      const withdrawnBalance = await inboxManager.getERC20Balance(
        this.contracts.EthTestToken.address,
        this.walletAddress
      );
      $("#withdrawnERC20Balance").html(
        ethers.utils.formatUnits(withdrawnBalance, this.gld_units)
      );

      let allowance = await this.contracts.EthTestToken.allowance(this.walletAddress, inboxManager.address);
      let hasAllowance = allowance.gt(ethers.utils.bigNumberify(0));

      if (hasAllowance) {
        $("#approveERC20Submit").prop('disabled', true);
      } else {
        $("#approveERC20Submit").prop('disabled', false);
      }

      if (hasAllowance && ethBalance.gt(ethers.utils.bigNumberify(0))) {
        $("#depositERC20Submit").prop('disabled', false);
      } else {
        $("#depositERC20Submit").prop('disabled', true);
      }

      if (withdrawnBalance.gt(ethers.utils.bigNumberify(0))) {
        $("#withdrawLockboxERC20Submit").prop('disabled', false);
      } else {
        $("#withdrawLockboxERC20Submit").prop('disabled', true);
      }

      const arbBalance = await this.contracts.ArbTestToken.balanceOf(
        this.walletAddress
      );
      $("#arbERC20Balance").html(
        ethers.utils.formatUnits(arbBalance, this.gld_units)
      );

      if (arbBalance.gt(ethers.utils.bigNumberify(0))) {
        $("#withdrawERC20Submit").prop('disabled', false);
      } else {
        $("#withdrawERC20Submit").prop('disabled', true);
      }
    }
  }

  async renderERC721Info() {
    console.log("renderERC721Info", this.validERC721Selected);
    if (!this.validERC721Selected) {
      $("#approveERC721Submit").prop('disabled', true);
      $("#depositERC721Submit").prop('disabled', true);
      $("#withdrawERC721Submit").prop('disabled', true);
      $("#withdrawLockboxERC721Submit").prop('disabled', true);

      $("#ethERC721Balance").html("[]");
      $("#ethERC721Balance").html("[]");
      $("#vmERC721Balance").html("[]");
      $("#withdrawnERC721Balance").html("[]");

    } else {
      const vmId = await this.arbProvider.getVmID();
      const inboxManager = await this.arbProvider.globalInboxConn();

      try {
        const ethBalance = await this.contracts.EthTestItem.tokensOfOwner(
          this.walletAddress
        );
        $("#ethERC721Balance").html("[" + ethBalance.join(", ") + "]");
      } catch {
        const ethBalance = await this.contracts.EthTestItem.balanceOf(
          this.walletAddress
        );
        $("#ethERC721Balance").html(ethBalance.toString());
      }
      
      var vmBalance = await inboxManager.getERC721Tokens(
        this.contracts.EthTestItem.address,
        vmId
      );
      $("#vmERC721Balance").html("[" + vmBalance.join(", ") + "]");

      var withdrawnBalance = await inboxManager.getERC721Tokens(
        this.contracts.EthTestItem.address,
        this.walletAddress
      );
      $("#withdrawnERC721Balance").html("[" + withdrawnBalance.join(", ") + "]");

      let allowed = await this.contracts.EthTestItem.isApprovedForAll(this.walletAddress, inboxManager.address);

      if (allowed) {
        $("#approveERC721Submit").prop('disabled', true);
        $("#depositERC721Submit").prop('disabled', false);
      } else {
        $("#approveERC721Submit").prop('disabled', false);
        $("#depositERC721Submit").prop('disabled', true);
      }

      $("#withdrawLockboxERC721Submit").prop('disabled', false);
      $("#withdrawERC721Submit").prop('disabled', false);

      const arbBalance = await this.contracts.ArbTestItem.tokensOfOwner(
        this.walletAddress
      );
      $("#arbERC721Balance").html("[" + arbBalance.join(", ") + "]");

      
    }
  }

  alertError(element, alert_class, message) {
    $(element).removeClass("alert-primary alert-danger alert-success");
    $(element).addClass(alert_class);
    $(element + "-message").html(message);
    $(element).show();
  }

  alertEthSuccess(message) {
    this.alertError("#ETH-alert", "alert-success", message);
  }

  alertERC20Success(message) {
    this.alertError("#ERC20-alert", "alert-success", message);
  }

  alertERC721Success(message) {
    this.alertError("#ERC721-alert", "alert-success", message);
  }

  clearAlerts() {
    $("#ETH-alert").hide();
    $("#ERC20-alert").hide();
    $("#ERC721-alert").hide();
  }

  handleFailureCommon(kind, e) {
    let message;
    if (Object.prototype.hasOwnProperty.call(e, "reason")) {
      message = e.reason;
    } else if (
      Object.prototype.hasOwnProperty.call(e, "data") &&
      Object.prototype.hasOwnProperty.call(e, "message")
    ) {
      message = e.data.message;
    } else if (Object.prototype.hasOwnProperty.call(e, "message")) {
      message = e.message;
    } else {
      message = e.data;
    }

    $("#deposit" + kind + "Message").hide();
    $("#deposit" + kind + "Form").show();
    $("#withdraw" + kind + "Message").hide();
    $("#withdraw" + kind + "Form").show();
    $("#withdrawLockbox" + kind + "Message").hide();
    $("#withdrawLockbox" + kind + "Form").show();
    this.alertError(
      "#" + kind + "-alert",
      "alert-danger",
      "Failed making transaction: " + message
    );
    this.render();
  }

  handleEthFailure(e) {
    this.handleFailureCommon("ETH", e);
  }

  handleERC20Failure(e) {
    $("#approveERC20Message").hide();
    $("#approveERC20Form").show();
    this.handleFailureCommon("ERC20", e);
  }

  handleERC721Failure(e) {
    $("#approveERC721Message").hide();
    $("#approveERC721Form").show();
    this.handleFailureCommon("ERC721", e);
  }

  async depositEth() {
    this.clearAlerts();
    let value = ethers.utils.parseEther($("#ethDepositValue").val());
    $("#ethDepositValue").val("");
    $("#depositETHForm").hide();
    $("#depositETHMessage").html("Creating deposit transaction");
    $("#depositETHMessage").show();
    let tx;
    try {
      tx = await this.arbWallet.depositETH(this.walletAddress, value);
    } catch (e) {
      return this.handleEthFailure(e);
    }
    $("#depositETHMessage").html("Depositing into Arbitrum chain");

    await tx.wait();
    $("#depositETHMessage").hide();
    $("#depositETHForm").show();
    this.alertEthSuccess(
      "Successfully deposited " + ethers.utils.formatEther(value) + " ETH"
    );
    this.render();
  }

  async withdrawETH() {
    this.clearAlerts();
    const value = ethers.utils.parseEther($("#withdrawEthAmount").val());
    $("#withdrawEthAmount").val("");
    $("#withdrawETHForm").hide();
    $("#withdrawETHMessage").html("Creating withdrawal transaction");
    $("#withdrawETHMessage").show();
    let tx;
    try {
      tx = await this.arbWallet.withdrawEthFromChain(value);
    } catch (e) {
      return this.handleEthFailure(e);
    }
    $("#withdrawETHForm").hide();
    $("#withdrawETHMessage").html("Withdrawing from EthBridge");
    $("#withdrawETHMessage").show();

    try {
      await tx.wait();
    } catch (e) {
      return this.handleEthFailure(e);
    }
    $("#withdrawETHMessage").hide();
    $("#withdrawETHForm").show();
    this.alertEthSuccess(
      "Successfully withdrew " + ethers.utils.formatEther(value) + " ETH"
    );
    this.render();
  }

  async withdrawLockboxETH() {
    this.clearAlerts();
    $("#withdrawLockboxETHForm").hide();
    $("#withdrawLockboxETHMessage").html("Withdrawing from lockbox");
    $("#withdrawLockboxETHMessage").show();
    const inboxManager = await this.arbWallet.globalInboxConn();
    let tx;
    try {
      tx = await inboxManager.withdrawEth();
    } catch (e) {
      return this.handleEthFailure(e);
    }
    await tx.wait();
    $("#withdrawLockboxETHMessage").hide();
    $("#withdrawLockboxETHForm").show();
    this.alertEthSuccess("Successfully withdrew funds from lockbox");
    this.render();
  }

  async approveERC20() {
    this.clearAlerts();
    const inboxManager = await this.arbProvider.globalInboxConn();
    $("#approveERC20Form").hide();
    $("#approveERC20Message").html("Creating approve transfer transaction");
    $("#approveERC20Message").show();
    let tx;
    try {
      tx = await this.contracts.EthTestToken.approve(
        inboxManager.address,
        ethers.constants.MaxUint256
      );
    } catch (e) {
      return this.handleERC20Failure(e);
    }

    $("#approveERC20Message").html("Approving transfer to Arbitrum chain");
    await tx.wait();

    $("#approveERC20Message").hide();
    $("#approveERC20Form").show();
    this.alertERC20Success(
      "Successfully approved ERC-20 token transfers "
    );
    this.render();
  }

  async depositERC20() {
    this.clearAlerts();
    const inboxManager = await this.arbProvider.globalInboxConn();
    let val = ethers.utils.parseUnits(
      $("#depositERC20Amount").val(),
      this.gld_units
    );
    $("#depositERC20Amount").val("");
    $("#depositERC20Form").hide();
    $("#depositERC20Message").html("Creating deposit transaction");
    $("#depositERC20Message").show();

    let tx;
    try {
      tx = await this.arbWallet.depositERC20(
        this.walletAddress,
        this.contracts.EthTestToken.address,
        val
      );
    } catch (e) {
      return this.handleERC20Failure(e);
    }
    $("#depositERC20Message").html("Depositing tokens in Arbitrum chain");

    await tx.wait(0);

    $("#depositERC20Message").hide();
    $("#depositERC20Form").show();
    this.alertERC20Success(
      "Successfully deposited " +
        ethers.utils.formatUnits(val, this.gld_units) +
        " tokens"
    );
    this.render();
  }

  async withdrawERC20() {
    this.clearAlerts();
    let val = ethers.utils.parseUnits(
      $("#withdrawERC20Amount").val(),
      this.gld_units
    );
    $("#withdrawERC20Amount").val("");
    $("#withdrawERC20Form").hide();
    $("#withdrawERC20Message").html("Creating withdraw transaction");
    $("#withdrawERC20Message").show();
    let tx;
    try {
      tx = await this.contracts.ArbTestToken.withdraw(
        this.walletAddress,
        val
      );
    } catch (e) {
      return this.handleERC20Failure(e);
    }
    $("#withdrawERC20Message").html("Withdrawing from EthBridge");
    try {
      await tx.wait();
    } catch (e) {
      return this.handleERC20Failure(e);
    }

    $("#withdrawERC20Message").hide();
    $("#withdrawERC20Form").show();
    this.alertERC20Success(
      "Successfully withdrew " +
        ethers.utils.formatUnits(val, this.gld_units) +
        " tokens"
    );
    this.render();
  }

  async withdrawLockboxERC20() {
    this.clearAlerts();
    const inboxManager = await this.arbWallet.globalInboxConn();
    $("#withdrawLockboxERC20Form").hide();
    $("#withdrawLockboxERC20Message").html("Approving withdrawal from lockbox");
    $("#withdrawLockboxERC20Message").show();
    let tx;
    try {
      tx = await inboxManager.withdrawERC20(
        this.contracts.EthTestToken.address
      );
    } catch (e) {
      return this.handleERC20Failure(e);
    }
    $("#withdrawLockboxERC20Message").html("Withdrawing from lockbox");
    await tx.wait();
    $("#withdrawLockboxERC20Message").hide();
    $("#withdrawLockboxERC20Form").show();
    this.alertERC20Success("Successfully withdrew from lockbox");
    this.render();
  }

  async approveERC721() {
    this.clearAlerts();
    const inboxManager = await this.arbProvider.globalInboxConn();
    $("#approveERC721Form").hide();
    $("#approveERC721Message").html("Creating approve transaction");
    $("#approveERC721Message").show();
    let tx;
    try {
      tx = await this.contracts.EthTestItem.setApprovalForAll(
        inboxManager.address,
        true
      );
    } catch (e) {
      return this.handleERC721Failure(e);
    }

    $("#approveERC721Message").html("Approving transfer to Arbitrum chain");
    await tx.wait();

    $("#approveERC721Message").hide();
    $("#approveERC721Form").show();
    this.alertERC721Success("Approved token transfers");
    this.render();
  }

  async depositERC721() {
    this.clearAlerts();
    let tokenId = parseInt($("#depositERC721TokenId").val());
    const inboxManager = await this.arbProvider.globalInboxConn();
    $("#depositERC721TokenId").val("");
    $("#depositERC721Form").hide();
    $("#depositERC721Message").html("Creating deposit transaction");
    $("#depositERC721Message").show();

    let tx;
    try {
      tx = await this.arbWallet.depositERC721(
        this.walletAddress,
        this.contracts.EthTestItem.address,
        tokenId
      );
    } catch (e) {
      return this.handleERC721Failure(e);
    }

    $("#depositERC721Message").html("Depositing token to Arbitrum chain");
    await tx.wait(0);

    $("#depositERC721Message").hide();
    $("#depositERC721Form").show();
    this.alertERC721Success("Deposited token " + tokenId);
    this.render();
  }

  async withdrawERC721() {
    this.clearAlerts();
    let tokenId = parseInt($("#withdrawERC721TokenId").val());
    $("#withdrawERC721TokenId").val("");
    $("#withdrawERC721Form").hide();
    $("#withdrawERC721Message").html("Creating withdraw transaction");
    $("#withdrawERC721Message").show();
    let tx;
    try {
      tx = await this.contracts.ArbTestItem.withdraw(
        this.walletAddress,
        tokenId
      );
    } catch (e) {
      return this.handleERC721Failure(e);
    }

    $("#withdrawERC721Message").html("Withdrawing from EthBridge");
    try {
      await tx.wait();
    } catch (e) {
      return this.handleERC721Failure(e);
    }
    $("#withdrawERC721Message").hide();
    $("#withdrawERC721Form").show();
    this.alertERC721Success("Withdrew token " + tokenId);
    this.render();
  }

  async withdrawLockboxERC721() {
    this.clearAlerts();
    const inboxManager = await this.arbWallet.globalInboxConn();
    let tokenId = parseInt($("#withdrawLockboxERC721TokenId").val());
    $("#withdrawLockboxERC721Form").hide();
    $("#withdrawLockboxERC721Message").html("Creating withdraw transaction");
    $("#withdrawLockboxERC721Message").show();

    let tx;
    try {
      tx = await inboxManager.withdrawERC721(
        this.contracts.EthTestItem.address,
        tokenId
      );
    } catch (e) {
      return this.handleERC721Failure(e);
    }

    $("#withdrawLockboxERC721Message").html("Withdrawing from lockbox");
    await tx.wait();
    $("#withdrawLockboxERC721Message").hide();
    $("#withdrawLockboxERC721Form").show();
    this.alertERC721Success(
      "Successfully withdrew token " + tokenId + " from lockbox"
    );
    this.render();
  }
}

$(function() {
  $(window).on("load", () => {
    new App();
  });
});
