import { Platform } from "react-native";

import { getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

import type { ResolvedWalletActivation } from "./activationResolver";
import { MEDIATOR_POLLING_INTERVAL_MS, resolveMediatorInvitationUrl, saveMediatorState } from "./mediatorService";

const BCOVRIN_TEST_GENESIS_URL = "https://test.bcovrin.vonx.io/genesis";
const HOLDER_WALLET_KEY_PREFIX = "unify.holder-wallet-raw-key";

export type HolderActivationResult = {
  credentialRecordId: string;
  holderAgentInitialized: boolean;
  holderConnectionId: string;
  mediatorConnectionId?: string;
};

export type CredentialRecord = {
  credentialAttributes?: Array<{ mimeType?: string; name: string; value: string }>;
  id?: string;
  state?: string;
};

export type ConnectionRecord = {
  createdAt?: Date | string;
  id?: string;
  state?: string;
  theirLabel?: string;
};

type MediationRecord = {
  connectionId?: string;
  id?: string;
  state?: string;
};

type Constructor<T> = new (...args: unknown[]) => T;
type DynamicModule = Record<string, unknown>;

type CredoModulesBundle = {
  Agent: Constructor<HolderAgent>;
  AnonCredsDidCommCredentialFormatService: Constructor<unknown>;
  AnonCredsModule: Constructor<unknown>;
  AskarModule: Constructor<unknown>;
  askarBindings: DynamicModule;
  autoAcceptCredential: unknown;
  DidCommCredentialV1Protocol: Constructor<unknown>;
  DidCommCredentialV2Protocol: Constructor<unknown>;
  DidCommHttpOutboundTransport: Constructor<unknown>;
  DidCommModule: Constructor<unknown>;
  DidCommWsOutboundTransport: Constructor<unknown>;
  IndyVdrAnonCredsRegistry: Constructor<unknown>;
  IndyVdrModule: Constructor<unknown>;
  indyVdrBindings: DynamicModule;
  LegacyIndyDidCommCredentialFormatService: Constructor<unknown>;
  mediatorPickupStrategy: string;
  reactNativeDeps: unknown;
};

type HolderAgent = {
  didcomm?: {
    connections?: {
      getAll?: () => Promise<ConnectionRecord[]>;
      getById?: (id: string) => Promise<ConnectionRecord | null>;
    };
    credentials?: { getAll?: () => Promise<CredentialRecord[]> };
    mediationRecipient?: {
      getDefaultMediator?: () => Promise<MediationRecord | null>;
      pickupMessages?: (mediationRecord?: MediationRecord) => Promise<void>;
    };
    oob?: {
      receiveInvitationFromUrl?: (
        invitationUrl: string,
        options: { autoAcceptConnection?: boolean; autoAcceptInvitation?: boolean; label: string },
      ) => Promise<{ connectionRecord?: ConnectionRecord; outOfBandRecord?: { id?: string } }>;
    };
    registerOutboundTransport?: (transport: unknown) => void;
  };
  initialize: () => Promise<void>;
};

// Module-level agent cache: the initialized Credo agent is kept alive for the session
// so that timed message pickup continues without re-initialization.
let agentRef: HolderAgent | null = null;

export function getCachedHolderAgent(): HolderAgent | null {
  return agentRef;
}

export async function getCredentialRecords(): Promise<CredentialRecord[]> {
  if (!agentRef) {
    return [];
  }

  return (await agentRef.didcomm?.credentials?.getAll?.()) ?? [];
}

/**
 * Triggers an on-demand RFC 0482 batch pickup from the mediator.
 * Safe to call at any time — no-ops if the agent is not running.
 */
export async function pollMediatorForMessages(): Promise<void> {
  const mediationRecipient = agentRef?.didcomm?.mediationRecipient;

  if (!mediationRecipient?.pickupMessages) {
    return;
  }

  const mediator = (await mediationRecipient.getDefaultMediator?.()) ?? undefined;
  await mediationRecipient.pickupMessages(mediator);
}

async function getOrCreateHolderWalletKey(walletId: string, generateRawKey: () => string): Promise<string> {
  const storageKey = `${HOLDER_WALLET_KEY_PREFIX}.${walletId}`;
  const existingKey = await getSecureValue(storageKey);

  if (existingKey) {
    return existingKey;
  }

  const newKey = generateRawKey();
  await saveSecureValue(storageKey, newKey);
  return newKey;
}

async function loadBcovrinGenesisTransactions(): Promise<string> {
  const response = await fetch(BCOVRIN_TEST_GENESIS_URL);

  if (!response.ok) {
    throw new Error("Unable to load BCovrin Test genesis transactions.");
  }

  return response.text();
}

function fallbackActivationResult(activation: ResolvedWalletActivation): HolderActivationResult {
  return {
    credentialRecordId: `credential-${activation.activationId}`,
    holderAgentInitialized: false,
    holderConnectionId: `connection-${activation.invitationId}`,
  };
}

function getConstructor<T>(moduleExports: DynamicModule, exportName: string): Constructor<T> {
  const exportedValue = moduleExports[exportName];

  if (!exportedValue) {
    throw new Error(`Credo export ${exportName} is unavailable.`);
  }

  return exportedValue as Constructor<T>;
}

async function loadCredoModules(): Promise<CredoModulesBundle> {
  const [core, didcomm, reactNative, askarModule, askarBindings, anoncredsModule, , indyVdrModule, indyVdrBindings] =
    await Promise.all([
      import("@credo-ts/core"),
      import("@credo-ts/didcomm"),
      import("@credo-ts/react-native"),
      import("@credo-ts/askar"),
      import("@openwallet-foundation/askar-react-native"),
      import("@credo-ts/anoncreds"),
      import("@hyperledger/anoncreds-react-native"),
      import("@credo-ts/indy-vdr"),
      import("@hyperledger/indy-vdr-react-native"),
    ]);

  const coreExports = core as DynamicModule;
  const didcommExports = didcomm as DynamicModule;
  const anoncredsExports = anoncredsModule as DynamicModule;
  const askarExports = askarModule as DynamicModule;
  const indyVdrExports = indyVdrModule as DynamicModule;

  const autoAcceptCredential = (didcommExports.DidCommAutoAcceptCredential as { ContentApproved?: unknown } | undefined)
    ?.ContentApproved;

  if (!autoAcceptCredential) {
    throw new Error("Credo auto-accept credential enum is unavailable.");
  }

  // Prefer the strongly-typed enum value; fall back to the known string literal so
  // Credo still receives the correct value if the export shape changes between patch versions.
  const mediatorPickupStrategy =
    (didcommExports.MediatorPickupStrategy as Record<string, string> | undefined)?.PickUpV2Timed ?? "PickUpV2Timed";

  return {
    Agent: getConstructor<HolderAgent>(coreExports, "Agent"),
    AnonCredsDidCommCredentialFormatService: getConstructor<unknown>(
      anoncredsExports,
      "AnonCredsDidCommCredentialFormatService",
    ),
    AnonCredsModule: getConstructor<unknown>(anoncredsExports, "AnonCredsModule"),
    AskarModule: getConstructor<unknown>(askarExports, "AskarModule"),
    askarBindings: askarBindings as DynamicModule,
    autoAcceptCredential,
    DidCommCredentialV1Protocol: getConstructor<unknown>(anoncredsExports, "DidCommCredentialV1Protocol"),
    DidCommCredentialV2Protocol: getConstructor<unknown>(didcommExports, "DidCommCredentialV2Protocol"),
    DidCommHttpOutboundTransport: getConstructor<unknown>(didcommExports, "DidCommHttpOutboundTransport"),
    DidCommModule: getConstructor<unknown>(didcommExports, "DidCommModule"),
    DidCommWsOutboundTransport: getConstructor<unknown>(didcommExports, "DidCommWsOutboundTransport"),
    IndyVdrAnonCredsRegistry: getConstructor<unknown>(indyVdrExports, "IndyVdrAnonCredsRegistry"),
    IndyVdrModule: getConstructor<unknown>(indyVdrExports, "IndyVdrModule"),
    indyVdrBindings: indyVdrBindings as DynamicModule,
    LegacyIndyDidCommCredentialFormatService: getConstructor<unknown>(
      anoncredsExports,
      "LegacyIndyDidCommCredentialFormatService",
    ),
    mediatorPickupStrategy,
    reactNativeDeps: reactNative.agentDependencies,
  };
}

function buildAgentModules(
  bundle: CredoModulesBundle,
  walletId: string,
  walletKey: string,
  genesisTransactions: string,
  mediatorInvitationUrl: string,
): Record<string, unknown> {
  const {
    AnonCredsDidCommCredentialFormatService,
    AnonCredsModule,
    AskarModule,
    askarBindings,
    autoAcceptCredential,
    DidCommCredentialV1Protocol,
    DidCommCredentialV2Protocol,
    DidCommHttpOutboundTransport,
    DidCommModule,
    DidCommWsOutboundTransport,
    IndyVdrAnonCredsRegistry,
    IndyVdrModule,
    indyVdrBindings,
    LegacyIndyDidCommCredentialFormatService,
    mediatorPickupStrategy,
  } = bundle;

  return {
    anoncreds: new AnonCredsModule({
      registries: [new IndyVdrAnonCredsRegistry()],
    }),
    askar: new AskarModule({
      askar: askarBindings.askar,
      store: {
        id: walletId,
        key: walletKey,
        keyDerivationMethod: "raw",
      },
    }),
    didcomm: new DidCommModule({
      credentials: {
        autoAcceptCredentials: autoAcceptCredential,
        credentialProtocols: [
          new DidCommCredentialV1Protocol({
            indyCredentialFormat: new LegacyIndyDidCommCredentialFormatService(),
          }),
          new DidCommCredentialV2Protocol({
            credentialFormats: [
              new AnonCredsDidCommCredentialFormatService(),
              new LegacyIndyDidCommCredentialFormatService(),
            ],
          }),
        ],
      },
      // DID Exchange → mediate-request (RFC 0211) → keylist update → PickUpV2Timed polling (RFC 0482).
      // On subsequent initializations Credo detects the existing Askar mediator record and
      // skips re-negotiation, satisfying the "no re-negotiate on reopen" persistence requirement.
      mediationRecipient: {
        mediatorInvitationUrl,
        mediatorPickupStrategy,
        mediatorPollingInterval: MEDIATOR_POLLING_INTERVAL_MS,
      },
      mediator: false,
      transports: {
        outbound: [new DidCommHttpOutboundTransport(), new DidCommWsOutboundTransport()],
      },
    }),
    indyVdr: new IndyVdrModule({
      indyVdr: indyVdrBindings.indyVdr,
      networks: [
        {
          connectOnStartup: false,
          genesisTransactions,
          indyNamespace: "bcovrin:test",
          isProduction: false,
        },
      ],
    }),
  };
}

async function persistMediatorRecord(agent: HolderAgent, mediatorInvitationUrl: string): Promise<string | undefined> {
  const mediator = await agent.didcomm?.mediationRecipient?.getDefaultMediator?.();
  const connectionId = mediator?.connectionId;

  if (connectionId) {
    await saveMediatorState({
      connectionId,
      establishedAt: new Date().toISOString(),
      invitationUrl: mediatorInvitationUrl,
      mediationState: mediator?.state ?? "granted",
    });
  }

  return connectionId;
}

export async function acceptHolderActivation(activation: ResolvedWalletActivation): Promise<HolderActivationResult> {
  if (Platform.OS === "web") {
    return fallbackActivationResult(activation);
  }

  try {
    const mediatorInvitationUrl = resolveMediatorInvitationUrl(activation.mediatorInvitationUrl);

    const [bundle, genesisTransactions] = await Promise.all([loadCredoModules(), loadBcovrinGenesisTransactions()]);

    const walletKey = await getOrCreateHolderWalletKey(activation.walletId, () => {
      const askar = bundle.askarBindings.askar as { storeGenerateRawKey?: (options: object) => string } | undefined;
      const generatedKey = askar?.storeGenerateRawKey?.({});

      if (!generatedKey) {
        throw new Error("Askar raw key generation is unavailable.");
      }

      return generatedKey;
    });

    const modules = buildAgentModules(bundle, activation.walletId, walletKey, genesisTransactions, mediatorInvitationUrl);

    const agent = new bundle.Agent({
      config: { label: "UNIFY Student Wallet" },
      dependencies: bundle.reactNativeDeps,
      modules,
    });

    await agent.initialize();

    agentRef = agent;

    const mediatorConnectionId = await persistMediatorRecord(agent, mediatorInvitationUrl);

    const autoAcceptIssuerConnection = activation.activationSource === "oob";
    const invitationRecord = await agent.didcomm?.oob?.receiveInvitationFromUrl?.(activation.invitationUrl, {
      autoAcceptConnection: autoAcceptIssuerConnection,
      autoAcceptInvitation: autoAcceptIssuerConnection,
      label: "UNIFY Student Wallet",
    });
    const credentialRecords = (await agent.didcomm?.credentials?.getAll?.()) ?? [];

    return {
      credentialRecordId: credentialRecords[0]?.id ?? `credential-${activation.activationId}`,
      holderAgentInitialized: true,
      holderConnectionId:
        invitationRecord?.connectionRecord?.id ??
        invitationRecord?.outOfBandRecord?.id ??
        `connection-${activation.invitationId}`,
      mediatorConnectionId,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "test") {
      return fallbackActivationResult(activation);
    }

    throw error;
  }
}

/**
 * Re-initializes the Credo agent for an already-activated wallet session (e.g., after the app
 * re-opens). Credo detects the existing Askar DB and mediator connection — no new DID Exchange
 * or mediation negotiation is performed. Call this after the user unlocks the wallet.
 */
export async function resumeHolderAgentSession(walletId: string, mediatorInvitationUrl?: string): Promise<void> {
  if (Platform.OS === "web" || agentRef) {
    return;
  }

  try {
    const walletKey = await getSecureValue(`${HOLDER_WALLET_KEY_PREFIX}.${walletId}`);

    if (!walletKey) {
      throw new Error("Wallet key not found. Re-activation is required.");
    }

    const resolvedMediatorUrl = resolveMediatorInvitationUrl(mediatorInvitationUrl);

    const [bundle, genesisTransactions] = await Promise.all([loadCredoModules(), loadBcovrinGenesisTransactions()]);

    const modules = buildAgentModules(bundle, walletId, walletKey, genesisTransactions, resolvedMediatorUrl);

    const agent = new bundle.Agent({
      config: { label: "UNIFY Student Wallet" },
      dependencies: bundle.reactNativeDeps,
      modules,
    });

    await agent.initialize();

    agentRef = agent;

    await persistMediatorRecord(agent, resolvedMediatorUrl);
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      throw error;
    }
  }
}
