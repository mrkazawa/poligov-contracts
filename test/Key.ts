import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import {
  getAddress,
  keccak256,
  encodePacked,
  WalletClient,
  Address,
  PublicClient,
} from "viem";

// Define test fixture return type
interface KeyFixture {
  key: any;
  owner: WalletClient;
  otherAccount: WalletClient;
  publicClient: PublicClient;
}

// Define replacement keys test context
interface ReplacementKeysContext {
  key: any;
  owner: WalletClient;
  oldKeyClient: WalletClient;
  oldKeyAddress: Address;
  publicClient: PublicClient;
}

describe("Key", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployKeyFixture(): Promise<KeyFixture> {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.viem.getWalletClients();

    const key = await hre.viem.deployContract("Key");

    const publicClient = await hre.viem.getPublicClient();

    return {
      key,
      owner,
      otherAccount,
      publicClient,
    };
  }
  describe("Adding Keys", function () {
    // Constants
    const TEST_KEY_ADDRESS = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const SECOND_KEY_ADDRESS = "0x1234567890123456789012345678901234567890";

    it("Should add a new key", async function () {
      // Setup
      const { key, owner } = await loadFixture(deployKeyFixture);

      // Add a key for the owner
      await key.write.addKey([TEST_KEY_ADDRESS]);

      if (!owner.account) {
        throw new Error("Owner account is undefined");
      }
      const storedKey = await key.read.keys([owner.account.address]);
      expect(storedKey).to.equal(getAddress(TEST_KEY_ADDRESS));
    });

    it("Should not allow adding a zero address key", async function () {
      // Setup
      const { key } = await loadFixture(deployKeyFixture);

      // Add a zero address key (should fail)
      await expect(key.write.addKey([ZERO_ADDRESS])).to.be.rejectedWith(
        "InvalidKeyAddress"
      );
    });

    it("Should not allow adding a key if one already exists", async function () {
      // Setup
      const { key } = await loadFixture(deployKeyFixture);

      // Add the first key
      await key.write.addKey([TEST_KEY_ADDRESS]);

      // Try to add a second key (should fail)
      await expect(key.write.addKey([SECOND_KEY_ADDRESS])).to.be.rejectedWith(
        "KeyAlreadyExists"
      );
    });

    it("Should emit KeyAdded event when adding a key", async function () {
      // Setup
      const { key, owner, publicClient } = await loadFixture(deployKeyFixture);

      // Add the key and wait for transaction
      const txHash = await key.write.addKey([TEST_KEY_ADDRESS]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (!owner.account) {
        throw new Error("Owner account is undefined");
      }

      // Check for the KeyAdded event
      const events = await key.getEvents.KeyAdded();

      // Verify event details

      expect(events).to.have.lengthOf(1);
      expect(events[0].args.account).to.equal(
        getAddress(owner.account.address)
      );
      expect(events[0].args.key).to.equal(getAddress(TEST_KEY_ADDRESS));
    });
  });
  describe("Replacing Keys", function () {
    // Test context
    let context: ReplacementKeysContext;
    const NEW_KEY_ADDRESS = "0x5555555555555555555555555555555555555555";

    /**
     * Helper to create a signature for key replacement
     */
    async function createReplaceKeySignature(
      oldKeyAddress: Address,
      newKeyAddress: Address,
      signer: WalletClient
    ): Promise<`0x${string}`> {
      const packedData = encodePacked(
        ["address", "address"],
        [oldKeyAddress, newKeyAddress]
      );
      const messageToSign = keccak256(packedData);
      if (!signer.account) {
        throw new Error("Owner account is undefined");
      }

      return await signer.signMessage({
        message: { raw: messageToSign },
        account: signer.account,
      });
    }

    beforeEach(async function () {
      // Setup for each test
      const fixture = await loadFixture(deployKeyFixture);

      // For testing purposes we'll use one of the default accounts instead of creating a new one
      const [oldKeyClient] = await hre.viem.getWalletClients();
      const oldKeyAddress = oldKeyClient.account.address;

      context = {
        key: fixture.key,
        owner: fixture.owner,
        oldKeyClient,
        oldKeyAddress,
        publicClient: fixture.publicClient,
      };

      // First add the old key - this ensures a key exists for all replacement tests
      await context.key.write.addKey([oldKeyAddress]);
    });

    it("Should replace an existing key with valid signature", async function () {
      const { key, owner, oldKeyClient, oldKeyAddress, publicClient } = context;

      // Create signature for key replacement
      const signature = await createReplaceKeySignature(
        oldKeyAddress,
        NEW_KEY_ADDRESS,
        oldKeyClient
      );

      // Replace the key
      const txHash = await key.write.replaceKey([NEW_KEY_ADDRESS, signature]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Verify the key was replaced
      if (!owner.account) {
        throw new Error("Owner account is undefined");
      }
      expect(await key.read.keys([owner.account.address])).to.equal(
        getAddress(NEW_KEY_ADDRESS)
      );
    });

    it("Should not replace key with invalid signature", async function () {
      const { key } = context;

      // Invalid signature (all zeros)
      const invalidSignature =
        "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

      await expect(
        key.write.replaceKey([NEW_KEY_ADDRESS, invalidSignature])
      ).to.be.rejectedWith("InvalidSignature");
    });

    it("Should emit KeyReplaced event when replacing a key", async function () {
      const { key, owner, oldKeyClient, oldKeyAddress, publicClient } = context;

      // Create signature for key replacement
      const signature = await createReplaceKeySignature(
        oldKeyAddress,
        NEW_KEY_ADDRESS,
        oldKeyClient
      );

      // Replace the key
      const txHash = await key.write.replaceKey([NEW_KEY_ADDRESS, signature]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Check for the event
      if (!owner.account) {
        throw new Error("Owner account is undefined");
      }
      const events = await key.getEvents.KeyReplaced();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.account).to.equal(
        getAddress(owner.account.address)
      );
      expect(events[0].args.oldKey).to.equal(getAddress(oldKeyAddress));
      expect(events[0].args.newKey).to.equal(getAddress(NEW_KEY_ADDRESS));
    });
  });
  describe("Security", function () {
    /**
     * Helper to create a message hash from text
     */
    function createMessageHash(text: string): `0x${string}` {
      const packedData = encodePacked(["string"], [text]);
      return keccak256(packedData);
    }

    /**
     * Helper to sign a message with a wallet
     */
    async function signMessageHash(
      messageHash: `0x${string}`,
      signer: WalletClient
    ): Promise<`0x${string}`> {
      if (!signer.account) {
        throw new Error("Owner account is undefined");
      }
      return await signer.signMessage({
        message: { raw: messageHash },
        account: signer.account,
      });
    }

    it("Should not allow replacing key if none exists", async function () {
      const { key } = await loadFixture(deployKeyFixture);

      // Constants
      const NEW_KEY_ADDRESS = "0x5555555555555555555555555555555555555555";
      const DUMMY_SIGNATURE =
        "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

      // Attempt to replace key without having one
      await expect(
        key.write.replaceKey([NEW_KEY_ADDRESS, DUMMY_SIGNATURE])
      ).to.be.rejectedWith("NoKeyToReplace");
    });

    it("Should correctly verify a valid signature", async function () {
      const { key } = await loadFixture(deployKeyFixture);

      // Set up test scenario
      const [signerClient] = await hre.viem.getWalletClients();
      const signerAddress = signerClient.account.address;

      // Create and sign a test message
      const messageHash = createMessageHash("Test message");
      const signature = await signMessageHash(messageHash, signerClient);

      // Verify the signature
      const isValid = await key.read.verifySignature([
        messageHash,
        signature,
        signerAddress,
      ]);

      expect(isValid).to.be.true;
    });

    it("Should reject an invalid signature", async function () {
      const { key } = await loadFixture(deployKeyFixture);

      // Set up test scenario
      const [signerClient] = await hre.viem.getWalletClients();
      const signerAddress = signerClient.account.address;

      // Create two different message hashes
      const originalMessageHash = createMessageHash("Test message");
      const differentMessageHash = createMessageHash("Different message");

      // Sign the different message
      const signature = await signMessageHash(
        differentMessageHash,
        signerClient
      );

      // Verify the signature against the original message (should fail)
      const isValid = await key.read.verifySignature([
        originalMessageHash,
        signature,
        signerAddress,
      ]);

      expect(isValid).to.be.false;
    });
  });
});
