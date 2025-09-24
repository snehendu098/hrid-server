import { USER_PROFILES, ADDRESS_TO_USER } from "../state/state-class";
import { UserProfile } from "../interface/models";

export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getUserByAddress(address: string): UserProfile | null {
  const userId = ADDRESS_TO_USER[address];
  if (!userId) return null;

  return USER_PROFILES[userId] || null;
}

export function getUserById(userId: string): UserProfile | null {
  return USER_PROFILES[userId] || null;
}

export function getLinkedAddress(fromAddress: string, targetChain: "eth" | "near"): string | null {
  const user = getUserByAddress(fromAddress);
  if (!user) return null;

  return user.linkedAddresses[targetChain] || null;
}

export function resolveUserAddress(inputAddress: string): string {
  // If user has linked addresses, resolve to the appropriate one
  const user = getUserByAddress(inputAddress);
  if (user) {
    return user.primaryAddress;
  }

  // If no linked user found, return the input address as-is
  return inputAddress;
}

export function getAllUserAddresses(address: string): string[] {
  const user = getUserByAddress(address);
  if (!user) return [address];

  const addresses: string[] = [user.primaryAddress];

  if (user.linkedAddresses.eth && user.linkedAddresses.eth !== user.primaryAddress) {
    addresses.push(user.linkedAddresses.eth);
  }

  if (user.linkedAddresses.near && user.linkedAddresses.near !== user.primaryAddress) {
    addresses.push(user.linkedAddresses.near);
  }

  return addresses;
}

export function isAddressLinkedToUser(address: string, userId: string): boolean {
  const user = USER_PROFILES[userId];
  if (!user) return false;

  return user.primaryAddress === address ||
         user.linkedAddresses.eth === address ||
         user.linkedAddresses.near === address;
}

export function canUserAccessCollateral(userAddress: string, collateralOwnerAddress: string): boolean {
  // Direct ownership
  if (userAddress === collateralOwnerAddress) {
    return true;
  }

  // Check if both addresses belong to the same user profile
  const user1 = getUserByAddress(userAddress);
  const user2 = getUserByAddress(collateralOwnerAddress);

  if (user1 && user2 && user1.id === user2.id) {
    return true;
  }

  return false;
}

export function createUserProfile(
  primaryAddress: string,
  ethAddress?: string,
  nearAddress?: string
): UserProfile {
  const userId = generateUserId();
  const now = new Date();

  const profile: UserProfile = {
    id: userId,
    primaryAddress,
    linkedAddresses: {
      eth: ethAddress,
      near: nearAddress,
    },
    verified: true, // Auto-verify since we're using signature verification
    createdAt: now,
    lastUpdated: now,
  };

  // Store in state
  USER_PROFILES[userId] = profile;
  ADDRESS_TO_USER[primaryAddress] = userId;

  if (ethAddress && ethAddress !== primaryAddress) {
    ADDRESS_TO_USER[ethAddress] = userId;
  }

  if (nearAddress && nearAddress !== primaryAddress) {
    ADDRESS_TO_USER[nearAddress] = userId;
  }

  return profile;
}

export function linkAddresses(
  ethAddress: string,
  nearAddress: string,
  primaryAddress?: string
): UserProfile {
  // Use ETH address as primary by default
  const primary = primaryAddress || ethAddress;

  // Check if either address already has a profile
  const existingEthUser = getUserByAddress(ethAddress);
  const existingNearUser = getUserByAddress(nearAddress);

  if (existingEthUser && existingNearUser && existingEthUser.id !== existingNearUser.id) {
    throw new Error("Both addresses are already linked to different users");
  }

  if (existingEthUser) {
    // Update existing ETH user to include NEAR address
    existingEthUser.linkedAddresses.near = nearAddress;
    existingEthUser.lastUpdated = new Date();
    ADDRESS_TO_USER[nearAddress] = existingEthUser.id;
    return existingEthUser;
  }

  if (existingNearUser) {
    // Update existing NEAR user to include ETH address
    existingNearUser.linkedAddresses.eth = ethAddress;
    existingNearUser.lastUpdated = new Date();
    ADDRESS_TO_USER[ethAddress] = existingNearUser.id;
    return existingNearUser;
  }

  // Create new profile
  return createUserProfile(primary, ethAddress, nearAddress);
}

export function isValidAddressFormat(address: string, chain: "eth" | "near"): boolean {
  if (chain === "eth") {
    // Ethereum address format: 0x followed by 40 hex characters
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  } else {
    // NEAR address format: alphanumeric with dots, ending with .near or .testnet
    return /^[a-zA-Z0-9._-]+\.(near|testnet)$/.test(address) ||
           /^[a-fA-F0-9]{64}$/.test(address); // Also support implicit accounts
  }
}

export function getAddressChain(address: string): "eth" | "near" | "unknown" {
  if (isValidAddressFormat(address, "eth")) {
    return "eth";
  }

  if (isValidAddressFormat(address, "near")) {
    return "near";
  }

  return "unknown";
}