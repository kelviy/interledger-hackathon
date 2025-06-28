import dotenv from "dotenv";
import {
  type WalletAddress,
  type AuthenticatedClient,
  type Grant,
  createAuthenticatedClient,
  type PendingGrant,
  isPendingGrant,
} from "@interledger/open-payments";
import { randomUUID } from "crypto";
import { type components } from "@interledger/open-payments/dist/openapi/generated/auth-server-types";
import { access } from "fs";

dotenv.config({ path: ".env" });

export async function getAuthenticatedClient() {
  let walletAddress = process.env.OPEN_PAYMENTS_CLIENT_ADDRESS;
  let private_key_path = process.env.OPEN_PAYMENTS_SECRET_KEY_PATH;
  let keyId = process.env.OPEN_PAYMENTS_KEY_ID;

  if (walletAddress && walletAddress.startsWith("$")) {
    walletAddress = walletAddress.replace("$", "https://");
  }

  // TODO: create authenticated client object
  let client: AuthenticatedClient | undefined = undefined;

  if (walletAddress && private_key_path && keyId) {
    client = await createAuthenticatedClient({
      walletAddressUrl: walletAddress ?? "",
      privateKey: private_key_path ?? "",
      keyId: keyId ?? "",
    });
  } else {
    console.error("Undefined environment variables:");
    console.log(walletAddress);
    console.log(private_key_path);
    console.log(keyId);
  }

  return client;
}

export async function getWalletAddressInfo(
  client: AuthenticatedClient,
  walletAddress: string,
): Promise<{ walletAddress: string; walletAddressDetails: WalletAddress }> {
  if (walletAddress && walletAddress.startsWith("$")) {
    walletAddress = walletAddress.replace("$", "https://");
  }

  const walletAddressDetails: WalletAddress = await client.walletAddress.get({
    url: walletAddress,
  });

  console.log("<< Wallet address details");
  console.log(walletAddressDetails);

  return { walletAddress, walletAddressDetails };
}

/**
 * The method requests a grant from the receivers auth server for creating an incoming payment grant
 * After receiving the grant the incoming payment resource is created
 *
 * @param client
 * @param value - payment amount to be made
 * @param walletAddressDetails - wallet address details for the receiver
 * @returns
 */
export async function createIncomingPayment(
  client: AuthenticatedClient,
  value: string,
  walletAddressDetails: WalletAddress,
) {
  console.log(">> Creating Incoming Payment Resource");
  console.log(walletAddressDetails);

  // TODO: Request IP grant
  let grant: PendingGrant | Grant | undefined = undefined;

  grant = await client.grant.request(
    {
      url: walletAddressDetails.authServer,
    },
    {
      access_token: {
        access: [
          {
            type: "incoming-payment",
            actions: ["list", "read", "read-all", "complete", "create"],
          },
        ],
      },
    },
  );

  if (grant && isPendingGrant(grant)) {
    throw new Error("Expected non-interactive grant");
  }

  // TODO: create incoming payment
  const access_token = grant.access_token.value;
  const incomingPayment = await client.incomingPayment.create(
    {
      url: new URL(walletAddressDetails.resourceServer).origin,
      accessToken: access_token,
    },
    {
      walletAddress: walletAddressDetails.id,
      incomingAmount: {
        value: value,
        assetCode: walletAddressDetails.assetCode,
        assetScale: walletAddressDetails.assetScale,
      },
      expiresAt: new Date(Date.now() + 60_000 * 10).toISOString(),
    },
  );

  console.log("<< Resource created");
  console.log(incomingPayment);

  return incomingPayment;
}

/**
 * The method requests a grant to create a quote on the senders resource server
 * The quote is then created on the senders resource server
 *
 * @param client
 * @param incomingPaymentUrl - identifier for the incoming payment the quote is being created for
 * @param walletAddressDetails - wallet address details for the sender
 * @returns
 */
export async function createQuote(
  client: AuthenticatedClient,
  incomingPaymentUrl: string,
  walletAddressDetails: WalletAddress,
) {
  console.log(">> Creating quoute");
  console.log(walletAddressDetails);

  // TODO: Request Quote grant
  const grant = await client.grant.request(
    {
      url: walletAddressDetails.authServer,
    },
    {
      access_token: {
        access: [
          {
            type: "quote",
            actions: ["create", "read", "read-all"],
          },
        ],
      },
    },
  );

  if (grant && isPendingGrant(grant)) {
    throw new Error("Expected non-interactive grant");
  }

  // TODO: create quote
  const quote = await client.quote.create(
    {
      url: new URL(walletAddressDetails.resourceServer).origin,
      accessToken: grant.access_token.value,
    },
    {
      method: "ilp",
      walletAddress: walletAddressDetails.id,
      receiver: incomingPaymentUrl,
    },
  );

  console.log("<< Quote created");
  console.log(quote);

  return quote;
}

/**
 * This method creates a pending grant which must be authorized by the user
 * After it is authorized the continuation access token we receive can be used to get the actual OP creation grant
 * Tells the client to go ask sender for approval and details of where to come back to continue the process
 *
 * @param client
 * @param input - details from the quote
 * @param walletAddressDetails - wallet address details for the sender
 * @returns
 */
export async function createOutgoingPaymentPendingGrant(
  client: AuthenticatedClient,
  input: any,
  walletAddressDetails: WalletAddress,
): Promise<PendingGrant | undefined> {
  console.log(">> Getting link to authorize outgoing payment grant request");
  console.log(walletAddressDetails);

  const dateNow = new Date().toISOString();
  const debitAmount = input.debitAmount;
  // const receiveAmount = input.receiveAmount;

  // TODO: Request outgoing payment pending grant
  // let interval = `R100/${dateNow}/P1D`; // 1 day interval

  const grant = await client.grant.request(
    {
      url: walletAddressDetails.authServer,
    },
    {
      access_token: {
        access: [
          {
            identifier: walletAddressDetails.id,
            type: "outgoing-payment",
            actions: ["list", "list-all", "read", "read-all", "create"],
            limits: {
              // interval: interval,
              // receiveAmount,
              debitAmount:{
                "value":"100000",
                "assetCode":"EUR",
                "assetScale":2
              },
            },
          },
        ],
      },
      interact: {
        start: ["redirect"],
        finish: {
          method: "redirect",
          uri: "http://localhost:3001/api/payment-auth/",
          nonce: randomUUID(),
        },
      },
    },
  );

  if (grant && !isPendingGrant(grant)) {
    throw new Error("Expected interactive grant");
  }

  console.log("<< Pending outgoing grant obtained");
  return grant;
}

/**
 * This method will now get the grant if the user has given permission
 * The grant is then used to create the outgoing payment
 *
 * @param client
 * @param input
 * @param walletAddressDetails - wallet address details for the sender
 * @returns
 */
export async function createOutgoingPayment(
  client: AuthenticatedClient,
  input: any,
  // walletAddressDetails: WalletAddress,
) {
  let walletAddress = input.senderWalletAddress;
  let accessToken = input.accessToken;
  let manageUrl = input.manageUrl;
  let receiverWalletAddress = input.receiver_wallet;

  if (walletAddress.startsWith("$")) {
    walletAddress = walletAddress.replace("$", "https://");
  }

  console.log(">> Creating outgoing payment");
  console.log(input);

  // TODO: Get the grant since it was still pending
  if (input.continueUri) {
    const grant: PendingGrant | Grant | undefined = (await client.grant.continue(
      {
        accessToken: input.continueAccessToken,
        url: input.continueUri,
      },
      {
        interact_ref: input.interactRef,
      },
    )) as Grant;
    accessToken = grant.access_token.value;
    manageUrl = grant.access_token.manage;

    const outgoingPayment = await client.outgoingPayment.create(
    // hardcoded access_token
    {
      url: new URL(walletAddress).origin,
      accessToken: accessToken, // OUTGOING_PAYMENT_ACCESS_TOKEN,
      // accessToken: access_token,
    },
    {
      walletAddress: walletAddress,
      incomingPayment: input.incomingPayment, // This is incomming payment URL
      // quoteId: input.quoteId,
      quoteId: input.quote_id,
      // debitAmount: input.debitAmount, // This is from quote
    },
  );
    console.log("<< Outgoing payment created");
    console.log(outgoingPayment);
    console.log(accessToken);
    console.log(manageUrl);

    return [outgoingPayment, accessToken, manageUrl];
  } else {
    // If no continueUri is provided, we assume the accessToken is already available
    console.log("No continueUri provided, rotating access token");
    
 
    // create outgoing authorization grant
    const outgoingPaymentResponse = await processSubscriptionPayment(
      client!,
      {
        receiverWalletAddress,
        manageUrl,
        accessToken,
        amount:input.amount,
      },
    );
    
    accessToken = outgoingPaymentResponse[1];
    manageUrl = outgoingPaymentResponse[2];

      console.log("<< Outgoing payment created");
      console.log(outgoingPaymentResponse);
      console.log(accessToken);
      console.log(manageUrl);

      return [outgoingPaymentResponse, accessToken, manageUrl];
  }
  

  // console.log("<< Outgoing payment grant");
  // console.log(grant);

  // if (grant && isPendingGrant(grant)) {
  //   throw new Error("Expected non-interactive grant");
  // }

  // TODO: create outgoing payment

  // hardcoded value
  // let access_token = "1149E4164D0F358C2804";
  // let manage_url =
  //   "https://auth.interledger-test.dev/token/f1e055e9-3b7f-4201-864f-0d1b30ac107d";
}

/**
 * This method creates an outgoing payment for a recurring payment
 *
 * @param client
 * @param input
 * @returns
 */
export async function processSubscriptionPayment(
  client: AuthenticatedClient,
  input: any,
) {
  // rotate the token
  const token = await client.token.rotate({
    url: input.manageUrl,
    accessToken: input.previousToken,
  });

  if (!token.access_token) {
    console.error("!! Failed to rotate token.");
  }

  console.log("<< Rotated Token ");
  console.log(token.access_token);

  const tokenAccessDetails = token.access_token.access as {
    type: "outgoing-payment";
    actions: ("create" | "read" | "read-all" | "list" | "list-all")[];
    identifier: string;
    limits?: components["schemas"]["limits-outgoing"];
  }[];

  // const receiveAmount = (tokenAccessDetails[0].limits as any).receiveAmount
  //   ?.value;

  const { walletAddressDetails: receiverWalletAddressDetails } =
    await getWalletAddressInfo(client, input.receiverWalletAddress);

  const {
    walletAddress: senderWalletAddress,
    walletAddressDetails: senderWalletAddressDetails,
  } = await getWalletAddressInfo(
    client,
    tokenAccessDetails[0]?.identifier ?? "",
  );

  // create incoming payment
  const incomingPayment = await createIncomingPayment(
    client,
    input.amount,
    receiverWalletAddressDetails,
  );

  // create quote
  const quote = await createQuote(
    client,
    incomingPayment.id,
    senderWalletAddressDetails,
  );

  // create outgoing payment
  try {
    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: new URL(senderWalletAddress).origin,
        accessToken: token.access_token.value, //OUTGOING_PAYMENT_ACCESS_TOKEN,
      },
      {
        walletAddress: senderWalletAddress,
        quoteId: quote.id, //QUOTE_URL,
      },
    );

    return [outgoingPayment, token.access_token.value, token.access_token.manage];
  } catch (error) {
    console.log(error);
    throw new Error("Error creating subscription outgoing payment");
  }
}
