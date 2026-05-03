// Types
export * from "./types/index.js";

// Matching
export { areRolesCompatible, getCompatibleRoles } from "./matching/roles.js";
export { matchProtocols } from "./matching/protocol-match.js";
export type { ProtocolMatchResult } from "./matching/protocol-match.js";
