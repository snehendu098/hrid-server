import { CrossChainProof } from "../interface/models";

export function createLinkMessage(
  ethAddress: string,
  nearAddress: string,
  timestamp: number
): string {
  return `Link addresses: ETH ${ethAddress} <-> NEAR ${nearAddress} at ${timestamp}`;
}

export function isTimestampValid(
  timestamp: number,
  maxAgeMinutes: number = 10
): boolean {
  const now = Date.now();
  const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
  return Math.abs(now - timestamp) <= maxAge;
}

export function verifyEthSignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    // For production, you would use a library like ethers.js to verify the signature
    // For now, we'll implement a basic validation

    // Basic validation: signature should be hex string of correct length
    const isValidFormat = /^0x[a-fA-F0-9]{130}$/.test(signature); // 65 bytes * 2 + 0x prefix

    // For demo purposes, we'll accept any valid format signature
    // In production, you would recover the address from the signature and compare
    return isValidFormat;
  } catch (error) {
    console.error("Error verifying ETH signature:", error);
    return false;
  }
}

export function verifyNearSignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    // For production, you would use NEAR's crypto libraries to verify the signature
    // For now, we'll implement a basic validation

    // NEAR signatures are typically base64 encoded ed25519 signatures
    const isValidFormat =
      /^ed25519:[a-zA-Z0-9+/]+=*$/.test(signature) ||
      /^[a-zA-Z0-9+/]+=*$/.test(signature);

    // For demo purposes, we'll accept any valid format signature
    // In production, you would verify the signature against the public key
    return isValidFormat;
  } catch (error) {
    console.error("Error verifying NEAR signature:", error);
    return false;
  }
}

export function verifyCrossChainProof(
  ethAddress: string,
  nearAddress: string,
  ethSignature: string,
  nearSignature: string,
  timestamp: number
): CrossChainProof {
  const message = createLinkMessage(ethAddress, nearAddress, timestamp);

  // Verify timestamp is recent
  const isTimestampOk = isTimestampValid(timestamp);
  if (!isTimestampOk) {
    return {
      ethAddress,
      nearAddress,
      message,
      ethSignature,
      nearSignature,
      isValid: false,
    };
  }

  // Verify ETH signature (ETH wallet signs message containing NEAR address)
  const isEthSignatureValid = verifyEthSignature(
    message,
    ethSignature,
    ethAddress
  );

  // Verify NEAR signature (NEAR wallet signs message containing ETH address)
  const isNearSignatureValid = verifyNearSignature(
    message,
    nearSignature,
    nearAddress
  );

  const isValid = isEthSignatureValid && isNearSignatureValid;

  return {
    ethAddress,
    nearAddress,
    message,
    ethSignature,
    nearSignature,
    isValid,
  };
}

// Helper function to generate the message that users should sign
export function generateSignatureMessage(
  ethAddress: string,
  nearAddress: string
): {
  message: string;
  timestamp: number;
} {
  const timestamp = Date.now();
  const message = createLinkMessage(ethAddress, nearAddress, timestamp);

  return {
    message,
    timestamp,
  };
}

// Validation helpers
export function validateSignatureRequest(request: {
  ethAddress: string;
  nearAddress: string;
  ethSignature: string;
  nearSignature: string;
  timestamp: number;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate address formats
  if (!/^0x[a-fA-F0-9]{40}$/.test(request.ethAddress)) {
    errors.push("Invalid Ethereum address format");
  }

  if (
    !/^[a-zA-Z0-9._-]+\.(near|testnet)$/.test(request.nearAddress) &&
    !/^[a-fA-F0-9]{64}$/.test(request.nearAddress)
  ) {
    errors.push("Invalid NEAR address format");
  }

  // Validate signature formats
  if (!/^0x[a-fA-F0-9]{130}$/.test(request.ethSignature)) {
    errors.push("Invalid Ethereum signature format");
  }

  if (!/^(ed25519:)?[a-zA-Z0-9+/]+=*$/.test(request.nearSignature)) {
    errors.push("Invalid NEAR signature format");
  }

  // Validate timestamp
  if (!isTimestampValid(request.timestamp)) {
    errors.push("Timestamp is too old or invalid");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
