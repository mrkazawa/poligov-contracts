import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { WalletClient, PublicClient, Address } from "viem";

// Define test fixture return type
interface GovernmentFixture {
  government: any;
  owner: WalletClient;
  otherAccount: WalletClient;
  thirdAccount: WalletClient;
  publicClient: PublicClient;
}

describe("Government", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployGovernmentFixture(): Promise<GovernmentFixture> {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, thirdAccount] =
      await hre.viem.getWalletClients();

    // Deploy ConcreteGovernment with owner as the government owner
    const government = await hre.viem.deployContract("ConcreteGovernment", [
      owner.account?.address,
    ]);

    const publicClient = await hre.viem.getPublicClient();

    return {
      government,
      owner,
      otherAccount,
      thirdAccount,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { government, owner } = await loadFixture(deployGovernmentFixture);

      if (!owner.account) {
        throw new Error("Owner account is undefined");
      }

      // Compare addresses case-insensitively
      const contractOwner = (await government.read.owner()).toLowerCase();
      const ownerAddress = owner.account.address.toLowerCase();
      expect(contractOwner).to.equal(ownerAddress);
    });
  });

  describe("Ownership", function () {
    it("Should allow the owner to transfer ownership", async function () {
      const { government, owner, otherAccount } = await loadFixture(
        deployGovernmentFixture
      );

      if (!owner.account || !otherAccount.account) {
        throw new Error("Accounts are undefined");
      }

      // Transfer ownership to other account
      await government.write.transferOwnership([otherAccount.account.address], {
        account: owner.account,
      });

      // Verify the new owner
      const newOwner = (await government.read.owner()).toLowerCase();
      const otherAddress = otherAccount.account.address.toLowerCase();
      expect(newOwner).to.equal(otherAddress);
    });

    it("Should emit OwnershipTransferred event when transferring ownership", async function () {
      const { government, owner, otherAccount, publicClient } =
        await loadFixture(deployGovernmentFixture);

      if (!owner.account || !otherAccount.account) {
        throw new Error("Accounts are undefined");
      }

      // Watch for the event
      const hash = await government.write.transferOwnership(
        [otherAccount.account.address],
        { account: owner.account }
      );

      // Get transaction receipt to check events
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Verify event was emitted with correct parameters
      const log = receipt.logs.find(
        (log) => log.address === government.address
      );
      expect(log).to.not.be.undefined;
    });

    it("Should prevent non-owners from transferring ownership", async function () {
      const { government, otherAccount, thirdAccount } = await loadFixture(
        deployGovernmentFixture
      );

      if (!otherAccount.account || !thirdAccount.account) {
        throw new Error("Accounts are undefined");
      }

      // Attempt to transfer ownership from a non-owner account (should fail)
      await expect(
        government.write.transferOwnership([thirdAccount.account.address], {
          account: otherAccount.account,
        })
      ).to.be.rejectedWith(/OwnableUnauthorizedAccount/); 
    });
  });
});
