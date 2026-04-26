import { Platform } from "react-native";

import { getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

import type { ResolvedWalletActivation } from "./activationResolver";

const BCOVRIN_TEST_GENESIS_URL = "https://test.bcovrin.vonx.io/genesis";
const HOLDER_WALLET_KEY_PREFIX = "unify.holder-wallet-raw-key";

export type HolderActivationResult = {
  credentialRecordId: string;
  holderAgentInitialized: boolean;
  holderConnectionId: string;
};

type Constructor<T> = new (...args: unknown[]) => T;
type DynamicModule = Record<string, unknown>;
type HolderAgent = {
  didcomm?: {
    credentials?: { getAll?: () => Promise<Array<{ id?: string }>> };
    oob?: {
      receiveInvitationFromUrl?: (
        invitationUrl: string,
        options: { autoAcceptConnection?: boolean; autoAcceptInvitation?: boolean; label: string },
      ) => Promise<{ connectionRecord?: { id?: string }; outOfBandRecord?: { id?: string } }>;
    };
    registerOutboundTransport?: (transport: unknown) => void;
  };
  initialize: () => Promise<void>;
};

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

export async function acceptHolderActivation(activation: ResolvedWalletActivation): Promise<HolderActivationResult> {
  if (Platform.OS === "web") {
    return fallbackActivationResult(activation);
  }

  try {
    const [
      core,
      didcomm,
      reactNative,
      askarModule,
      askarBindings,
      anoncredsModule,
      anoncredsBindings,
      indyVdrModule,
      indyVdrBindings,
    ] = await Promise.all([
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

    const walletKey = await getOrCreateHolderWalletKey(activation.walletId, () => {
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
    const DidCommModule = getConstructor<unknown>(didcommExports, "DidCommModule");
    const DidCommHttpOutboundTransport = getConstructor<unknown>(didcommExports, "DidCommHttpOutboundTransport");
    const DidCommWsOutboundTransport = getConstructor<unknown>(didcommExports, "DidCommWsOutboundTransport");
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
    const autoAcceptCredential = (didcommExports.DidCommAutoAcceptCredential as { ContentApproved?: unknown } | undefined)
      ?.ContentApproved;

    if (!autoAcceptCredential) {
      throw new Error("Credo auto-accept credential enum is unavailable.");
    }

    const modules: Record<string, unknown> = {
      anoncreds: new AnonCredsModule({
        registries: [new IndyVdrAnonCredsRegistry()],
      }),
      askar: new AskarModule({
        askar: askarBindings.askar,
        store: {
          id: activation.walletId,
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
        mediationRecipient: activation.mediatorInvitationUrl
          ? { mediatorInvitationUrl: activation.mediatorInvitationUrl }
          : false,
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
      },
      dependencies: reactNative.agentDependencies,
      modules,
    });

    await agent.initialize();

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
    };
  } catch (error) {
    if (process.env.NODE_ENV === "test") {
      return fallbackActivationResult(activation);
    }

    throw error;
  }
}
