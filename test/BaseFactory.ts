import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { WalletClient, PublicClient, Address } from "viem";

// Define test fixture return type
interface BaseFactoryFixture {
  baseFactory: any;
  owner: WalletClient;
  otherAccount: WalletClient;
  thirdAccount: WalletClient;
  publicClient: PublicClient;
}

describe("BaseFactory", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployBaseFactoryFixture(): Promise<BaseFactoryFixture> {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, thirdAccount] =
      await hre.viem.getWalletClients();

    const baseFactory = await hre.viem.deployContract("BaseFactory");

    const publicClient = await hre.viem.getPublicClient();

    return {
      baseFactory,
      owner,
      otherAccount,
      thirdAccount,
      publicClient,
    };
  }
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { baseFactory, owner } = await loadFixture(
        deployBaseFactoryFixture
      );

      if (!owner.account) {
        throw new Error("Owner account is undefined");
      }

      // Compare addresses case-insensitively
      const contractOwner = (await baseFactory.read.owner()).toLowerCase();
      const ownerAddress = owner.account.address.toLowerCase();
      expect(contractOwner).to.equal(ownerAddress);
    });
  });

  describe("Factory Registration", function () {
    const TEST_FACTORY_ADDRESS = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

    it("Should register a new factory", async function () {
      const { baseFactory } = await loadFixture(deployBaseFactoryFixture);

      await baseFactory.write.registerFactory([TEST_FACTORY_ADDRESS]);

      expect(await baseFactory.read.isFactory([TEST_FACTORY_ADDRESS])).to.equal(
        true
      );
    });

    it("Should not allow non-owner to register a factory", async function () {
      const { baseFactory, otherAccount } = await loadFixture(
        deployBaseFactoryFixture
      );

      await expect(
        baseFactory.write.registerFactory([TEST_FACTORY_ADDRESS], {
          account: otherAccount.account,
        })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("Should not allow registering zero address", async function () {
      const { baseFactory } = await loadFixture(deployBaseFactoryFixture);

      await expect(
        baseFactory.write.registerFactory([ZERO_ADDRESS])
      ).to.be.rejectedWith("ZeroAddressNotAllowed");
    });

    it("Should not allow registering the same factory twice", async function () {
      const { baseFactory } = await loadFixture(deployBaseFactoryFixture);

      await baseFactory.write.registerFactory([TEST_FACTORY_ADDRESS]);

      await expect(
        baseFactory.write.registerFactory([TEST_FACTORY_ADDRESS])
      ).to.be.rejectedWith("FactoryAlreadyRegistered");
    });

    it("Should emit FactoryRegistered event when registering a factory", async function () {
      const { baseFactory, publicClient } = await loadFixture(
        deployBaseFactoryFixture
      );

      const txHash = await baseFactory.write.registerFactory([
        TEST_FACTORY_ADDRESS,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Get and check logs
      const logs = await baseFactory.getEvents.FactoryRegistered();
      expect(logs.length).to.be.greaterThan(0);
      expect(logs[0].args.factory).to.equal(TEST_FACTORY_ADDRESS);
    });
  });
  describe("Factory Unregistration", function () {
    const TEST_FACTORY_ADDRESS = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
    let baseFactory: any,
      otherAccount: WalletClient,
      publicClient: PublicClient;

    beforeEach(async function () {
      // Set up test environment before each test
      const fixture = await loadFixture(deployBaseFactoryFixture);
      baseFactory = fixture.baseFactory;
      otherAccount = fixture.otherAccount;
      publicClient = fixture.publicClient;

      // Register factory for tests that need it
      await baseFactory.write.registerFactory([TEST_FACTORY_ADDRESS]);
    });

    it("Should unregister an existing factory", async function () {
      // Verify factory is registered
      expect(await baseFactory.read.isFactory([TEST_FACTORY_ADDRESS])).to.equal(
        true
      );

      // Unregister and verify
      await baseFactory.write.unregisterFactory([TEST_FACTORY_ADDRESS]);
      expect(await baseFactory.read.isFactory([TEST_FACTORY_ADDRESS])).to.equal(
        false
      );
    });

    it("Should not allow non-owner to unregister a factory", async function () {
      await expect(
        baseFactory.write.unregisterFactory([TEST_FACTORY_ADDRESS], {
          account: otherAccount.account,
        })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("Should not allow unregistering a non-registered factory", async function () {
      const NON_REGISTERED_ADDRESS =
        "0x1234567890123456789012345678901234567890";

      await expect(
        baseFactory.write.unregisterFactory([NON_REGISTERED_ADDRESS])
      ).to.be.rejectedWith("FactoryNotRegistered");
    });

    it("Should emit FactoryUnregistered event when unregistering a factory", async function () {
      const txHash = await baseFactory.write.unregisterFactory([
        TEST_FACTORY_ADDRESS,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Get and check logs
      const logs = await baseFactory.getEvents.FactoryUnregistered();
      expect(logs.length).to.be.greaterThan(0);
      expect(logs[0].args.factory).to.equal(TEST_FACTORY_ADDRESS);
    });
  });

  describe("Factory Verification", function () {
    const TEST_FACTORY_ADDRESS = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
    const OTHER_ADDRESS = "0x1234567890123456789012345678901234567890";

    it("Should correctly verify if an address is a factory", async function () {
      const { baseFactory } = await loadFixture(deployBaseFactoryFixture);

      // Initially not a factory
      expect(await baseFactory.read.isFactory([TEST_FACTORY_ADDRESS])).to.equal(
        false
      );

      // Register as factory
      await baseFactory.write.registerFactory([TEST_FACTORY_ADDRESS]);
      expect(await baseFactory.read.isFactory([TEST_FACTORY_ADDRESS])).to.equal(
        true
      );

      // Other address not registered
      expect(await baseFactory.read.isFactory([OTHER_ADDRESS])).to.equal(false);
    });
  });
  describe("Ownership", function () {
    const TEST_FACTORY_ADDRESS = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
    let baseFactory: any,
      owner: WalletClient,
      otherAccount: WalletClient,
      thirdAccount: WalletClient,
      publicClient: PublicClient;

    beforeEach(async function () {
      // Set up test environment before each test
      const fixture = await loadFixture(deployBaseFactoryFixture);
      baseFactory = fixture.baseFactory;
      owner = fixture.owner;
      otherAccount = fixture.otherAccount;
      thirdAccount = fixture.thirdAccount;
      publicClient = fixture.publicClient;

      // Register a factory for ownership tests that need it
      await baseFactory.write.registerFactory([TEST_FACTORY_ADDRESS]);
    });
    it("Should transfer ownership correctly", async function () {
      if (!owner.account || !otherAccount.account) {
        throw new Error("Account is undefined");
      }

      const txHash = await baseFactory.write.transferOwnership([
        otherAccount.account.address,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Compare addresses case-insensitively
      const contractOwner = (await baseFactory.read.owner()).toLowerCase();
      const newOwnerAddress = otherAccount.account.address.toLowerCase();
      expect(contractOwner).to.equal(newOwnerAddress);
    });

    it("Should emit OwnershipTransferred event when transferring ownership", async function () {
      if (!owner.account || !otherAccount.account) {
        throw new Error("Account is undefined");
      }

      const txHash = await baseFactory.write.transferOwnership([
        otherAccount.account.address,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Check event
      const logs = await baseFactory.getEvents.OwnershipTransferred();
      expect(logs.length).to.be.greaterThan(0);
      expect(logs[0].args.previousOwner.toLowerCase()).to.equal(
        owner.account.address.toLowerCase()
      );
      expect(logs[0].args.newOwner.toLowerCase()).to.equal(
        otherAccount.account.address.toLowerCase()
      );
    });

    it("Should not allow non-owner to transfer ownership", async function () {
      if (!thirdAccount.account) {
        throw new Error("Account is undefined");
      }

      await expect(
        baseFactory.write.transferOwnership([thirdAccount.account.address], {
          account: otherAccount.account,
        })
      ).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });
  });
});
