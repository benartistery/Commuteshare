# CommuteShare Token (COST) - Solana Deployment Guide

This comprehensive guide will walk you through creating, testing, and deploying the COST token on the Solana blockchain.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Setting Up Solana CLI](#setting-up-solana-cli)
3. [Creating Your Wallet](#creating-your-wallet)
4. [Devnet Testing (Recommended First)](#devnet-testing)
5. [Creating the COST Token](#creating-the-cost-token)
6. [Minting Tokens](#minting-tokens)
7. [Token Metadata (Optional but Recommended)](#token-metadata)
8. [Mainnet Deployment](#mainnet-deployment)
9. [Integrating with CommuteShare App](#integrating-with-commuteshare-app)
10. [Token Economics](#token-economics)
11. [Security Best Practices](#security-best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- **Operating System:** macOS, Linux, or Windows (WSL recommended)
- **Node.js:** v16 or higher
- **Basic command line knowledge**
- **SOL tokens:** For transaction fees (we'll get free devnet SOL for testing)

### Hardware Requirements
- At least 4GB RAM
- 10GB free disk space
- Stable internet connection

---

## Setting Up Solana CLI

### Step 1: Install Solana CLI Tools

**For macOS/Linux:**
```bash
# Download and install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Add to PATH (add this to your ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Reload shell configuration
source ~/.bashrc  # or source ~/.zshrc
```

**For Windows (using WSL):**
```bash
# First install WSL if you haven't
wsl --install

# Then in WSL terminal, run the same commands as Linux
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
```

### Step 2: Verify Installation
```bash
solana --version
# Expected output: solana-cli 1.18.x

solana-keygen --version
# Expected output: solana-keygen 1.18.x
```

### Step 3: Install SPL Token CLI
```bash
# Install using cargo (Rust package manager)
cargo install spl-token-cli

# Or download pre-built binary
# Visit: https://github.com/solana-labs/solana-program-library/releases
```

If you don't have Rust/Cargo installed:
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Restart terminal, then install spl-token-cli
cargo install spl-token-cli
```

---

## Creating Your Wallet

### Step 1: Generate a New Keypair (Wallet)

```bash
# Create a new wallet for token operations
solana-keygen new --outfile ~/commuteshare-token-wallet.json

# You'll see output like:
# Wrote new keypair to /home/user/commuteshare-token-wallet.json
# ================================================================================
# pubkey: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
# ================================================================================
# Save this seed phrase and your BIP39 passphrase to recover your new keypair:
# abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
# ================================================================================
```

⚠️ **CRITICAL: Save your seed phrase securely!** Write it down on paper and store in a safe place. Never share it with anyone.

### Step 2: Set as Default Wallet
```bash
solana config set --keypair ~/commuteshare-token-wallet.json
```

### Step 3: View Your Wallet Address
```bash
solana address
# This displays your public wallet address
```

---

## Devnet Testing

**Always test on devnet first before deploying to mainnet!**

### Step 1: Connect to Devnet
```bash
solana config set --url devnet

# Verify configuration
solana config get
# Expected output should show:
# RPC URL: https://api.devnet.solana.com
```

### Step 2: Get Free Devnet SOL
```bash
# Request airdrop (free test SOL)
solana airdrop 2

# Check balance
solana balance
# Should show: 2 SOL
```

If airdrop fails (rate limited), try:
```bash
# Use alternative faucet
solana airdrop 1 --url https://api.devnet.solana.com

# Or visit: https://faucet.solana.com/
# Paste your wallet address to receive devnet SOL
```

---

## Creating the COST Token

### Step 1: Create the Token Mint

```bash
# Create new SPL token with 9 decimals (standard for Solana tokens)
spl-token create-token --decimals 9

# Output will show:
# Creating token <TOKEN_MINT_ADDRESS>
# Signature: <transaction_signature>
#
# Address: <TOKEN_MINT_ADDRESS>  <-- SAVE THIS! This is your COST token address
```

**Example output:**
```
Creating token 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Signature: 5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFG48jj
Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Decimals: 9
```

📝 **Write down your Token Mint Address!** You'll need it for the app integration.

### Step 2: Create Token Account

```bash
# Create an account to hold your tokens
spl-token create-account <TOKEN_MINT_ADDRESS>

# Example:
spl-token create-account 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

### Step 3: Verify Token Creation
```bash
# View token info
spl-token display <TOKEN_MINT_ADDRESS>

# List all your tokens
spl-token accounts
```

---

## Minting Tokens

### Step 1: Mint Initial Supply

For COST token, we'll mint 1 billion tokens (as specified in the app):

```bash
# Mint 1,000,000,000 COST tokens
spl-token mint <TOKEN_MINT_ADDRESS> 1000000000

# Example:
spl-token mint 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 1000000000

# Output:
# Minting 1000000000 tokens
# Token: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
# Recipient: <YOUR_TOKEN_ACCOUNT>
```

### Step 2: Verify Minted Supply
```bash
# Check total supply
spl-token supply <TOKEN_MINT_ADDRESS>
# Should show: 1000000000

# Check your balance
spl-token balance <TOKEN_MINT_ADDRESS>
# Should show: 1000000000
```

### Step 3: (Optional) Disable Future Minting

To make the token supply fixed (no more tokens can ever be created):

```bash
# Remove mint authority - THIS IS IRREVERSIBLE!
spl-token authorize <TOKEN_MINT_ADDRESS> mint --disable

# Verify mint is disabled
spl-token display <TOKEN_MINT_ADDRESS>
# Should show: Mint authority: (not set)
```

⚠️ **Warning:** Only disable minting when you're sure about the final supply!

---

## Token Metadata

Adding metadata makes your token appear properly in wallets and explorers.

### Step 1: Install Metaboss (Metadata Tool)

```bash
# Using cargo
cargo install metaboss

# Or download from releases:
# https://github.com/samuelvanderwaal/metaboss/releases
```

### Step 2: Create Metadata JSON

Create a file called `cost-token-metadata.json`:

```json
{
  "name": "CommuteShare Token",
  "symbol": "COST",
  "description": "The native utility token of the CommuteShare platform. Use COST for discounts on marketplace, food delivery, and services.",
  "image": "https://your-domain.com/cost-token-logo.png",
  "external_url": "https://commuteshare.com",
  "attributes": [
    {
      "trait_type": "Category",
      "value": "Utility Token"
    },
    {
      "trait_type": "Platform",
      "value": "CommuteShare"
    }
  ]
}
```

### Step 3: Upload Metadata to IPFS/Arweave

**Option A: Using NFT.Storage (Free)**
1. Go to https://nft.storage/
2. Create account and upload your JSON file
3. Copy the IPFS URL (e.g., `ipfs://bafkreif...`)

**Option B: Using Arweave (Permanent)**
```bash
# Install arkb
npm install -g arkb

# Upload (requires AR tokens)
arkb deploy cost-token-metadata.json
```

### Step 4: Add Metadata to Token

```bash
# Using Metaboss
metaboss create metadata \
  --keypair ~/commuteshare-token-wallet.json \
  --mint <TOKEN_MINT_ADDRESS> \
  --metadata <METADATA_URI>
```

---

## Mainnet Deployment

⚠️ **Only proceed after thorough testing on devnet!**

### Step 1: Switch to Mainnet

```bash
solana config set --url mainnet-beta
```

### Step 2: Fund Your Wallet with Real SOL

You need real SOL to pay for transaction fees:

**Option A: Buy from Exchange**
1. Create account on Coinbase, Binance, or FTX
2. Buy SOL (approximately 0.5 SOL should be enough)
3. Withdraw to your wallet address

**Option B: Use Moonpay/Transak**
1. Visit https://www.moonpay.com/
2. Buy SOL directly to your wallet

### Step 3: Create Mainnet Token

```bash
# Verify you're on mainnet
solana config get

# Check balance (need ~0.1 SOL for token creation)
solana balance

# Create the token
spl-token create-token --decimals 9

# Create token account
spl-token create-account <NEW_MAINNET_TOKEN_ADDRESS>

# Mint supply
spl-token mint <NEW_MAINNET_TOKEN_ADDRESS> 1000000000
```

### Step 4: Verify on Solscan

Visit: `https://solscan.io/token/<YOUR_TOKEN_ADDRESS>`

You should see:
- Token name (if metadata added)
- Total supply
- Holder count
- Transaction history

---

## Integrating with CommuteShare App

### Step 1: Update Environment Variable

Edit `/app/backend/.env`:

```bash
# For Devnet (Testing)
SOLANA_NETWORK=devnet
COST_TOKEN_MINT=<YOUR_DEVNET_TOKEN_ADDRESS>

# For Mainnet (Production)
# SOLANA_NETWORK=mainnet-beta
# COST_TOKEN_MINT=<YOUR_MAINNET_TOKEN_ADDRESS>
```

### Step 2: Restart Backend

```bash
sudo supervisorctl restart backend
```

### Step 3: Verify Integration

```bash
# Test the token info endpoint
curl http://localhost:8001/api/token/info

# Should return your token address
```

### Step 4: Update Frontend (Optional)

The frontend automatically fetches token info from the backend. No changes needed unless you want to add direct blockchain integration.

For real wallet integration (advanced), you would use:
```javascript
// In frontend, install Solana web3
// yarn add @solana/web3.js @solana/spl-token

import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getMint } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com');
const mintAddress = new PublicKey('YOUR_TOKEN_MINT_ADDRESS');

// Get token info
const mintInfo = await getMint(connection, mintAddress);
console.log('Supply:', mintInfo.supply.toString());
```

---

## Token Economics

### Recommended Distribution for COST Token

| Allocation | Percentage | Amount | Purpose |
|------------|------------|--------|---------|
| Platform Rewards | 40% | 400M | User rewards, welcome bonuses |
| Team & Development | 20% | 200M | Team allocation (vested) |
| Marketing | 15% | 150M | Promotions, partnerships |
| Reserve | 15% | 150M | Future development |
| Initial Liquidity | 10% | 100M | DEX liquidity pools |

### Vesting Schedule (Recommended)

- **Team tokens:** 4-year vesting, 1-year cliff
- **Advisor tokens:** 2-year vesting, 6-month cliff
- **Marketing:** Released quarterly based on milestones

### Creating Token Accounts for Distribution

```bash
# Create account for rewards pool
spl-token create-account <TOKEN_MINT_ADDRESS> --owner <REWARDS_WALLET>

# Transfer tokens to rewards pool
spl-token transfer <TOKEN_MINT_ADDRESS> 400000000 <REWARDS_WALLET>
```

---

## Security Best Practices

### 1. Wallet Security

```bash
# Backup your keypair securely
cp ~/commuteshare-token-wallet.json ~/backup/secure-location/

# Never commit keypairs to git!
echo "*.json" >> .gitignore
```

### 2. Multi-Signature Wallets (Recommended for Mainnet)

For production, use a multi-sig wallet:

```bash
# Install Squads CLI (multi-sig solution)
npm install -g @sqds/cli

# Create multi-sig
squads create --threshold 2 --members <MEMBER1>,<MEMBER2>,<MEMBER3>
```

### 3. Freeze Authority

Keep freeze authority for emergency situations:

```bash
# Freeze a malicious account
spl-token freeze <TOKEN_ACCOUNT_ADDRESS>

# Unfreeze
spl-token thaw <TOKEN_ACCOUNT_ADDRESS>
```

### 4. Regular Audits

- Audit smart contracts before mainnet
- Monitor token transfers regularly
- Set up alerts for large transactions

---

## Troubleshooting

### Common Issues

**1. "Insufficient funds for transaction"**
```bash
# Get more SOL
solana airdrop 1  # devnet only

# Or check balance
solana balance
```

**2. "Account not found"**
```bash
# Create token account first
spl-token create-account <TOKEN_MINT_ADDRESS>
```

**3. "RPC rate limit exceeded"**
```bash
# Use different RPC endpoint
solana config set --url https://api.devnet.solana.com

# Or use a private RPC (Helius, QuickNode)
solana config set --url https://your-rpc-endpoint.com
```

**4. "Transaction simulation failed"**
```bash
# Check if you have enough SOL for fees
solana balance

# Retry with higher priority fee
spl-token transfer <TOKEN> <AMOUNT> <RECIPIENT> --with-compute-unit-price 1000
```

### Getting Help

- **Solana Discord:** https://discord.gg/solana
- **Stack Exchange:** https://solana.stackexchange.com/
- **Documentation:** https://docs.solana.com/

---

## Quick Reference Commands

```bash
# Check Solana configuration
solana config get

# Check wallet balance
solana balance

# Check token balance
spl-token balance <TOKEN_MINT>

# Check token supply
spl-token supply <TOKEN_MINT>

# List all token accounts
spl-token accounts

# Transfer tokens
spl-token transfer <TOKEN_MINT> <AMOUNT> <RECIPIENT_ADDRESS>

# View token info
spl-token display <TOKEN_MINT>
```

---

## Next Steps After Deployment

1. ✅ **Create token on devnet** - Test all functionality
2. ✅ **Add metadata** - Make token recognizable
3. ✅ **Deploy to mainnet** - When ready for production
4. ⬜ **Add liquidity** - List on Raydium or Orca DEX
5. ⬜ **Marketing** - Announce token launch
6. ⬜ **Integrate payments** - Real wallet transactions in app

---

## Support

If you encounter issues with this guide or the CommuteShare platform:

- **GitHub Issues:** https://github.com/benartistery/Commuteshare/issues
- **Documentation:** Check the `/app/docs` folder for more guides

---

*Last updated: December 2025*
*Guide version: 1.0*
