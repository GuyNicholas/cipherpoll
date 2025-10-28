# CipherPoll 🔐

A privacy-preserving survey platform built on FHEVM (Fully Homomorphic Encryption Virtual Machine) that enables completely private surveys with verifiable aggregate statistics.

## 🌟 Features

- **Complete Privacy**: Individual responses are encrypted on-chain using FHEVM
- **Aggregate Statistics**: Survey creators can decrypt aggregate results without seeing individual responses
- **Three Question Types**: Single choice, Yes/No, and Rating (1-10) questions
- **Real-time Dashboard**: Modern, responsive UI with glassmorphism design
- **Wallet Integration**: Connect with MetaMask using EIP-6963 standard
- **Cross-Network Support**: Works on both local development (Hardhat) and Sepolia testnet

## 🏗️ Architecture

### Smart Contracts (FHEVM)
- Built with Solidity 0.8.27 and FHEVM library
- Encrypted data types: `euint8`, `euint32`, `ebool`
- Homomorphic operations: `FHE.add()`, `FHE.eq()`, `FHE.select()`
- On-chain question storage with encrypted answer aggregation

### Frontend (Next.js 16)
- Modern React with App Router
- TypeScript for type safety
- Tailwind CSS v4 with custom design tokens
- Dynamic FHEVM integration (Mock for local, Relayer SDK for testnets)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask wallet
- Sepolia ETH (for testnet) or local Hardhat node

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/LindaOrlando/cipherpoll.git
   cd cipherpoll
   ```

2. **Install dependencies**
   ```bash
   # Install contract dependencies
   cd fhevm-hardhat-template
   npm install
   
   # Install frontend dependencies
   cd ../cipherpoll-frontend
   npm install
   ```

3. **Configure environment (for Sepolia deployment)**
   ```bash
   cd fhevm-hardhat-template
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY
   ```

### Local Development

1. **Start Hardhat node** (Terminal 1)
   ```bash
   cd fhevm-hardhat-template
   npx hardhat node
   ```

2. **Deploy contracts** (Terminal 2)
   ```bash
   cd fhevm-hardhat-template
   npx hardhat deploy --network localhost
   ```

3. **Start frontend** (Terminal 3)
   ```bash
   cd cipherpoll-frontend
   npm run dev:mock
   ```

4. **Visit**: http://localhost:3000

### Sepolia Testnet

1. **Deploy contracts to Sepolia**
   ```bash
   cd fhevm-hardhat-template
   npx hardhat deploy --network sepolia
   ```

2. **Start frontend** (production mode)
   ```bash
   cd cipherpoll-frontend
   npm run dev
   ```

3. **Configure MetaMask** for Sepolia network

## 📖 Usage

### 1. Create Survey
Navigate to `/create` and:
- Enter survey title and description
- Add questions (single choice, yes/no, or rating)
- Set end date and privacy settings
- Submit transaction (requires gas)

### 2. Participate in Survey
Navigate to `/surveys` and:
- Browse available surveys
- Click "Participate" on any survey
- Answer questions (your responses are encrypted client-side)
- Submit answers (requires gas for FHE operations)

### 3. View Statistics (Survey Creator Only)
Navigate to `/stats/[surveyId]` and:
- Click "Decrypt Statistics" button
- Sign decryption message (one-time, cached for 365 days)
- View aggregate results with charts and percentages
- Individual responses remain private forever

### 4. Manage Your Activity
- `/my-surveys`: View and manage surveys you've created
- `/my-responses`: See surveys you've participated in

## 🔬 FHEVM Integration

### Encryption Flow
```typescript
// Client-side encryption
const input = fhevmInstance.createEncryptedInput(contractAddress, userAddress);
input.add8(answerValue);
const { handles, inputProof } = await input.encrypt();

// Contract storage (encrypted)
mapping(uint256 => mapping(address => mapping(uint256 => euint8))) userAnswers;
```

### Homomorphic Aggregation
```solidity
// Contract computes on encrypted data
euint32 currentCount = singleChoiceStats[surveyId][qId][optionIndex];
euint32 increment = FHE.select(isMatch, FHE.asEuint32(1), FHE.asEuint32(0));
singleChoiceStats[surveyId][qId][optionIndex] = FHE.add(currentCount, increment);

// Only creator can decrypt aggregates
FHE.allow(singleChoiceStats[surveyId][qId][optionIndex], survey.creator);
```

### Decryption (Creator Only)
```typescript
// Generate decryption signature
const sig = await FhevmDecryptionSignature.loadOrSign(fhevmInstance, [contractAddress], signer);

// Decrypt aggregate statistics
const decryptedData = await fhevmInstance.userDecrypt(
  handleObjects,
  sig.privateKey,
  sig.publicKey,
  sig.signature,
  // ... other params
);
```

## 📁 Project Structure

```
cipherpoll/
├── fhevm-hardhat-template/          # Smart contracts
│   ├── contracts/
│   │   ├── SurveyCore.sol          # Main survey contract
│   │   └── FHECounter.sol          # Example counter
│   ├── deploy/                     # Deployment scripts
│   ├── test/                       # Contract tests
│   └── tasks/                      # CLI tasks
├── cipherpoll-frontend/            # Next.js frontend
│   ├── app/                        # App Router pages
│   ├── components/                 # React components
│   ├── fhevm/                      # FHEVM integration
│   ├── hooks/                      # Custom React hooks
│   └── types/                      # TypeScript types
└── README.md
```

## 🎨 Design System

CipherPoll uses a deterministic design system based on project metadata:

- **Theme**: Glassmorphism with teal/cyan/green color palette
- **Typography**: Inter font with 1.25 scale ratio
- **Layout**: Tab-based navigation with sidebar support
- **Components**: Large border radius (16px) with medium shadows
- **Animations**: 300ms smooth transitions
- **Responsive**: Mobile-first with 3 breakpoints

## 🔐 Privacy Guarantees

### What's Encrypted
- ✅ Individual survey responses (euint8 on-chain)
- ✅ User answer history
- ✅ Intermediate computation results

### What's Public
- ✅ Survey metadata (title, questions, options)
- ✅ Participation counts
- ✅ Survey creator addresses

### What Only Creators Can See
- ✅ Aggregate statistics (after decryption)
- ✅ Option totals and percentages
- ✅ Rating distributions

### What Nobody Can See
- ❌ Individual user responses
- ❌ Links between users and their answers
- ❌ Partial response data

## 🛠️ Development

### Smart Contracts

**Compile**:
```bash
cd fhevm-hardhat-template
npx hardhat compile
```

**Test**:
```bash
npx hardhat test
```

**Create Survey via CLI**:
```bash
npx hardhat create-survey --title "Test Survey" --description "Description" --network localhost
```

### Frontend

**Build**:
```bash
cd cipherpoll-frontend
npm run build
```

**Type Check**:
```bash
npm run type-check
```

**Generate ABI**:
```bash
npm run genabi
```

## 📋 Deployed Contracts

### Sepolia Testnet
- **SurveyCore**: [`0xb1CfD5Db65c0B4C5F706D67136d0F26f8786F050`](https://sepolia.etherscan.io/address/0xb1CfD5Db65c0B4C5F706D67136d0F26f8786F050)
- **FHECounter**: [`0xa1E6251477720679DA62Fd9F702d7b8b7725eCc3`](https://sepolia.etherscan.io/address/0xa1E6251477720679DA62Fd9F702d7b8b7725eCc3)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./fhevm-hardhat-template/LICENSE) file for details.

## 🙏 Acknowledgments

- [Zama](https://zama.ai/) for FHEVM technology
- [FHEVM Hardhat Template](https://github.com/zama-ai/fhevm-hardhat-template) for the development foundation
- The Ethereum and Web3 community

## 🔗 Links

- **Live Demo**: [Coming Soon]
- **Documentation**: [FHEVM Docs](https://docs.zama.ai/fhevm)
- **Zama**: https://zama.ai/
- **FHEVM**: https://github.com/zama-ai/fhevm

---

**Built with ❤️ and 🔐 by the CipherPoll team**
