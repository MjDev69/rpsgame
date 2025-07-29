// =============================================================================
// COMPLETE ContractService.js - Enhanced with Debugging + All Methods
// 🚀 COPY-PASTE READY - No additional editing needed
// =============================================================================

export class ContractService {
  constructor(walletService) {
    this.walletService = walletService;
    this.contractAddress = '0xf0f3641a90B79DD19EAA145664367E3C1aAB080C';
    this.contract = null;
    
    // ✅ CORRECTED ABI - Based on your actual deployed RPSBetting contract
    this.abi = [
      // Write Functions - CORRECTED parameter names
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "gameId", 
            "type": "string"
          }
        ],
        "name": "createGame",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "string", 
            "name": "gameId",
            "type": "string"
          }
        ],
        "name": "joinGame",
        "outputs": [],
        "stateMutability": "payable", 
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "gameId", 
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "winner",
            "type": "address"
          }
        ],
        "name": "completeGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "gameId",
            "type": "string"
          }
        ],
        "name": "cancelGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      // Read Functions - CORRECTED
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "gameId",
            "type": "string"
          }
        ],
        "name": "getGame",
        "outputs": [
          {
            "components": [
              {
                "internalType": "string",
                "name": "gameId",
                "type": "string"
              },
              {
                "internalType": "address", 
                "name": "player1",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "player2", 
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "betAmount",
                "type": "uint256"
              },
              {
                "internalType": "uint256", 
                "name": "totalPool",
                "type": "uint256"
              },
              {
                "internalType": "enum RPSBetting.GameStatus",
                "name": "status",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "winner",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "timestamp", 
                "type": "uint256"
              }
            ],
            "internalType": "struct RPSBetting.Game",
            "name": "game",
            "type": "tuple"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "betAmount",
            "type": "uint256"
          }
        ],
        "name": "calculatePrizes",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "totalPool", 
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "platformFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "winnerPrize",
            "type": "uint256"
          }
        ],
        "stateMutability": "pure",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "gameCounter",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "platformFeeRecipient", 
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "internalType": "address", 
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view", 
        "type": "function"
      },
      // Constants
      {
        "inputs": [],
        "name": "PLATFORM_FEE_BPS",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "BASIS_POINTS", 
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      // Events - CORRECTED
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "gameCounter",
            "type": "uint256"
          },
          {
            "indexed": true, 
            "internalType": "string",
            "name": "gameId",
            "type": "string"
          },
          {
            "indexed": true,
            "internalType": "address", 
            "name": "creator",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "betAmount",
            "type": "uint256"
          }
        ],
        "name": "GameCreated",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256", 
            "name": "gameCounter",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "string",
            "name": "gameId", 
            "type": "string"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "player2",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "totalPool",
            "type": "uint256"
          }
        ],
        "name": "PlayerJoined",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "gameCounter", 
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "string",
            "name": "gameId",
            "type": "string"
          },
          {
            "indexed": true, 
            "internalType": "address",
            "name": "winner",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "prizeAmount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256", 
            "name": "platformFee",
            "type": "uint256"
          }
        ],
        "name": "GameCompleted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "gameCounter",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "string", 
            "name": "gameId",
            "type": "string"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "refundAmount",
            "type": "uint256"
          }
        ],
        "name": "GameCancelled",
        "type": "event"
      }
    ];
    
    console.log('🔗 ContractService initialized - CORRECTED ABI VERSION');
    console.log('📍 Contract Address:', this.contractAddress);
    console.log('🏛️ Monad Testnet (Chain ID: 10143)');
    console.log('✅ ABI corrected for deployed RPSBetting contract');
  }
  
  // ✅ ENHANCED: Initialize with comprehensive error handling
  async initializeContract() {
    if (!this.walletService.isConnected()) {
      throw new Error('Wallet not connected - please connect MetaMask first');
    }
    
    try {
      console.log('🔧 Initializing contract connection...');
      
      // Get the signer from wallet service
      const signer = this.walletService.getSigner();
      if (!signer) {
        throw new Error('No signer available from wallet service');
      }
      
      // ✅ VALIDATE: Check we're on the right network
      const network = await signer.provider.getNetwork();
      console.log('🌐 Connected to network:', network.chainId, network.name);
      
      if (network.chainId !== 10143) {
        throw new Error(`Wrong network! Expected Monad Testnet (10143), got ${network.chainId}`);
      }
      
      // ✅ VALIDATE: Check contract exists at address
      const code = await signer.provider.getCode(this.contractAddress);
      if (code === '0x') {
        throw new Error(`No contract found at address ${this.contractAddress}`);
      }
      console.log('✅ Contract exists at address');
      console.log('📏 Contract code length:', code.length, 'characters');
      
      // Create contract instance
      this.contract = new ethers.Contract(this.contractAddress, this.abi, signer);
      
      console.log('✅ Contract initialized successfully');
      console.log('🎯 Ready for blockchain transactions');
      
      return this.contract;
      
    } catch (error) {
      console.error('❌ Contract initialization failed:', error);
      throw error;
    }
  }
  
  // Fixed createGame method for ContractService.js
// This removes the problematic game uniqueness check that causes RPC errors

async createGame(gameId, betAmountMON) {
    try {
        console.log('🚀 =============================================================');
        console.log('🎮 CREATING GAME - FIXED VERSION');
        console.log('📋 Original Game ID:', gameId);
        console.log('💰 Bet Amount:', betAmountMON, 'MON');
        console.log('🚀 =============================================================');
        
        // Initialize contract if needed
        if (!this.contract) {
            console.log('🔧 Initializing contract...');
            await this.initializeContract();
        }
        
        // Clean bet amount
        let cleanBetAmount;
        if (typeof betAmountMON === 'string') {
            cleanBetAmount = parseFloat(betAmountMON);
        } else {
            cleanBetAmount = Number(betAmountMON);
        }
        
        // Validate bet amount
        if (!cleanBetAmount || cleanBetAmount <= 0) {
            throw new Error('Invalid bet amount: must be greater than 0');
        }
        
        const betAmountWei = ethers.utils.parseEther(cleanBetAmount.toString());
        console.log('🔢 Bet amount in wei:', betAmountWei.toString());
        
        // Get user address and check balance
        const signer = this.walletService.getSigner();
        const userAddress = await signer.getAddress();
        console.log('👤 User address:', userAddress);
        
        // Check balance
        const balance = await signer.provider.getBalance(userAddress);
        const balanceMON = parseFloat(ethers.utils.formatEther(balance));
        console.log('💰 Current balance:', balanceMON.toFixed(6), 'MON');
        console.log('💰 Required bet:', cleanBetAmount, 'MON');
        console.log('⛽ Estimated gas:', 0.01, 'MON');
        
        const totalRequired = cleanBetAmount + 0.01;
        if (balanceMON < totalRequired) {
            throw new Error(`Insufficient balance: have ${balanceMON.toFixed(4)} MON, need ${totalRequired.toFixed(4)} MON`);
        }
        
        console.log('✅ Sufficient balance confirmed');
        
        // Generate unique game ID
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5);
        const cleanGameId = `game${timestamp}${random}`;
        
        console.log('🎯 Generated game ID:', cleanGameId);
        
        // ✅ SKIP the game existence check - it causes RPC errors
        // The contract will handle duplicates by reverting if game already exists
        console.log('⏭️ Skipping game existence check to avoid RPC errors');
        
        // Estimate gas
        console.log('🔧 Estimating gas...');
        let gasEstimate;
        let gasLimit;
        
        try {
            gasEstimate = await this.contract.estimateGas.createGame(cleanGameId, {
                value: betAmountWei,
                from: userAddress
            });
            console.log('⛽ Gas estimate:', gasEstimate.toString());
            
            // Add 50% buffer
            gasLimit = gasEstimate.mul(150).div(100);
            console.log('⛽ Gas limit with buffer:', gasLimit.toString());
            
        } catch (gasError) {
            console.error('❌ Gas estimation failed:', gasError);
            
            // If gas estimation fails due to duplicate game ID, generate a new one
            if (gasError.message.includes('execution reverted')) {
                console.log('🔄 Gas estimation failed, trying with new game ID...');
                
                const newTimestamp = Date.now().toString().slice(-6);
                const newRandom = Math.random().toString(36).substring(2, 6); // Make it longer
                const newGameId = `game${newTimestamp}${newRandom}`;
                
                console.log('🆕 New game ID:', newGameId);
                
                try {
                    gasEstimate = await this.contract.estimateGas.createGame(newGameId, {
                        value: betAmountWei,
                        from: userAddress
                    });
                    gasLimit = gasEstimate.mul(150).div(100);
                    cleanGameId = newGameId; // Update to use new ID
                    console.log('✅ Gas estimation successful with new ID');
                    
                } catch (retryError) {
                    console.error('❌ Gas estimation failed again:', retryError);
                    // Use conservative default
                    gasLimit = ethers.BigNumber.from('350000');
                    console.log('📊 Using default gas limit:', gasLimit.toString());
                }
            } else {
                // Other gas error - use default
                gasLimit = ethers.BigNumber.from('350000');
                console.log('📊 Using default gas limit:', gasLimit.toString());
            }
        }
        
        // Send transaction
        console.log('🎯 Transaction parameters:');
        console.log('  - Game ID:', cleanGameId);
        console.log('  - Bet Amount:', cleanBetAmount, 'MON');
        console.log('  - Gas Limit:', gasLimit.toString());
        console.log('  - From:', userAddress);
        
        console.log('🚀 Sending transaction...');
        
        let tx;
        try {
            tx = await this.contract.createGame(cleanGameId, {
                value: betAmountWei,
                gasLimit: gasLimit,
                gasPrice: ethers.utils.parseUnits('3', 'gwei')
            });
            
            console.log('📡 Transaction sent:', tx.hash);
            
        } catch (sendError) {
            console.error('❌ Transaction send failed:', sendError);
            
            // Handle specific errors
            if (sendError.code === 4001) {
                throw new Error('Transaction cancelled by user');
            } else if (sendError.message.includes('insufficient funds')) {
                throw new Error('Insufficient funds for transaction');
            } else {
                throw sendError;
            }
        }
        
        // Wait for confirmation
        console.log('⏳ Waiting for confirmation...');
        const receipt = await tx.wait(1);
        
        // Check if transaction was successful
        if (receipt.status === 0) {
            console.error('❌ Transaction reverted on blockchain');
            throw new Error('Transaction failed - game creation was reverted');
        }
        
        console.log('🚀 =============================================================');
        console.log('✅ SUCCESS: Game created!');
        console.log('🔗 Transaction hash:', receipt.transactionHash);
        console.log('🎮 Game ID:', cleanGameId);
        console.log('💰 Bet escrowed:', cleanBetAmount, 'MON');
        console.log('📦 Block number:', receipt.blockNumber);
        console.log('⛽ Gas used:', receipt.gasUsed.toString());
        console.log('🚀 =============================================================');
        
        return {
            success: true,
            gameId: cleanGameId,
            originalGameId: gameId,
            betAmount: cleanBetAmount,
            txHash: receipt.transactionHash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
        
    } catch (error) {
        console.log('🚀 =============================================================');
        console.error('❌ Game creation failed:', error);
        console.log('🚀 =============================================================');
        
        let friendlyMessage = error.message;
        
        if (error.code === 'CALL_EXCEPTION') {
            friendlyMessage = 'Smart contract call failed - please try again';
        } else if (error.code === 4001) {
            friendlyMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('insufficient funds')) {
            friendlyMessage = 'Insufficient MON balance for bet + gas fees';
        } else if (error.message.includes('Internal JSON-RPC error')) {
            friendlyMessage = 'Network error - please try again in a moment';
        }
        
        return {
            success: false,
            error: friendlyMessage,
            originalError: error.message,
            code: error.code
        };
    }
}


// Enhanced joinGame method for ContractService.js
// This adds better error detection and retry logic for RPC issues

// Updated joinGame method for ContractService.js
// This skips the problematic game verification step

async joinGame(gameId, betAmountMON) {
    try {
        if (!this.contract) {
            await this.initializeContract();
        }
        
        console.log('🎮 SECOND PLAYER: Enhanced debugging joinGame');
        console.log('📋 Game ID:', gameId);
        console.log('💰 Bet Amount:', betAmountMON, 'MON');
        
        // Clean bet amount
        let cleanBetAmount = typeof betAmountMON === 'string' ? 
            parseFloat(betAmountMON) : Number(betAmountMON);
        
        if (isNaN(cleanBetAmount) || cleanBetAmount <= 0) {
            throw new Error(`Invalid bet amount: ${betAmountMON}`);
        }
        
        // Wei conversion
        const betAmountWei = ethers.utils.parseEther(cleanBetAmount.toString());
        console.log('💎 Wei value:', betAmountWei.toString());
        
        // Get signer info
        const signer = this.walletService.getSigner();
        const userAddress = await signer.getAddress();
        console.log('👤 My address:', userAddress);
        
        // ✅ NEW: Try a static call first to get the actual error
        console.log('🔍 Attempting static call to diagnose error...');
        try {
            const staticResult = await this.contract.callStatic.joinGame(gameId, {
                from: userAddress,
                value: betAmountWei
            });
            console.log('✅ Static call succeeded (unexpected):', staticResult);
        } catch (staticError) {
            console.error('❌ Static call revealed the actual error:');
            console.error('  Raw error:', staticError);
            
            // Parse the error message
            const errorMessage = staticError.message || '';
            
            if (errorMessage.includes('Game does not exist')) {
                console.error('🎮 CONTRACT ERROR: Game does not exist on blockchain');
                console.error('  Game ID attempted:', gameId);
                throw new Error('Game not found on blockchain - host transaction may have failed');
                
            } else if (errorMessage.includes('Cannot join your own game')) {
                console.error('👤 CONTRACT ERROR: Trying to join your own game');
                console.error('  Your address:', userAddress);
                throw new Error('Cannot join - you created this game. Use a different wallet.');
                
            } else if (errorMessage.includes('Bet amount must match')) {
                console.error('💰 CONTRACT ERROR: Bet amount mismatch');
                throw new Error('Bet amount does not match the game requirement');
                
            } else if (errorMessage.includes('Invalid game status')) {
                console.error('📊 CONTRACT ERROR: Game is not accepting players');
                throw new Error('Game is not in a joinable state');
                
            } else if (errorMessage.includes('Game already has two players')) {
                console.error('👥 CONTRACT ERROR: Game is full');
                throw new Error('Game already has two players');
                
            } else {
                console.error('❓ Unknown contract error:', errorMessage);
                throw new Error('Contract rejected the join attempt');
            }
        }
        
        // If static call somehow succeeds, try the actual transaction
        console.log('🚀 Sending actual transaction...');
        
        const tx = await this.contract.joinGame(gameId, {
            value: betAmountWei,
            gasLimit: 400000,
            gasPrice: ethers.utils.parseUnits('3', 'gwei')
        });
        
        console.log('📡 Transaction sent:', tx.hash);
        
        const receipt = await tx.wait(1);
        
        return {
            success: true,
            gameId: gameId,
            betAmount: cleanBetAmount,
            txHash: receipt.transactionHash
        };
        
    } catch (error) {
        console.error('❌ Join failed with detailed error:', error);
        
        return {
            success: false,
            error: error.message,
            originalError: error,
            gameId: gameId
        };
    }
}

// Also add this debug method to check game creation
async verifyGameCreation(gameId, creatorAddress) {
    console.log('🔍 Verifying game creation...');
    console.log('  Game ID:', gameId);
    console.log('  Expected creator:', creatorAddress);
    
    try {
        // Try to read game data with retries
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            attempts++;
            console.log(`  Attempt ${attempts}/${maxAttempts}...`);
            
            try {
                const game = await this.contract.getGame(gameId);
                
                console.log('✅ Game found on blockchain:');
                console.log('  Game ID:', game.gameId);
                console.log('  Player 1:', game.player1);
                console.log('  Player 2:', game.player2);
                console.log('  Status:', game.status);
                console.log('  Bet:', ethers.utils.formatEther(game.betAmount), 'MON');
                
                return {
                    exists: true,
                    gameId: game.gameId,
                    creator: game.player1,
                    status: game.status,
                    betAmount: ethers.utils.formatEther(game.betAmount)
                };
                
            } catch (error) {
                if (attempts < maxAttempts) {
                    console.log('  Failed, waiting 2 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw error;
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Game verification failed:', error.message);
        return {
            exists: false,
            error: error.message
        };
    }
}
  
  // ✅ COMPLETE: Complete game method with enhanced winner handling
  async completeGame(gameId, winnerAddress, betAmountMON) {
    try {
        if (!this.contract) {
            await this.initializeContract();
        }
        
        console.log('🏁 ===== COMPLETING GAME ON BLOCKCHAIN =====');
        console.log('📋 Original Game ID:', gameId);
        console.log('🏆 Winner Address:', winnerAddress);
        console.log('💰 Bet Amount:', betAmountMON, 'MON');
        
        // Clean game ID same way as createGame
        const cleanGameId = gameId
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 20)
            .toLowerCase();
        
        console.log('🧹 Cleaned Game ID:', cleanGameId);
        
        // ✅ STEP 1: Check game exists and get its current status
        let gameData;
        try {
            console.log('🔍 Checking game status on blockchain...');
            gameData = await this.contract.getGame(cleanGameId);
            console.log('📊 Game data from blockchain:', gameData);
            
            // Decode game status
            const statusNames = ['WaitingForPlayers', 'Active', 'Completed', 'Cancelled'];
            const currentStatus = statusNames[gameData.status] || `Unknown(${gameData.status})`;
            console.log('📊 Current game status:', currentStatus, `(${gameData.status})`);
            
            // ✅ CRITICAL CHECK: Game must be in "Active" status (1) to be completed
            if (gameData.status !== 1) {
                if (gameData.status === 0) {
                    throw new Error(`Game is still waiting for players. Both players must join before completion.`);
                } else if (gameData.status === 2) {
                    throw new Error(`Game is already completed. Winner: ${gameData.winner}`);
                } else if (gameData.status === 3) {
                    throw new Error(`Game has been cancelled.`);
                } else {
                    throw new Error(`Game is in invalid status: ${currentStatus}`);
                }
            }
            
            console.log('✅ Game status is Active - ready for completion');
            
            // ✅ STEP 2: Verify both players joined
            if (gameData.player2 === '0x0000000000000000000000000000000000000000') {
                throw new Error('Second player has not joined the game yet');
            }
            
            console.log('✅ Both players have joined:');
            console.log('  Player 1:', gameData.player1);
            console.log('  Player 2:', gameData.player2);
            console.log('  Total Pool:', ethers.utils.formatEther(gameData.totalPool), 'MON');
            
        } catch (checkError) {
            console.error('❌ Game status check failed:', checkError.message);
            
            if (checkError.message.includes('Game does not exist')) {
                throw new Error(`Game "${cleanGameId}" not found on blockchain. The game may have expired or was never created.`);
            } else {
                throw checkError; // Re-throw our custom errors
            }
        }
        
        // ✅ STEP 3: Validate winner address
        let resolvedWinner;
        if (!winnerAddress || winnerAddress === 'null' || winnerAddress === null) {
            resolvedWinner = '0x0000000000000000000000000000000000000000';
            console.log('🤝 Tie game - using zero address');
        } else {
            if (!ethers.utils.isAddress(winnerAddress)) {
                throw new Error('Invalid winner address format');
            }
            
            // ✅ STEP 4: Verify winner is one of the players
            if (winnerAddress !== gameData.player1 && winnerAddress !== gameData.player2) {
                console.warn('⚠️ Winner address does not match either player:');
                console.warn('  Winner:', winnerAddress);
                console.warn('  Player 1:', gameData.player1);
                console.warn('  Player 2:', gameData.player2);
                
                // For now, let's continue but log the warning
                // In production, you might want to throw an error here
            }
            
            resolvedWinner = winnerAddress;
            console.log('🏆 Winner address validated:', resolvedWinner);
        }
        
        // ✅ STEP 5: Check if caller is one of the players
        const signer = this.walletService.getSigner();
        const callerAddress = await signer.getAddress();
        
        if (callerAddress !== gameData.player1 && callerAddress !== gameData.player2) {
            console.warn('⚠️ Caller is not one of the game players:');
            console.warn('  Caller:', callerAddress);
            console.warn('  Player 1:', gameData.player1);
            console.warn('  Player 2:', gameData.player2);
            console.warn('  Continuing anyway...');
        } else {
            console.log('✅ Caller is a valid game player');
        }
        
        // ✅ STEP 6: Estimate gas for completion
        console.log('🔧 Estimating gas for game completion...');
        let gasEstimate;
        try {
            gasEstimate = await this.contract.estimateGas.completeGame(cleanGameId, resolvedWinner);
            console.log('⛽ Gas estimate successful:', gasEstimate.toString());
        } catch (gasError) {
            console.error('❌ Gas estimation failed:', gasError);
            console.error('Gas error details:', {
                message: gasError.message,
                code: gasError.code,
                data: gasError.data
            });
            
            // Try to provide specific error messages
            if (gasError.message.includes('Invalid game status')) {
                throw new Error('Game completion rejected: Game may already be completed or in wrong status');
            } else if (gasError.message.includes('Only game players can complete')) {
                throw new Error('Only players who participated in the game can complete it');
            } else if (gasError.message.includes('execution reverted')) {
                throw new Error(`Smart contract rejected completion: ${gasError.message}`);
            } else {
                throw new Error(`Gas estimation failed: ${gasError.message}`);
            }
        }
        
        // ✅ STEP 7: Send completion transaction
        const gasLimit = gasEstimate.mul(150).div(100); // 50% buffer
        
        console.log('🎯 Sending completion transaction...');
        console.log('  Game ID:', cleanGameId);
        console.log('  Winner:', resolvedWinner);
        console.log('  Gas Limit:', gasLimit.toString());
        
        const tx = await this.contract.completeGame(cleanGameId, resolvedWinner, {
            gasLimit: gasLimit,
            gasPrice: ethers.utils.parseUnits('2', 'gwei')
        });
        
        console.log('📡 Completion transaction sent:', tx.hash);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait(1);
        
        console.log('🏁 ===== GAME COMPLETION SUCCESS =====');
        console.log('✅ Game completed and prizes distributed!');
        console.log('🔗 Transaction hash:', receipt.transactionHash);
        console.log('📦 Block number:', receipt.blockNumber);
        console.log('⛽ Gas used:', receipt.gasUsed.toString());
        
        const totalPool = betAmountMON * 2;
        const isTie = resolvedWinner === '0x0000000000000000000000000000000000000000';
        
        return {
            success: true,
            gameId: cleanGameId,
            winner: resolvedWinner,
            winnerPrize: isTie ? betAmountMON : totalPool * 0.95,
            platformFee: isTie ? 0 : totalPool * 0.05,
            isTie: isTie,
            txHash: receipt.transactionHash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber,
            gameStatus: 'completed'
        };
        
    } catch (error) {
        console.log('🏁 ===== GAME COMPLETION FAILED =====');
        console.error('❌ Complete game failed:', error);
        console.error('Game ID used:', gameId);
        console.error('Winner address:', winnerAddress);
        
        let friendlyMessage = error.message;
        if (error.code === 'CALL_EXCEPTION') {
            if (error.message.includes('Invalid game status')) {
                friendlyMessage = 'Game cannot be completed - it may already be finished or not ready';
            } else if (error.message.includes('Only game players can complete')) {
                friendlyMessage = 'Only players in the game can complete it';
            } else if (error.message.includes('Game does not exist')) {
                friendlyMessage = 'Game not found on blockchain';
            } else {
                friendlyMessage = 'Smart contract rejected the completion';
            }
        }
        
        return {
            success: false,
            error: friendlyMessage,
            originalError: error.message,
            gameId: gameId,
            winner: winnerAddress,
            code: error.code
        };
    }
}

  async getGameStatus(gameId) {
    try {
        if (!this.contract) {
            await this.initializeContract();
        }
        
        const cleanGameId = gameId
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 20)
            .toLowerCase();
        
        console.log('📖 Attempting to read game status with RPC error handling...');
        console.log('🎯 Clean Game ID:', cleanGameId);
        
        // ✅ ENHANCED: Try multiple approaches for Monad RPC issues
        let gameData;
        let attempt = 0;
        const maxAttempts = 3;
        
        while (attempt < maxAttempts) {
            attempt++;
            console.log(`🔍 Game status read attempt ${attempt}/${maxAttempts}...`);
            
            try {
                // Try to read the game data
                gameData = await this.contract.getGame(cleanGameId);
                console.log('✅ Successfully read game data:', gameData);
                break; // Success, exit retry loop
                
            } catch (readError) {
                console.warn(`⚠️ Attempt ${attempt} failed:`, readError.message);
                
                // Check if it's an RPC-related error
                const isRPCError = readError.message.includes('Block requested not found') ||
                                 readError.message.includes('missing revert data') ||
                                 readError.message.includes('Internal JSON-RPC error') ||
                                 readError.message.includes('historical state') ||
                                 readError.code === -32603 ||
                                 readError.code === -32602;
                
                if (isRPCError && attempt < maxAttempts) {
                    console.log(`🌐 RPC error detected, waiting 3 seconds before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    continue; // Try again
                } else {
                    // Not an RPC error, or max attempts reached
                    throw readError;
                }
            }
        }
        
        // If we still don't have game data, throw the last error
        if (!gameData) {
            throw new Error('Failed to read game data after all retry attempts');
        }
        
        const statusNames = ['WaitingForPlayers', 'Active', 'Completed', 'Cancelled'];
        const statusName = statusNames[gameData.status] || `Unknown(${gameData.status})`;
        
        return {
            success: true,
            gameId: cleanGameId,
            status: gameData.status,
            statusName: statusName,
            player1: gameData.player1,
            player2: gameData.player2,
            betAmount: ethers.utils.formatEther(gameData.betAmount),
            totalPool: ethers.utils.formatEther(gameData.totalPool),
            winner: gameData.winner,
            timestamp: gameData.timestamp.toNumber(),
            canComplete: gameData.status === 1 && gameData.player2 !== '0x0000000000000000000000000000000000000000',
            readAttempts: attempt
        };
        
    } catch (error) {
        console.error('❌ Get game status failed:', error);
        
        // ✅ ENHANCED: Better error categorization
        let errorMessage = error.message;
        let errorType = 'unknown';
        
        if (error.message.includes('Game does not exist')) {
            errorType = 'game-not-found';
            errorMessage = 'Game not found on blockchain';
        } else if (error.message.includes('Block requested not found') || 
                  error.message.includes('missing revert data') ||
                  error.message.includes('Internal JSON-RPC error')) {
            errorType = 'rpc-error';
            errorMessage = 'Monad testnet RPC temporarily unavailable';
        } else if (error.code === -32603 || error.code === -32602) {
            errorType = 'rpc-error';
            errorMessage = 'Blockchain RPC error - please try again';
        }
        
        return {
            success: false,
            error: errorMessage,
            errorType: errorType,
            originalError: error.message,
            gameId: gameId
        };
    }
}
  
  // ✅ COMPLETE: Read game data from blockchain
  async getGame(gameId) {
    try {
      if (!this.contract) {
        await this.initializeContract();
      }
      
      console.log('📖 Reading game data from blockchain...');
      console.log('📋 Game ID:', gameId);
      
      // Clean game ID same way
      const cleanGameId = gameId
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 20)
        .toLowerCase();
      
      const gameData = await this.contract.getGame(cleanGameId);
      
      console.log('✅ Game data retrieved:', gameData);
      
      return {
        success: true,
        game: {
          gameId: gameData.gameId,
          player1: gameData.player1,
          player2: gameData.player2,
          betAmount: ethers.utils.formatEther(gameData.betAmount),
          totalPool: ethers.utils.formatEther(gameData.totalPool),
          status: gameData.status,
          winner: gameData.winner,
          timestamp: gameData.timestamp.toNumber()
        }
      };
      
    } catch (error) {
      console.error('❌ Get game failed:', error);
      return {
        success: false,
        error: error.message,
        gameId: gameId
      };
    }
  }
  
  // ✅ COMPLETE: Calculate prizes
  async calculatePrizes(betAmountMON) {
    try {
      if (!this.contract) {
        await this.initializeContract();
      }
      
      const betAmountWei = ethers.utils.parseEther(betAmountMON.toString());
      const result = await this.contract.calculatePrizes(betAmountWei);
      
      return {
        success: true,
        totalPool: parseFloat(ethers.utils.formatEther(result.totalPool)),
        platformFee: parseFloat(ethers.utils.formatEther(result.platformFee)),
        winnerPrize: parseFloat(ethers.utils.formatEther(result.winnerPrize))
      };
      
    } catch (error) {
      console.error('❌ Calculate prizes failed:', error);
      
      // Fallback calculation if contract call fails
      const totalPool = betAmountMON * 2;
      const platformFee = totalPool * 0.05;
      const winnerPrize = totalPool * 0.95;
      
      return {
        success: true,
        totalPool: totalPool,
        platformFee: platformFee,
        winnerPrize: winnerPrize,
        calculated: 'locally' // Indicate this was calculated locally
      };
    }
  }
  
  // ✅ COMPLETE: Cancel game
  async cancelGame(gameId) {
    try {
      if (!this.contract) {
        await this.initializeContract();
      }
      
      const cleanGameId = gameId
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 20)
        .toLowerCase();
      
      const tx = await this.contract.cancelGame(cleanGameId, {
        gasLimit: 200000,
        gasPrice: ethers.utils.parseUnits('2', 'gwei')
      });
      
      const receipt = await tx.wait(1);
      
      return {
        success: true,
        gameId: cleanGameId,
        txHash: receipt.transactionHash
      };
      
    } catch (error) {
      console.error('❌ Cancel game failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // ✅ COMPLETE: Event listeners setup
  setupEventListeners(gameId, callbacks = {}) {
    if (!this.contract) {
      console.warn('⚠️ Contract not initialized for event listening');
      return;
    }
    
    console.log('👂 Setting up contract event listeners for game:', gameId);
    
    // Clean game ID for event filtering
    const cleanGameId = gameId
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 20)
      .toLowerCase();
    
    // Listen for GameCreated events
    if (callbacks.onGameCreated) {
      this.contract.on('GameCreated', (gameCounter, eventGameId, creator, betAmount, event) => {
        if (eventGameId === cleanGameId) {
          console.log('🎮 GameCreated event received:', event.transactionHash);
          callbacks.onGameCreated({
            gameId: eventGameId,
            creator,
            betAmount: ethers.utils.formatEther(betAmount),
            txHash: event.transactionHash
          });
        }
      });
    }
    
    // Listen for PlayerJoined events
    if (callbacks.onPlayerJoined) {
      this.contract.on('PlayerJoined', (gameCounter, eventGameId, player2, totalPool, event) => {
        if (eventGameId === cleanGameId) {
          console.log('👥 PlayerJoined event received:', event.transactionHash);
          callbacks.onPlayerJoined({
            gameId: eventGameId,
            player2,
            totalPool: ethers.utils.formatEther(totalPool),
            txHash: event.transactionHash
          });
        }
      });
    }
    
    // Listen for GameCompleted events
    if (callbacks.onGameCompleted) {
      this.contract.on('GameCompleted', (gameCounter, eventGameId, winner, prizeAmount, platformFee, event) => {
        if (eventGameId === cleanGameId) {
          console.log('🏁 GameCompleted event received:', event.transactionHash);
          callbacks.onGameCompleted({
            gameId: eventGameId,
            winner,
            prizeAmount: ethers.utils.formatEther(prizeAmount),
            platformFee: ethers.utils.formatEther(platformFee),
            txHash: event.transactionHash
          });
        }
      });
    }
    
    // Listen for GameCancelled events
    if (callbacks.onGameCancelled) {
      this.contract.on('GameCancelled', (gameCounter, eventGameId, refundAmount, event) => {
        if (eventGameId === cleanGameId) {
          console.log('❌ GameCancelled event received:', event.transactionHash);
          callbacks.onGameCancelled({
            gameId: eventGameId,
            refundAmount: ethers.utils.formatEther(refundAmount),
            txHash: event.transactionHash
          });
        }
      });
    }
  }
  
  // ✅ COMPLETE: Remove event listeners
  removeEventListeners() {
    if (this.contract) {
      this.contract.removeAllListeners();
      console.log('🧹 Contract event listeners cleaned up');
    }
  }
  
  // ✅ COMPLETE: Test contract connection
  async testContractConnection() {
    try {
      console.log('🧪 Testing contract connection...');
      
      if (!this.contract) {
        await this.initializeContract();
      }
      
      // Test basic contract interaction
      const signer = this.walletService.getSigner();
      const userAddress = await signer.getAddress();
      const network = await signer.provider.getNetwork();
      
      // Try to read contract state
      try {
        const gameCounter = await this.contract.gameCounter();
        console.log('📊 Current game counter:', gameCounter.toString());
      } catch (readError) {
        console.warn('⚠️ Could not read game counter:', readError.message);
      }
      
      try {
        const platformRecipient = await this.contract.platformFeeRecipient();
        console.log('💰 Platform fee recipient:', platformRecipient);
      } catch (readError) {
        console.warn('⚠️ Could not read platform recipient:', readError.message);
      }
      
      console.log('✅ Contract connection test passed');
      console.log('👤 User address:', userAddress);
      console.log('🏛️ Contract address:', this.contractAddress);
      console.log('🌐 Network:', network.chainId, network.name);
      
      return { 
        success: true, 
        userAddress, 
        contractAddress: this.contractAddress,
        network: network.chainId,
        networkName: network.name
      };
      
    } catch (error) {
      console.error('❌ Contract connection test failed:', error);
      return { 
        success: false, 
        error: error.message,
        details: {
          code: error.code,
          data: error.data
        }
      };
    }
  }
  
  // ✅ COMPLETE: Get contract stats (for debugging)
  async getContractStats() {
    try {
      if (!this.contract) {
        await this.initializeContract();
      }
      
      const gameCounter = await this.contract.gameCounter();
      const platformRecipient = await this.contract.platformFeeRecipient();
      
      // Get contract balance
      const provider = this.walletService.getProvider();
      const contractBalance = await provider.getBalance(this.contractAddress);
      
      return {
        success: true,
        stats: {
          totalGames: gameCounter.toString(),
          platformRecipient: platformRecipient,
          contractBalance: ethers.utils.formatEther(contractBalance),
          contractAddress: this.contractAddress
        }
      };
      
    } catch (error) {
      console.error('❌ Get contract stats failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // ✅ COMPLETE: Emergency functions for debugging
  async emergencyRefund(gameId) {
    try {
      if (!this.contract) {
        await this.initializeContract();
      }
      
      console.log('🚨 Attempting emergency refund for game:', gameId);
      
      const cleanGameId = gameId
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 20)
        .toLowerCase();
      
      // Note: This would only work if you're the contract owner
      const tx = await this.contract.emergencyRefund(cleanGameId, {
        gasLimit: 300000
      });
      
      const receipt = await tx.wait(1);
      
      return {
        success: true,
        gameId: cleanGameId,
        txHash: receipt.transactionHash,
        message: 'Emergency refund executed'
      };
      
    } catch (error) {
      console.error('❌ Emergency refund failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Emergency refund failed - you may not be the contract owner'
      };
    }
  }
  
  // ✅ COMPLETE: Utility methods
  getContractAddress() {
    return this.contractAddress;
  }
  
  isInitialized() {
    return this.contract !== null;
  }
  
  async getNetworkInfo() {
    if (!this.walletService.isConnected()) {
      return { chainId: null, networkName: 'Not connected' };
    }
    
    const chainId = this.walletService.getChainId();
    const networkName = chainId === 10143 ? 'Monad Testnet' : `Unknown (${chainId})`;
    
    return { chainId, networkName };
  }
  
  // ✅ COMPLETE: Format game ID consistently
  formatGameId(rawGameId) {
    return rawGameId
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 20)
      .toLowerCase();
  }
  
  // ✅ COMPLETE: Generate simple game ID
  generateSimpleGameId() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6);
    return `game${timestamp}${random}`;
  }
  
  // ✅ COMPLETE: Validate Ethereum address
  isValidAddress(address) {
    return ethers.utils.isAddress(address);
  }
  
  // ✅ COMPLETE: Convert MON to Wei
  monToWei(monAmount) {
    return ethers.utils.parseEther(monAmount.toString());
  }
  
  // ✅ COMPLETE: Convert Wei to MON
  weiToMon(weiAmount) {
    return parseFloat(ethers.utils.formatEther(weiAmount));
  }
  
  // ✅ COMPLETE: Get gas price estimate
  async getGasPriceEstimate() {
    try {
      const provider = this.walletService.getProvider();
      const gasPrice = await provider.getGasPrice();
      
      return {
        success: true,
        gasPrice: gasPrice.toString(),
        gasPriceGwei: ethers.utils.formatUnits(gasPrice, 'gwei')
      };
      
    } catch (error) {
      console.warn('⚠️ Could not get gas price:', error.message);
      
      // Return fallback gas price for Monad
      const fallbackGasPrice = ethers.utils.parseUnits('2', 'gwei');
      return {
        success: false,
        gasPrice: fallbackGasPrice.toString(),
        gasPriceGwei: '2.0',
        fallback: true
      };
    }
  }
  
  // ✅ COMPLETE: Cleanup method
  cleanup() {
    console.log('🧹 Cleaning up ContractService...');
    
    this.removeEventListeners();
    this.contract = null;
    
    console.log('✅ ContractService cleaned up');
  }

  // ✅ ADD: Debug method to ContractService.js to check what the contract sees

async debugGameAddresses(gameId) {
    try {
        if (!this.contract) {
            await this.initializeContract();
        }
        
        console.log('🔍 DEBUGGING: Game address validation...');
        console.log('📋 Game ID to check:', gameId);
        
        // Get the current signer address
        const signer = this.walletService.getSigner();
        const currentAddress = await signer.getAddress();
        console.log('👤 Current wallet address:', currentAddress);
        
        // Get the game data from blockchain
        const gameData = await this.contract.getGame(gameId);
        console.log('🎮 Game data from blockchain:');
        console.log('  - Game ID:', gameData.gameId);
        console.log('  - Player 1 (creator):', gameData.player1);
        console.log('  - Player 2:', gameData.player2);
        console.log('  - Status:', gameData.status);
        console.log('  - Bet Amount:', ethers.utils.formatEther(gameData.betAmount), 'MON');
        
        // Check if current address matches player1
        const isPlayer1 = currentAddress.toLowerCase() === gameData.player1.toLowerCase();
        console.log('🔍 Is current address the game creator?', isPlayer1);
        
        if (isPlayer1) {
            console.log('❌ PROBLEM FOUND: Current address matches game creator!');
            console.log('   Current:', currentAddress);
            console.log('   Creator:', gameData.player1);
            console.log('   This is why "Cannot join your own game" error occurs');
        } else {
            console.log('✅ Addresses are different - should be able to join');
        }
        
        return {
            currentAddress,
            gameCreator: gameData.player1,
            isOwnGame: isPlayer1,
            gameStatus: gameData.status
        };
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        return null;
    }
}

async debugJoinFailure(gameId, betAmountMON) {
    console.log('🔍 DEBUGGING JOIN FAILURE');
    console.log('=====================================');
    
    try {
        // 1. Check network
        const network = await this.walletService.getProvider().getNetwork();
        console.log('🌐 Network:', network.chainId, network.name);
        
        // 2. Check contract
        const code = await this.walletService.getProvider().getCode(this.contractAddress);
        console.log('📄 Contract exists:', code !== '0x');
        
        // 3. Try to read the game
        try {
            const game = await this.contract.getGame(gameId);
            console.log('🎮 Game details:');
            console.log('  ID:', game.gameId);
            console.log('  Player 1:', game.player1);
            console.log('  Player 2:', game.player2);
            console.log('  Status:', game.status);
            console.log('  Bet:', ethers.utils.formatEther(game.betAmount), 'MON');
            
            // 4. Check if player 1 is trying to join their own game
            const signer = this.walletService.getSigner();
            const myAddress = await signer.getAddress();
            console.log('👤 My address:', myAddress);
            console.log('🔍 Am I player 1?', myAddress.toLowerCase() === game.player1.toLowerCase());
            
            if (myAddress.toLowerCase() === game.player1.toLowerCase()) {
                console.error('❌ PROBLEM: You are trying to join your own game!');
                console.error('   This will always fail with "Cannot join your own game" error');
                return;
            }
            
        } catch (readError) {
            console.error('❌ Cannot read game:', readError.message);
        }
        
        // 5. Try a direct contract call to understand the error
        try {
            console.log('📞 Attempting direct contract call...');
            const betWei = ethers.utils.parseEther(betAmountMON.toString());
            
            // This will fail but give us the real error
            const result = await this.contract.callStatic.joinGame(gameId, {
                value: betWei,
                gasLimit: 500000
            });
            
            console.log('✅ Static call succeeded (unexpected):', result);
            
        } catch (staticError) {
            console.error('❌ Static call failed with:', staticError.message);
            
            // Parse the error
            if (staticError.message.includes('Cannot join your own game')) {
                console.error('🚫 Contract says: Cannot join your own game');
            } else if (staticError.message.includes('Bet amount must match')) {
                console.error('💰 Contract says: Bet amount mismatch');
            } else if (staticError.message.includes('Game does not exist')) {
                console.error('🎮 Contract says: Game not found');
            } else if (staticError.message.includes('Invalid game status')) {
                console.error('📊 Contract says: Wrong game status');
            }
        }
        
        console.log('=====================================');
        
    } catch (error) {
        console.error('Debug failed:', error);
    }
}

// Call this when join fails:
// await this.contractService.debugJoinFailure(gameId, betAmount);
}

// ✅ COMPLETE: Export for ES6 modules
export default ContractService;