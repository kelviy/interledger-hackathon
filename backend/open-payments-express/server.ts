import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import {
  createIncomingPayment,
  createOutgoingPayment,
  createQuote,
  getAuthenticatedClient,
  createOutgoingPaymentPendingGrant,
  getWalletAddressInfo,
  processSubscriptionPayment,
} from "./open-payments";
import session from "express-session";

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
  }),
);

type PaymentFlow = {
  senderWalletAddress: string;
  quoteId: string;
  continueAccessToken: string;
  continueUri: string;
};

declare module "express-session" {
  interface SessionData {
    paymentFlow?: PaymentFlow;
  }
}

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "./public")));

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "/index.html"));
});

// Add Custom Payments
app.get("/payment", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "/payment.html"));
});

app.post("/api/payment", async (req: Request, res: Response): Promise<any> => {
  const { senderWalletAddress, receiverWalletAddress, amount } = req.body;
  if (!senderWalletAddress || !receiverWalletAddress || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // 1) Authenticate
  const client = await getAuthenticatedClient();
  console.log(client);
  if (!client) {
    return res.status(500).json({ error: "Could not initialize client" });
  }

  // 2) Incoming payment
  const { walletAddressDetails: recvDetails } = await getWalletAddressInfo(
    client,
    receiverWalletAddress,
  );
  const incoming = await createIncomingPayment(client, amount, recvDetails);

  // 3) Quote
  const { walletAddressDetails: sendDetails } = await getWalletAddressInfo(
    client,
    senderWalletAddress,
  );
  const quote = await createQuote(client, incoming.id, sendDetails);

  // 4) Pending grant
  const auth = await createOutgoingPaymentPendingGrant(
    client,
    { debitAmount: quote.debitAmount },
    sendDetails,
  );
  if (!auth) {
    return res
      .status(500)
      .json({ error: "Failed to get pending grant from auth server" });
  }

  // 5) Store everything you’ll need in the callback
  req.session.paymentFlow = {
    senderWalletAddress,
    quoteId: quote.id,
    continueAccessToken: auth.continue.access_token.value,
    continueUri: auth.continue.uri,
  };

  res.redirect(auth.interact.redirect);
});

app.get("/api/payment-auth", async (req, res): Promise<any> => {
  const interactRef = req.query.interact_ref as string;
  if (!interactRef) {
    return res.status(400).send("Missing interact_ref");
  }

  // Pull your pending state back out of the session
  const flow = req.session.paymentFlow;
  if (!flow) {
    return res.status(400).send("No pending payment flow in session");
  }

  // Re-init the client
  const client = await getAuthenticatedClient();
  if (!client) {
    return res.status(500).send("Could not init client");
  }

  // Finally call createOutgoingPayment
  const outgoing = await createOutgoingPayment(
    client,
    {
      senderWalletAddress: flow.senderWalletAddress,
      continueAccessToken: flow.continueAccessToken,
      interactRef, // from the auth server callback
      continueUri: flow.continueUri,
      quoteId: flow.quoteId,
    },
    // you can re-fetch sendDetails or stash it in the session if you like
    (await getWalletAddressInfo(client, flow.senderWalletAddress))
      .walletAddressDetails,
  );

  // Done!  You can now show them the result.
  res.json({ data: outgoing });
});

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// ============== ENDPOINTS ==============

app.post(
  "/api/create-incoming-payment",
  async (req: Request, res: Response): Promise<any> => {
    const { senderWalletAddress, receiverWalletAddress, amount } = req.body;

    if (!senderWalletAddress || !receiverWalletAddress || !amount) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please fill in all the required fields",
        received: req.body,
      });
    }

    try {
      // Initialize Open Payments client
      const client = await getAuthenticatedClient();

      // get wallet details
      const { walletAddressDetails } = await getWalletAddressInfo(
        client!,
        receiverWalletAddress,
      );

      // create incoming payment resource
      const incomingPayment = await createIncomingPayment(
        client!,
        amount,
        walletAddressDetails,
      );
      return res.status(200).json({ data: incomingPayment });
    } catch (err: any) {
      console.error("Error creating incoming payment:", err);
      return res
        .status(500)
        .json({ error: "Failed to create incoming payment" });
    }
  },
);

app.post(
  "/api/create-quote",
  async (req: Request, res: Response): Promise<any> => {
    const { senderWalletAddress, incomingPaymentUrl } = req.body;

    if (!senderWalletAddress || !incomingPaymentUrl) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please fill in all the required fields",
        received: req.body,
      });
    }

    try {
      // Initialize Open Payments client
      const client = await getAuthenticatedClient();

      // get wallet details
      const { walletAddressDetails } = await getWalletAddressInfo(
        client!,
        senderWalletAddress,
      );

      // create quote
      const quote = await createQuote(
        client!,
        incomingPaymentUrl,
        walletAddressDetails,
      );
      return res.status(200).json({ data: quote });
    } catch (err: any) {
      console.error("Error creating incoming payment:", err);
      return res
        .status(500)
        .json({ error: "Failed to create incoming payment" });
    }
  },
);

app.post(
  "/api/outgoing-payment-auth",
  async (req: Request, res: Response): Promise<any> => {
    const {
      senderWalletAddress,
      quoteId,
      debitAmount,
      receiveAmount,
      type,
      payments,
      redirectUrl,
      duration,
    } = req.body;

    if (!senderWalletAddress || !quoteId) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please fill in all the required fields",
        received: req.body,
      });
    }

    try {
      // Initialize Open Payments client
      const client = await getAuthenticatedClient();

      // get wallet details
      const { walletAddressDetails } = await getWalletAddressInfo(
        client!,
        senderWalletAddress,
      );

      // get outgoing payment auth actioning details
      const outgoingPaymentAuthResponse =
        await createOutgoingPaymentPendingGrant(
          client!,
          {
            quoteId,
            debitAmount,
            receiveAmount,
            type,
            payments,
            redirectUrl,
            duration,
          },
          walletAddressDetails,
        );
      return res.status(200).json({ data: outgoingPaymentAuthResponse });
    } catch (err: any) {
      console.error("Error creating incoming payment:", err);
      return res
        .status(500)
        .json({ error: "Failed to create incoming payment" });
    }
  },
);

app.post(
  "/api/outgoing-payment",
  async (req: Request, res: Response): Promise<any> => {
    const {
      senderWalletAddress,
      continueAccessToken,
      quoteId,
      interactRef,
      continueUri,
    } = req.body;

    if (!senderWalletAddress || !quoteId) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please fill in all the required fields",
        received: req.body,
      });
    }

    try {
      // Initialize Open Payments client
      const client = await getAuthenticatedClient();

      // get wallet details
      const { walletAddressDetails } = await getWalletAddressInfo(
        client!,
        senderWalletAddress,
      );

      // create outgoing payment resource
      const outgoingPaymentResponse = await createOutgoingPayment(
        client!,
        {
          senderWalletAddress,
          continueAccessToken,
          quoteId,
          interactRef,
          continueUri,
        },
        senderWalletAddress,
      );

      return res.status(200).json({ data: outgoingPaymentResponse });
    } catch (err: any) {
      console.error("Error creating incoming payment:", err);
      return res
        .status(500)
        .json({ error: "Failed to create incoming payment" });
    }
  },
);

app.post(
  "/api/subscription-payment",
  async (req: Request, res: Response): Promise<any> => {
    const { receiverWalletAddress, manageUrl, previousToken } = req.body;

    if (!receiverWalletAddress || !manageUrl) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please fill in all the required fields",
        received: req.body,
      });
    }

    try {
      // Initialize Open Payments client
      const client = await getAuthenticatedClient();

      // create outgoing authorization grant
      const outgoingPaymentResponse = await processSubscriptionPayment(
        client!,
        {
          receiverWalletAddress,
          manageUrl,
          previousToken,
        },
      );

      return res.status(200).json({ data: outgoingPaymentResponse });
    } catch (err: any) {
      console.error("Error creating incoming payment:", err);
      return res
        .status(500)
        .json({ error: "Failed to create incoming payment" });
    }
  },
);
// ============== ERROR HANDLING ==============

// 404
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Endpoint not found",
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: ["GET /", "POST /api/create-incoming-payment"],
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: err.message || "Something went wrong",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log("\n📋 Available endpoints:");
  console.log(
    "  POST   /api/create-incoming-payment  - Create incoming payment resource on receiver account",
  );
  console.log(
    "  POST   /api/create-quote             - Create quote resource on sender account",
  );
  console.log(
    "  POST   /api/outgoing-payment-auth    - Get continuation grant for an outgoing payment on the sender's account",
  );
  console.log(
    "  POST   /api/outgoing-payment         - Create outgoing payment resource on sender's account",
  );
  console.log(
    "  POST   /api/subscription-payment     - Create an outgoing payment from an existing authorized recurring payment",
  );
});

export default app;
