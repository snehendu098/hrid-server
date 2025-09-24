import { Hono } from "hono";
import { USER_PROFILES, ADDRESS_TO_USER } from "../state/state-class";
import {
  linkAddresses,
  getUserByAddress,
  getUserById,
  getLinkedAddress,
  getAllUserAddresses,
  isValidAddressFormat,
  getAddressChain,
} from "../utils/addressResolver";
import {
  verifyCrossChainProof,
  validateSignatureRequest,
  generateSignatureMessage,
} from "../utils/signatureVerifier";

const userRoutes = new Hono();

// Link ETH and NEAR addresses with cryptographic proof
userRoutes.post("/link-addresses", async (c) => {
  try {
    const requestBody = await c.req.json();
    const { ethAddress, nearAddress, ethSignature, nearSignature, timestamp } = requestBody;

    if (!ethAddress || !nearAddress || !ethSignature || !nearSignature || !timestamp) {
      return c.json(
        {
          success: false,
          message: "ethAddress, nearAddress, ethSignature, nearSignature, and timestamp are required",
        },
        400
      );
    }

    // Validate request format
    const validation = validateSignatureRequest({
      ethAddress,
      nearAddress,
      ethSignature,
      nearSignature,
      timestamp,
    });

    if (!validation.isValid) {
      return c.json(
        {
          success: false,
          message: "Invalid request format",
          errors: validation.errors,
        },
        400
      );
    }

    // Verify cryptographic proof
    const proof = verifyCrossChainProof(
      ethAddress,
      nearAddress,
      ethSignature,
      nearSignature,
      timestamp
    );

    if (!proof.isValid) {
      return c.json(
        {
          success: false,
          message: "Invalid cryptographic proof. Please ensure both wallets signed the correct message.",
          proof: {
            expectedMessage: proof.message,
            ethSignatureValid: proof.ethSignature ? true : false,
            nearSignatureValid: proof.nearSignature ? true : false,
          },
        },
        400
      );
    }

    // Create or update user profile
    try {
      const userProfile = linkAddresses(ethAddress, nearAddress, ethAddress);

      return c.json({
        success: true,
        message: "Addresses successfully linked",
        data: {
          userId: userProfile.id,
          primaryAddress: userProfile.primaryAddress,
          linkedAddresses: userProfile.linkedAddresses,
          verified: userProfile.verified,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Failed to link addresses",
        },
        400
      );
    }
  } catch (error) {
    console.error("Error linking addresses:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

// Get signature message for address linking
userRoutes.post("/get-link-message", async (c) => {
  try {
    const requestBody = await c.req.json();
    const { ethAddress, nearAddress } = requestBody;

    if (!ethAddress || !nearAddress) {
      return c.json(
        {
          success: false,
          message: "ethAddress and nearAddress are required",
        },
        400
      );
    }

    // Validate address formats
    if (!isValidAddressFormat(ethAddress, "eth")) {
      return c.json(
        {
          success: false,
          message: "Invalid Ethereum address format",
        },
        400
      );
    }

    if (!isValidAddressFormat(nearAddress, "near")) {
      return c.json(
        {
          success: false,
          message: "Invalid NEAR address format",
        },
        400
      );
    }

    const { message, timestamp } = generateSignatureMessage(ethAddress, nearAddress);

    return c.json({
      success: true,
      data: {
        message,
        timestamp,
        instructions: {
          eth: `Sign this message with your Ethereum wallet (${ethAddress})`,
          near: `Sign this message with your NEAR wallet (${nearAddress})`,
        },
      },
    });
  } catch (error) {
    console.error("Error generating link message:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

// Get user profile by any linked address
userRoutes.get("/profile/:address", async (c) => {
  try {
    const address = c.req.param("address");

    if (!address) {
      return c.json(
        {
          success: false,
          message: "address is required",
        },
        400
      );
    }

    const user = getUserByAddress(address);
    if (!user) {
      return c.json({
        success: true,
        data: {
          linked: false,
          address,
          chain: getAddressChain(address),
        },
      });
    }

    return c.json({
      success: true,
      data: {
        linked: true,
        userId: user.id,
        primaryAddress: user.primaryAddress,
        linkedAddresses: user.linkedAddresses,
        allAddresses: getAllUserAddresses(address),
        verified: user.verified,
        createdAt: user.createdAt,
        lastUpdated: user.lastUpdated,
      },
    });
  } catch (error) {
    console.error("Error retrieving user profile:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

// Get linked address for cross-chain operations
userRoutes.get("/linked-address/:address/:targetChain", async (c) => {
  try {
    const address = c.req.param("address");
    const targetChain = c.req.param("targetChain") as "eth" | "near";

    if (!address || !targetChain) {
      return c.json(
        {
          success: false,
          message: "address and targetChain are required",
        },
        400
      );
    }

    if (targetChain !== "eth" && targetChain !== "near") {
      return c.json(
        {
          success: false,
          message: "targetChain must be 'eth' or 'near'",
        },
        400
      );
    }

    const linkedAddress = getLinkedAddress(address, targetChain);
    const user = getUserByAddress(address);

    return c.json({
      success: true,
      data: {
        fromAddress: address,
        targetChain,
        linkedAddress,
        hasLinkedAddress: linkedAddress !== null,
        userLinked: user !== null,
      },
    });
  } catch (error) {
    console.error("Error retrieving linked address:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

// List all user profiles (for admin/debugging)
userRoutes.get("/profiles", async (c) => {
  try {
    const profiles = Object.values(USER_PROFILES).map(profile => ({
      userId: profile.id,
      primaryAddress: profile.primaryAddress,
      linkedAddresses: profile.linkedAddresses,
      verified: profile.verified,
      createdAt: profile.createdAt,
      lastUpdated: profile.lastUpdated,
    }));

    return c.json({
      success: true,
      data: {
        totalProfiles: profiles.length,
        profiles,
      },
    });
  } catch (error) {
    console.error("Error retrieving user profiles:", error);
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
});

export default userRoutes;