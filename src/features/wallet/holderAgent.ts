import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

import { getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

import { getMediatorInvitationUrl, getMediatorPickupStrategy } from "./mediatorService";

const BCOVRIN_TEST_GENESIS_URL = "https://test.bcovrin.vonx.io/genesis";
const HOLDER_WALLET_KEY_PREFIX = "unify.holder-wallet-raw-key";

export type HolderAgentConfig = {
  walletId: string;
};

type Constructor<T> = new (...args: unknown[]) => T;
type DynamicModule = Record<string, unknown>;

type CredentialRecord = {
  id: string;
  state?: string;
  connectionId?: string;
  credentialAttributes?: { name: string; value: string }[];
};

type DidCommConnectionRecord = {
  id: string;
  isReady?: boolean;
  state?: string;
};

type DidCommMediationRecord = {
  id: string;
  connectionId: string;
  isReady?: boolean;
  state?: string;
};

export type HolderAgent = {
  didcomm?: {
    connections?: {
      findAllByOutOfBandId?: (outOfBandId: string) => Promise<DidCommConnectionRecord[]>;
      returnWhenIsConnected?: (
        connectionId: string,
        options?: { timeoutMs: number },
      ) => Promise<DidCommConnectionRecord>;
    };
    credentials?: {
      acceptOffer?: (options: { credentialRecordId: string }) => Promise<unknown>;
      declineOffer?: (credentialRecordId: string) => Promise<unknown>;
      getAll?: () => Promise<CredentialRecord[]>;
      getById?: (id: string) => Promise<CredentialRecord>;
    };
    mediationRecipient?: {
      findByConnectionId?: (connectionId: string) => Promise<DidCommMediationRecord | null>;
      findDefaultMediator?: () => Promise<DidCommMediationRecord | null>;
      getMediators?: () => Promise<DidCommMediationRecord[]>;
      initiateMessagePickup?: (
        mediator?: DidCommMediationRecord,
        pickupStrategy?: unknown,
      ) => Promise<unknown>;
      provision?: (connection: DidCommConnectionRecord) => Promise<DidCommMediationRecord>;
    };
    oob?: {
      findByReceivedInvitationId?: (receivedInvitationId: string) => Promise<{ id: string } | null>;
      parseInvitation?: (invitationUrl: string) => Promise<{ id: string }>;
      receiveInvitationFromUrl?: (
        invitationUrl: string,
        options: {
          acceptInvitationTimeoutMs?: number;
          autoAcceptConnection?: boolean;
          autoAcceptInvitation?: boolean;
          label: string;
          reuseConnection?: boolean;
        },
      ) => Promise<{ connectionRecord?: DidCommConnectionRecord; outOfBandRecord?: { id?: string } }>;
    };
    registerOutboundTransport?: (transport: unknown) => void;
  };
  events?: {
    on?: (eventType: string, handler: (event: unknown) => void) => void;
    off?: (eventType: string, handler: (event: unknown) => void) => void;
  };
  initialize: () => Promise<void>;
};

export type CreateHolderWalletResult = {
  walletId: string;
  agent: HolderAgent | null;
};

let agentRef: HolderAgent | null = null;
let activeWalletId: string | undefined;

export function getActiveHolderAgent(): HolderAgent | null {
  return agentRef;
}

export function getActiveWalletId(): string | undefined {
  return activeWalletId;
}

export function clearActiveHolderAgent() {
  agentRef = null;
  activeWalletId = undefined;
}

async function getOrCreateHolderWalletKey(walletId: string, generateRawKey: () => string) {
  const storageKey = `${HOLDER_WALLET_KEY_PREFIX}.${walletId}`;
  const existingKey = await getSecureValue(storageKey);

  if (existingKey) {
    return existingKey;
  }

  const newKey = generateRawKey();
  await saveSecureValue(storageKey, newKey);
  return newKey;
}

async function loadBcovrinGenesisTransactions() {
  const response = await fetch(BCOVRIN_TEST_GENESIS_URL);

  if (!response.ok) {
    throw new Error("Unable to load BCovrin Test genesis transactions.");
  }

  return response.text();
}

function getConstructor<T>(moduleExports: DynamicModule, exportName: string): Constructor<T> {
  const exportedValue = moduleExports[exportName];

  if (!exportedValue) {
    throw new Error(`Credo export ${exportName} is unavailable.`);
  }

  return exportedValue as Constructor<T>;
}

function errorMessageFromUnknown(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const messages = [error.message];
  let cause = error.cause;

  while (cause instanceof Error && messages.length < 5) {
    messages.push(cause.message);
    cause = cause.cause;
  }

  return messages.join(" Caused by: ");
}

async function loggedStep<T>(label: string, action: () => Promise<T>): Promise<T> {
  console.log(`[holder-agent] ${label}...`);

  try {
    const result = await action();
    console.log(`[holder-agent] ${label}: ok`);
    return result;
  } catch (error) {
    console.error(`[holder-agent] ${label}: failed - ${errorMessageFromUnknown(error)}`);
    throw error;
  }
}

async function initializeMediator(agent: HolderAgent, mediatorInvitationUrl: string, mediatorPickupStrategy: unknown) {
  const oob = agent.didcomm?.oob;
  const connections = agent.didcomm?.connections;
  const mediationRecipient = agent.didcomm?.mediationRecipient;

  if (
    !oob?.parseInvitation ||
    !oob.findByReceivedInvitationId ||
    !oob.receiveInvitationFromUrl ||
    !connections?.findAllByOutOfBandId ||
    !connections.returnWhenIsConnected ||
    !mediationRecipient?.findByConnectionId ||
    !mediationRecipient.findDefaultMediator ||
    !mediationRecipient.initiateMessagePickup ||
    !mediationRecipient.provision
  ) {
    throw new Error("Credo holder agent is missing the mediator recipient APIs.");
  }

  const existingDefaultMediator = await loggedStep("check default mediator", () =>
    mediationRecipient.findDefaultMediator!(),
  );

  if (existingDefaultMediator?.isReady) {
    await loggedStep(`start mediator pickup ${existingDefaultMediator.id}`, () =>
      mediationRecipient.initiateMessagePickup!(existingDefaultMediator, mediatorPickupStrategy),
    );
    return;
  }

  const invitation = await loggedStep("parse mediator invitation", () => oob.parseInvitation!(mediatorInvitationUrl));
  const existingOutOfBandRecord = await loggedStep("check existing mediator invitation record", () =>
    oob.findByReceivedInvitationId!(invitation.id),
  );
  const existingConnections = existingOutOfBandRecord?.id
    ? await loggedStep("check existing mediator connection", () =>
        connections.findAllByOutOfBandId!(existingOutOfBandRecord.id),
      )
    : [];

  const connection =
    existingConnections[0] ??
    (
      await loggedStep("receive mediator invitation", () =>
        oob.receiveInvitationFromUrl!(mediatorInvitationUrl, {
          acceptInvitationTimeoutMs: 30_000,
          autoAcceptConnection: true,
          autoAcceptInvitation: true,
          label: "UNIFY Student Wallet",
          reuseConnection: true,
        }),
      )
    ).connectionRecord;

  if (!connection?.id) {
    throw new Error("Mediator invitation did not create a connection record.");
  }

  const readyConnection = connection.isReady
    ? connection
    : await loggedStep(`wait for mediator connection ${connection.id}`, () =>
        connections.returnWhenIsConnected!(connection.id, { timeoutMs: 45_000 }),
      );

  let mediation = await loggedStep("check mediation record", () =>
    mediationRecipient.findByConnectionId!(readyConnection.id),
  );

  if (!mediation?.isReady) {
    mediation = await loggedStep(`request mediation grant for ${readyConnection.id}`, () =>
      mediationRecipient.provision!(readyConnection),
    );
  }

  if (!mediation?.isReady) {
    throw new Error(
      `Mediator record ${mediation?.id ?? "(unknown)"} was not granted. Clear app storage and retry with a fresh wallet.`,
    );
  }

  await loggedStep(`start mediator pickup ${mediation.id}`, () =>
    mediationRecipient.initiateMessagePickup!(mediation, mediatorPickupStrategy),
  );
}

export async function initializeHolderAgent(config: HolderAgentConfig): Promise<HolderAgent | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    const mediatorInvitationUrl = getMediatorInvitationUrl();
    const [
      core,
      didcomm,
      reactNative,
      askarModule,
      askarBindings,
      anoncredsModule,
      indyVdrModule,
      indyVdrBindings,
    ] = await Promise.all([
      import("@credo-ts/core"),
      import("@credo-ts/didcomm"),
      import("@credo-ts/react-native"),
      import("@credo-ts/askar"),
      import("@openwallet-foundation/askar-react-native"),
      import("@credo-ts/anoncreds"),
      import("@credo-ts/indy-vdr"),
      import("@hyperledger/indy-vdr-react-native"),
    ]);

    const walletKey = await getOrCreateHolderWalletKey(config.walletId, () => {
      const rawKey = (askarBindings as DynamicModule).askar as { storeGenerateRawKey?: (options: object) => string } | undefined;
      const generatedKey = rawKey?.storeGenerateRawKey?.({});

      if (!generatedKey) {
        throw new Error("Askar raw key generation is unavailable.");
      }

      return generatedKey;
    });
    const genesisTransactions = await loadBcovrinGenesisTransactions();

    const coreExports = core as DynamicModule;
    const didcommExports = didcomm as DynamicModule;
    const anoncredsExports = anoncredsModule as DynamicModule;
    const askarExports = askarModule as DynamicModule;
    const indyVdrExports = indyVdrModule as DynamicModule;
    const Agent = getConstructor<HolderAgent>(coreExports, "Agent");
    const ConsoleLogger = getConstructor<unknown>(coreExports, "ConsoleLogger");
    const PeerDidNumAlgo = coreExports.PeerDidNumAlgo as Record<string, unknown> | undefined;
    const DidCommModule = getConstructor<unknown>(didcommExports, "DidCommModule");
    const DidCommHttpOutboundTransport = getConstructor<unknown>(didcommExports, "DidCommHttpOutboundTransport");
    const DidCommWsOutboundTransport = getConstructor<unknown>(didcommExports, "DidCommWsOutboundTransport");
    const DidCommMediatorPickupStrategy = didcommExports.DidCommMediatorPickupStrategy as
      | Record<string, unknown>
      | undefined;
    const DidCommCredentialV1Protocol = getConstructor<unknown>(anoncredsExports, "DidCommCredentialV1Protocol");
    const DidCommCredentialV2Protocol = getConstructor<unknown>(didcommExports, "DidCommCredentialV2Protocol");
    const LegacyIndyDidCommCredentialFormatService = getConstructor<unknown>(
      anoncredsExports,
      "LegacyIndyDidCommCredentialFormatService",
    );
    const AnonCredsDidCommCredentialFormatService = getConstructor<unknown>(
      anoncredsExports,
      "AnonCredsDidCommCredentialFormatService",
    );
    const AskarModule = getConstructor<unknown>(askarExports, "AskarModule");
    const AnonCredsModule = getConstructor<unknown>(anoncredsExports, "AnonCredsModule");
    const IndyVdrModule = getConstructor<unknown>(indyVdrExports, "IndyVdrModule");
    const IndyVdrAnonCredsRegistry = getConstructor<unknown>(indyVdrExports, "IndyVdrAnonCredsRegistry");
    const autoAcceptCredential = (didcommExports.DidCommAutoAcceptCredential as { Never?: unknown } | undefined)?.Never;
    const logLevel = (coreExports.LogLevel as { debug?: unknown; info?: unknown } | undefined)?.debug;
    const peerDidGenesisDoc = PeerDidNumAlgo?.GenesisDoc;

    if (!autoAcceptCredential) {
      throw new Error("Credo auto-accept credential enum is unavailable.");
    }

    if (!logLevel) {
      throw new Error("Credo debug log level is unavailable.");
    }

    if (!peerDidGenesisDoc) {
      throw new Error("Credo peer DID GenesisDoc algorithm is unavailable.");
    }

    const mediatorPickupStrategyName = getMediatorPickupStrategy();
    const mediatorPickupStrategy = DidCommMediatorPickupStrategy?.[mediatorPickupStrategyName];

    if (!mediatorPickupStrategy) {
      throw new Error(`Credo mediator pickup strategy ${mediatorPickupStrategyName} is unavailable.`);
    }

    const modules: Record<string, unknown> = {
      anoncreds: new AnonCredsModule({
        registries: [new IndyVdrAnonCredsRegistry()],
      }),
      askar: new AskarModule({
        askar: askarBindings.askar,
        store: {
          id: config.walletId,
          key: walletKey,
          keyDerivationMethod: "raw",
        },
      }),
      didcomm: new DidCommModule({
        connections: {
          peerNumAlgoForDidExchangeRequests: peerDidGenesisDoc,
        },
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
        mediationRecipient: {
          mediatorPickupStrategy,
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

    const agent = new Agent({
      config: {
        label: "UNIFY Student Wallet",
        logger: new ConsoleLogger(logLevel),
      },
      dependencies: reactNative.agentDependencies,
      modules,
    });

    await loggedStep("initialize Credo agent", () => agent.initialize());
    await initializeMediator(agent, mediatorInvitationUrl, mediatorPickupStrategy);
    agentRef = agent;
    activeWalletId = config.walletId;
    return agent;
  } catch (error) {
    if (process.env.NODE_ENV === "test") {
      return null;
    }

    throw error;
  }
}

export async function createLocalHolderWallet(): Promise<CreateHolderWalletResult> {
  const walletId = Crypto.randomUUID();
  const agent = await initializeHolderAgent({ walletId });

  return { walletId, agent };
}

export async function resumeHolderAgentSession(walletId: string): Promise<HolderAgent | null> {
  if (agentRef && activeWalletId === walletId) {
    return agentRef;
  }

  return initializeHolderAgent({ walletId });
}

export async function receiveCredentialOffer(invitationUrl: string): Promise<void> {
  if (!agentRef) {
    throw new Error("Wallet has not been created yet.");
  }

  const receiveInvitationFromUrl = agentRef.didcomm?.oob?.receiveInvitationFromUrl;

  if (!receiveInvitationFromUrl) {
    throw new Error("Credo holder agent is missing the OOB receive API.");
  }

  await receiveInvitationFromUrl(invitationUrl, {
    autoAcceptConnection: true,
    autoAcceptInvitation: true,
    label: "UNIFY Student Wallet",
  });
}

export async function acceptCredentialOffer(credentialRecordId: string): Promise<void> {
  if (!agentRef) {
    throw new Error("Wallet has not been created yet.");
  }

  const acceptOffer = agentRef.didcomm?.credentials?.acceptOffer;

  if (!acceptOffer) {
    throw new Error("Credo holder agent is missing the credentials API.");
  }

  await acceptOffer({ credentialRecordId });
}

export async function declineCredentialOffer(credentialRecordId: string): Promise<void> {
  if (!agentRef) {
    throw new Error("Wallet has not been created yet.");
  }

  const declineOffer = agentRef.didcomm?.credentials?.declineOffer;

  if (!declineOffer) {
    throw new Error("Credo holder agent is missing the credentials API.");
  }

  await declineOffer(credentialRecordId);
}

export async function getCredentialRecord(credentialRecordId: string): Promise<CredentialRecord | null> {
  if (!agentRef) {
    return null;
  }

  const getById = agentRef.didcomm?.credentials?.getById;

  if (!getById) {
    return null;
  }

  return getById(credentialRecordId);
}

export type CredentialOfferReceivedHandler = (record: CredentialRecord) => void;

export function subscribeToOfferReceived(handler: CredentialOfferReceivedHandler): () => void {
  if (!agentRef?.events?.on) {
    return () => undefined;
  }

  const on = agentRef.events.on;
  const off = agentRef.events.off;
  const eventType = "DidCommCredentialStateChanged";
  const listener = (event: unknown) => {
    const payload = (event as { payload?: { credentialExchangeRecord?: CredentialRecord; previousState?: string | null } })
      ?.payload;
    const record = payload?.credentialExchangeRecord;

    if (record && record.state === "offer-received") {
      handler(record);
    }
  };

  on.call(agentRef.events, eventType, listener);

  return () => {
    if (off && agentRef?.events) {
      off.call(agentRef.events, eventType, listener);
    }
  };
}
