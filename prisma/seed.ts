/**
 * Demo seed — fictitious data only.
 * Allowed only when NODE_ENV=development or ALLOW_DEMO_SEED=true / APP_ENV=demo.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient, type Prisma } from "@prisma/client";

import { hashPassword } from "../src/server/auth/password";
import { encryptWalletSecret } from "../src/server/crypto/wallet-secrets";

const prisma = new PrismaClient();

function assertSeedAllowed() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const appEnv = process.env.APP_ENV ?? "";
  const allow = process.env.ALLOW_DEMO_SEED === "true";

  if (nodeEnv === "production" && appEnv !== "demo" && !allow) {
    throw new Error(
      "Demo seed blocked: set APP_ENV=demo or ALLOW_DEMO_SEED=true to seed a demo environment",
    );
  }

  if (nodeEnv !== "development" && appEnv !== "demo" && !allow) {
    throw new Error(
      "Demo seed blocked outside development unless APP_ENV=demo or ALLOW_DEMO_SEED=true",
    );
  }
}

async function main() {
  assertSeedAllowed();

  if (!process.env.WALLET_ENCRYPTION_KEY) {
    // Deterministic local-only demo key (32 bytes hex) — not for production.
    process.env.WALLET_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  }

  const demoEmail = "merchant.demo@satspilot.local";
  const demoPassword = process.env.DEMO_SEED_PASSWORD ?? "DemoMerchant1!";

  console.log("Seeding fictitious demo merchant data…");

  const passwordHash = await hashPassword(demoPassword);

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { name: "Demo Merchant", passwordHash },
    create: {
      email: demoEmail,
      name: "Demo Merchant",
      passwordHash,
    },
  });

  let merchant = await prisma.merchant.findFirst({
    where: { name: "Marché Keur Demo", memberships: { some: { userId: user.id } } },
  });

  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        name: "Marché Keur Demo",
        displayCurrency: "XOF",
        locale: "fr",
        city: "Dakar",
        phone: "+221 77 000 0000",
        status: "ACTIVE",
        memberships: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });
  } else {
    await prisma.merchantMembership.upsert({
      where: {
        userId_merchantId: { userId: user.id, merchantId: merchant.id },
      },
      update: { role: "OWNER" },
      create: { userId: user.id, merchantId: merchant.id, role: "OWNER" },
    });
  }

  // Second merchant for cross-tenant authz tests (no membership for demo user).
  let otherMerchant = await prisma.merchant.findFirst({
    where: { name: "Other Merchant Isolation" },
  });
  if (!otherMerchant) {
    otherMerchant = await prisma.merchant.create({
      data: {
        name: "Other Merchant Isolation",
        displayCurrency: "XOF",
        locale: "en",
        city: "Abidjan",
        status: "ACTIVE",
      },
    });
  }

  await prisma.product.deleteMany({ where: { merchantId: merchant.id } });
  await prisma.product.createMany({
    data: [
      {
        merchantId: merchant.id,
        name: "Bottled water 1.5L",
        unitPriceMinor: 500,
        currency: "XOF",
        category: "Drinks",
        active: true,
      },
      {
        merchantId: merchant.id,
        name: "Bread loaf",
        unitPriceMinor: 300,
        currency: "XOF",
        category: "Bakery",
        active: true,
      },
      {
        merchantId: merchant.id,
        name: "Phone credit 1000",
        unitPriceMinor: 1000,
        currency: "XOF",
        category: "Services",
        active: true,
      },
    ],
  });

  const products = await prisma.product.findMany({
    where: { merchantId: merchant.id },
  });

  await prisma.customerLedgerEntry.deleteMany({
    where: { merchantId: merchant.id },
  });
  await prisma.customer.deleteMany({ where: { merchantId: merchant.id } });

  const customerA = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      name: "Awa Diop",
      phone: "+221 77 111 0001",
    },
  });
  const customerB = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      name: "Ibrahima Ndiaye",
      phone: "+221 77 111 0002",
    },
  });

  await prisma.customerLedgerEntry.createMany({
    data: [
      {
        merchantId: merchant.id,
        customerId: customerA.id,
        entryType: "DEBIT",
        amountMinor: 2500,
        currency: "XOF",
        note: "Tab opening (demo)",
      },
      {
        merchantId: merchant.id,
        customerId: customerB.id,
        entryType: "DEBIT",
        amountMinor: 1200,
        currency: "XOF",
        note: "Tab opening (demo)",
      },
    ],
  });

  await prisma.saleItem.deleteMany({
    where: { sale: { merchantId: merchant.id } },
  });
  await prisma.payment.deleteMany({ where: { merchantId: merchant.id } });
  await prisma.sale.deleteMany({ where: { merchantId: merchant.id } });
  await prisma.expense.deleteMany({ where: { merchantId: merchant.id } });
  await prisma.walletConnection.deleteMany({
    where: { merchantId: merchant.id },
  });

  const water = products.find((p) => p.name.includes("water")) ?? products[0];
  const now = new Date();

  const saleTotal = water.unitPriceMinor * 2;
  const sale = await prisma.sale.create({
    data: {
      merchantId: merchant.id,
      customerId: customerA.id,
      status: "FINALIZED",
      paymentState: "PAID",
      currency: "XOF",
      totalMinor: saleTotal,
      amountPaidMinor: saleTotal,
      paymentMethod: "CASH",
      finalizedAt: now,
      idempotencyKey: `seed-sale-${merchant.id}-1`,
      items: {
        create: [
          {
            productId: water.id,
            productName: water.name,
            quantity: 2,
            unitPriceMinor: water.unitPriceMinor,
            lineTotalMinor: saleTotal,
            currency: "XOF",
          },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      merchantId: merchant.id,
      saleId: sale.id,
      customerId: customerA.id,
      status: "SETTLED",
      kind: "SALE_PAYMENT",
      method: "CASH",
      description: "Cash sale (seed)",
      amountFiatMinor: sale.totalMinor,
      fiatCurrency: "XOF",
      idempotencyKey: `seed-pay-${merchant.id}-1`,
      settledAt: now,
    },
  });

  // Partial-credit example sale
  const bread = products.find((p) => p.name.includes("Bread")) ?? products[1];
  const creditTotal = bread.unitPriceMinor * 3;
  const creditPaid = bread.unitPriceMinor;
  const creditSale = await prisma.sale.create({
    data: {
      merchantId: merchant.id,
      customerId: customerB.id,
      status: "FINALIZED",
      paymentState: "PARTIALLY_PAID",
      currency: "XOF",
      totalMinor: creditTotal,
      amountPaidMinor: creditPaid,
      paymentMethod: "CREDIT",
      finalizedAt: now,
      idempotencyKey: `seed-sale-${merchant.id}-2`,
      items: {
        create: [
          {
            productId: bread.id,
            productName: bread.name,
            quantity: 3,
            unitPriceMinor: bread.unitPriceMinor,
            lineTotalMinor: creditTotal,
            currency: "XOF",
          },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      merchantId: merchant.id,
      saleId: creditSale.id,
      customerId: customerB.id,
      status: "SETTLED",
      kind: "SALE_PAYMENT",
      method: "CASH",
      description: "Partial cash on credit sale (seed)",
      amountFiatMinor: creditPaid,
      fiatCurrency: "XOF",
      idempotencyKey: `seed-pay-${merchant.id}-2`,
      settledAt: now,
    },
  });

  await prisma.customerLedgerEntry.create({
    data: {
      merchantId: merchant.id,
      customerId: customerB.id,
      entryType: "DEBIT",
      amountMinor: creditTotal - creditPaid,
      currency: "XOF",
      relatedSaleId: creditSale.id,
      note: "Unpaid portion of credit sale (seed)",
    },
  });

  await prisma.expense.create({
    data: {
      merchantId: merchant.id,
      category: "Transport",
      description: "Market delivery (seed)",
      amountMinor: 2000,
      currency: "XOF",
      occurredOn: now,
      idempotencyKey: `seed-expense-${merchant.id}-1`,
    },
  });

  // Encrypted placeholder — never a real NWC URI / seed.
  const encrypted = encryptWalletSecret(
    "demo-nwc-placeholder://not-a-real-connection",
  );

  await prisma.walletConnection.create({
    data: {
      merchantId: merchant.id,
      provider: "NWC",
      label: "Demo NWC (encrypted at rest)",
      status: "DISCONNECTED",
      encryptedPayload: encrypted.ciphertext,
      encryptionIv: encrypted.iv,
      encryptionTag: encrypted.tag,
      encryptionKeyVersion: encrypted.keyVersion,
      lastCheckedAt: now,
    },
  });

  // Isolation fixture product on other merchant
  await prisma.product.deleteMany({ where: { merchantId: otherMerchant.id } });
  await prisma.product.create({
    data: {
      merchantId: otherMerchant.id,
      name: "Secret other-merchant product",
      unitPriceMinor: 999,
      currency: "XOF",
      active: true,
    },
  });

  const auditData: Prisma.AuditEventCreateInput = {
    action: "seed.completed",
    resourceType: "system",
    merchant: { connect: { id: merchant.id } },
    actor: { connect: { id: user.id } },
    metadata: { fictitious: true },
  };
  await prisma.auditEvent.create({ data: auditData });

  console.log("Seed complete.");
  console.log(`  Demo login: ${demoEmail}`);
  console.log("  Password: (DEMO_SEED_PASSWORD or default DemoMerchant1!)");
  console.log(`  Merchant: ${merchant.name} (${merchant.id})`);
  console.log(`  Isolation merchant: ${otherMerchant.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
