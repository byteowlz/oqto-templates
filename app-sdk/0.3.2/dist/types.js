/** Handshake protocol tag. Also the negotiated version for v0 hosts. */
export const OQTO_APP_PROTOCOL = "oqto-app/v0";
/** Negotiated protocol adding operations, multi-resource files, and presentation. */
export const OQTO_APP_PROTOCOL_V1 = "oqto-app/v1";
/** Negotiated protocol adding App-defined Agent Context and contextual actions. */
export const OQTO_APP_PROTOCOL_V2 = "oqto-app/v2";
/**
 * Versions this SDK can speak, newest first. The host picks one; an older host
 * that ignores the offer keeps the v0 behaviour it already implements.
 */
export const OQTO_APP_PROTOCOL_VERSIONS = [
    OQTO_APP_PROTOCOL_V2,
    OQTO_APP_PROTOCOL_V1,
    OQTO_APP_PROTOCOL,
];
//# sourceMappingURL=types.js.map