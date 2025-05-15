import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { WalletClient, PublicClient, Address } from "viem";

// Define test fixture return type
interface GovernmentFactoryFixture {
  baseFactory: any;
  governmentFactory: any;
  owner: WalletClient;
  otherAccount: WalletClient;
  thirdAccount: WalletClient;
  publicClient: PublicClient;
}

describe("GovernmentFactory", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployGovernmentFactoryFixture(): Promise<GovernmentFactoryFixture> {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, thirdAccount] =
      await hre.viem.getWalletClients();

    // Deploy BaseFactory (deploy BaseFactory first as it's required for GovernmentFactory)
    const baseFactory = await hre.viem.deployContract("BaseFactory");

    // Deploy GovernmentFactory with BaseFactory address
    const governmentFactory = await hre.viem.deployContract(
      "GovernmentFactory",
      [baseFactory.address]
    );

    // Register GovernmentFactory in BaseFactory
    await baseFactory.write.registerFactory([governmentFactory.address]);

    const publicClient = await hre.viem.getPublicClient();

    return {
      baseFactory,
      governmentFactory,
      owner,
      otherAccount,
      thirdAccount,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("Should not allow deploying with zero address for BaseFactory", async function () {
      const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

      // Attempt to deploy with zero address (should fail)
      await expect(
        hre.viem.deployContract("GovernmentFactory", [ZERO_ADDRESS])
      ).to.be.rejectedWith(/ZeroAddressNotAllowed/);
    });

    it("Should initialize with the correct BaseFactory address", async function () {
      const [owner] = await hre.viem.getWalletClients();

      // Deploy BaseFactory
      const baseFactory = await hre.viem.deployContract("BaseFactory");

      // Deploy GovernmentFactory with BaseFactory address
      const governmentFactory = await hre.viem.deployContract(
        "GovernmentFactory",
        [baseFactory.address]
      );

      // We can't directly check BaseFactory reference since it's private
      // Instead, we'll validate by creating a government and checking authorization
      await baseFactory.write.registerFactory([governmentFactory.address]);

      if (!owner.account) {
        throw new Error("Owner account is undefined");
      }

      // Should not throw error if BaseFactory is set correctly
      await governmentFactory.write.createGovernment([owner.account.address], {
        account: owner.account,
      });
    });
  });

  describe("Government Creation", function () {
    it("Should allow the BaseFactory owner to create a government", async function () {
      const { baseFactory, governmentFactory, owner, otherAccount } =
        await loadFixture(deployGovernmentFactoryFixture);

      if (!owner.account || !otherAccount.account) {
        throw new Error("Accounts are undefined");
      }

      // Create a government with the otherAccount as the government owner
      const tx = await governmentFactory.write.createGovernment(
        [otherAccount.account.address],
        { account: owner.account }
      );

      // Check if transaction was successful
      expect(tx).to.be.a("string");
    });

    it("Should emit GovernmentCreated event when creating a government", async function () {
      const { governmentFactory, owner, otherAccount, publicClient } =
        await loadFixture(deployGovernmentFactoryFixture);

      if (!owner.account || !otherAccount.account) {
        throw new Error("Accounts are undefined");
      }

      // Create a government and get the transaction hash
      const hash = await governmentFactory.write.createGovernment(
        [otherAccount.account.address],
        { account: owner.account }
      );

      // Get transaction receipt to check events
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Verify event was emitted with correct parameters
      const log = receipt.logs.find(
        (log) => log.address === governmentFactory.address
      );
      expect(log).to.not.be.undefined;
    });

    it("Should track created governments correctly", async function () {
      const { governmentFactory, owner, otherAccount } = await loadFixture(
        deployGovernmentFactoryFixture
      );

      if (!owner.account || !otherAccount.account) {
        throw new Error("Accounts are undefined");
      }

      // Create a government
      const tx = await governmentFactory.write.createGovernment(
        [otherAccount.account.address],
        { account: owner.account }
      );

      // Get transaction receipt
      const publicClient = await hre.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      });

      // Find the event in logs
      const governmentCreatedLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() ===
            governmentFactory.address.toLowerCase() && log.topics.length > 0
      );

      if (!governmentCreatedLog || !governmentCreatedLog.topics[1]) {
        throw new Error("GovernmentCreated event not found");
      }

      // Get deployed government address from event log (decode the address from the log topic)
      // Using Viem's decoding here would be cleaner but for simplicity decoding manually
      const governmentAddress = `0x${governmentCreatedLog.topics[1].slice(
        -40
      )}`;

      // Check if the government is tracked by the factory
      const isGovernment = await governmentFactory.read.isGovernment([
        governmentAddress,
      ]);
      expect(isGovernment).to.be.true;
    });

    it("Should not allow non-BaseFactory-owners to create governments", async function () {
      const { governmentFactory, otherAccount } = await loadFixture(
        deployGovernmentFactoryFixture
      );

      if (!otherAccount.account) {
        throw new Error("Other account is undefined");
      }

      // Attempt to create a government from non-owner account (should fail)
      await expect(
        governmentFactory.write.createGovernment(
          [otherAccount.account.address],
          { account: otherAccount.account }
        )
      ).to.be.rejectedWith(/NotAuthorized/);
    });

    it("Should not allow creating government with zero address as owner", async function () {
      const { governmentFactory, owner } = await loadFixture(
        deployGovernmentFactoryFixture
      );

      if (!owner.account) {
        throw new Error("Owner account is undefined");
      }

      const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

      // Attempt to create government with zero address (should fail)
      await expect(
        governmentFactory.write.createGovernment([ZERO_ADDRESS], {
          account: owner.account,
        })
      ).to.be.rejectedWith(/ZeroAddressNotAllowed/);
    });
  });

  describe("Government Validation", function () {
    it("Should correctly identify governments created by the factory", async function () {
      const { governmentFactory, owner, otherAccount } = await loadFixture(
        deployGovernmentFactoryFixture
      );

      if (!owner.account || !otherAccount.account) {
        throw new Error("Accounts are undefined");
      }

      // Create a government
      const tx = await governmentFactory.write.createGovernment(
        [otherAccount.account.address],
        { account: owner.account }
      );

      // Get transaction receipt
      const publicClient = await hre.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      });

      // Find the event in logs
      const governmentCreatedLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() ===
            governmentFactory.address.toLowerCase() && log.topics.length > 0
      );

      if (!governmentCreatedLog || !governmentCreatedLog.topics[1]) {
        throw new Error("GovernmentCreated event not found");
      }

      // Get deployed government address from event log
      const governmentAddress = `0x${governmentCreatedLog.topics[1].slice(
        -40
      )}`;

      // Create a random address that was not created by the factory
      const randomAddress = otherAccount.account.address;

      // Check both addresses
      const isActualGovernment = await governmentFactory.read.isGovernment([
        governmentAddress,
      ]);
      const isRandomGovernment = await governmentFactory.read.isGovernment([
        randomAddress,
      ]);

      expect(isActualGovernment).to.be.true;
      expect(isRandomGovernment).to.be.false;
    });
  });
});
