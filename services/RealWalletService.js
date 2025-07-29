// services/RealWalletService.js - Clean Real Wallet with MetaMask + Ethers (No AppKit)
export class RealWalletService {
  constructor() {
    this.address = null;
    this.balance = null;
    this.isConnecting = false;
    this.chainId = 10143; // Monad Testnet
    this.provider = null;
    this.signer = null;
    
    // Connection state tracking
    this.connectionState = 'disconnected';
    this.lastError = null;
    
    console.log('🔗 RealWalletService initialized - MetaMask + Ethers Integration');
    console.log('⚡ Target Network: Monad Testnet (10143)');
    
    // Initialize provider when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeProvider());
    } else {
      this.initializeProvider();
    }
  }
  
  // Initialize Web3 provider (MetaMask)
  async initializeProvider() {
    try {
        // Wait a bit for ethers to be fully loaded
        if (typeof window.ethers === 'undefined') {
            console.log('⏳ Waiting for Ethers.js to load...');
            setTimeout(() => this.initializeProvider(), 100);
            return;
        }
        
        if (typeof window.ethereum !== 'undefined') {
            console.log('🦊 MetaMask detected');
            
            // ✅ ENHANCED: Create provider with fallback RPC configuration
            this.provider = new ethers.providers.Web3Provider(window.ethereum, {
                name: 'monad-testnet',
                chainId: 10143,
                // ✅ Add custom RPC configuration for better reliability
                ensAddress: null,
                _defaultProvider: () => {
                    // Fallback to direct RPC if MetaMask fails
                    return new ethers.providers.JsonRpcProvider({
                        url: 'https://testnet-rpc.monad.xyz',
                        timeout: 30000, // 30 second timeout
                        throttleLimit: 1 // Limit concurrent requests
                    });
                }
            });
            
            // ✅ ENHANCED: Configure provider settings for Monad testnet
            this.provider.pollingInterval = 2000; // Poll every 2 seconds instead of 4
            
            // ✅ Add RPC error event listener
            this.provider.on('error', (error) => {
                console.warn('🌐 Provider RPC error detected:', error.message);
                
                // Don't throw, just log - let the retry logic handle it
                if (error.code === -32603) {
                    console.log('📡 Internal JSON-RPC error - this is common on Monad testnet');
                }
            });
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('✅ Enhanced provider initialized with fallback RPC configuration');
            
        } else {
            console.warn('⚠️ MetaMask not detected');
            this.connectionState = 'error';
            this.lastError = 'MetaMask not installed';
        }
        
    } catch (error) {
        console.error('❌ Provider initialization failed:', error);
        this.connectionState = 'error';
        this.lastError = error.message;
    }
}
  
  // Set up MetaMask event listeners
  setupEventListeners() {
    if (!window.ethereum) return;
    
    try {
      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        console.log('👤 Accounts changed:', accounts);
        
        if (accounts.length === 0) {
          // User disconnected
          this.handleDisconnection();
        } else if (accounts[0] !== this.address) {
          // Account switched
          this.address = accounts[0];
          this.updateBalance();
          this.dispatchConnectionEvent();
        }
      });
      
      // Listen for network changes
      window.ethereum.on('chainChanged', (chainId) => {
        const numericChainId = parseInt(chainId, 16);
        console.log('🌐 Network changed:', numericChainId);
        
        this.chainId = numericChainId;
        
        if (numericChainId !== 10143) {
          console.warn('⚠️ Wrong network! Expected Monad Testnet (10143)');
          this.showNetworkSwitchPrompt();
        }
        
        // Update balance when network changes
        if (this.address) {
          this.updateBalance();
        }
      });
      
      console.log('👂 MetaMask event listeners configured');
      
    } catch (error) {
      console.error('❌ Failed to setup event listeners:', error);
    }
  }
  
  // Connect wallet
  async connect() {
    if (this.isConnecting) {
      return { success: false, error: 'Connection already in progress' };
    }
    
    if (!window.ethereum) {
      return { 
        success: false, 
        error: 'MetaMask not installed. Please install MetaMask to play on Monad Testnet.' 
      };
    }
    
    // Check if it's a compatible wallet
    if (window.ethereum.isPhantom) {
      return {
        success: false,
        error: 'Phantom wallet detected. Please use MetaMask for the best Monad experience.'
      };
    }
    
    this.isConnecting = true;
    this.connectionState = 'connecting';
    
    try {
      console.log('🔌 Requesting wallet connection...');
      
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask');
      }
      
      this.address = accounts[0];
      this.signer = this.provider.getSigner();
      
      // Check/switch network
      await this.ensureCorrectNetwork();
      
      // Fetch balance
      await this.updateBalance();
      
      this.connectionState = 'connected';
      this.isConnecting = false;
      
      console.log('✅ Wallet connected successfully');
      console.log('👤 Address:', this.address);
      console.log('💰 Balance:', this.balance, 'MON');
      console.log('🌐 Network:', this.chainId);
      
      this.dispatchConnectionEvent();
      
      return {
        success: true,
        address: this.address,
        balance: this.balance || 0,
        chainId: this.chainId
      };
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.isConnecting = false;
      this.connectionState = 'error';
      this.lastError = error.message;
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  // Ensure user is on Monad Testnet
  async ensureCorrectNetwork() {
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    const numericChainId = parseInt(currentChainId, 16);
    
    if (numericChainId !== 10143) {
      console.log('🌐 Wrong network detected, attempting to switch...');
      await this.switchToMonadTestnet();
    }
  }
  
  // Switch to Monad Testnet
  async switchToMonadTestnet() {
    try {
      console.log('🔄 Switching to Monad Testnet...');
      
      // Try to switch to Monad Testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x279F' }], // 10143 in hex
      });
      
      console.log('✅ Switched to Monad Testnet');
      
    } catch (switchError) {
      // Network not added to MetaMask, add it
      if (switchError.code === 4902) {
        try {
          console.log('➕ Adding Monad Testnet to wallet...');
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x279F', // 10143 in hex
              chainName: 'Monad Testnet',
              nativeCurrency: {
                name: 'MON',
                symbol: 'MON',
                decimals: 18,
              },
              rpcUrls: ['https://testnet-rpc.monad.xyz'],
              blockExplorerUrls: ['https://explorer.monad.xyz'],
            }],
          });
          
          console.log('✅ Monad Testnet added to wallet');
          
        } catch (addError) {
          console.error('❌ Failed to add Monad Testnet:', addError);
          
          // More specific error messages
          if (window.ethereum.isPhantom) {
            throw new Error('Phantom wallet does not support Monad Testnet. Please use MetaMask.');
          } else {
            throw new Error('Failed to add Monad Testnet to your wallet. Please add it manually.');
          }
        }
      } else if (switchError.code === 4001) {
        throw new Error('Network switch cancelled by user');
      } else {
        console.error('❌ Failed to switch network:', switchError);
        
        if (window.ethereum.isPhantom) {
          throw new Error('Phantom wallet does not support Monad Testnet. Please use MetaMask.');
        } else {
          throw new Error('Failed to switch to Monad Testnet. Please switch manually in your wallet.');
        }
      }
    }
  }
  
  // Update balance from blockchain
  async updateBalance() {
    if (!this.address || !this.provider) {
        return null;
    }
    
    // ✅ ENHANCED: Balance fetching with RPC retry
    const maxBalanceAttempts = 3;
    let balanceAttempt = 0;
    
    while (balanceAttempt < maxBalanceAttempts) {
        try {
            balanceAttempt++;
            console.log(`💰 Balance fetch attempt ${balanceAttempt}/${maxBalanceAttempts}...`);
            
            const balance = await this.provider.getBalance(this.address, 'latest');
            this.balance = parseFloat(ethers.utils.formatEther(balance));
            
            console.log('✅ Balance updated:', this.balance.toFixed(6), 'MON');
            return this.balance;
            
        } catch (error) {
            console.warn(`⚠️ Balance attempt ${balanceAttempt} failed:`, error.message);
            
            const isRPCError = error.code === -32603 || 
                              error.message.includes('Internal JSON-RPC error');
            
            if (isRPCError && balanceAttempt < maxBalanceAttempts) {
                console.log(`🌐 RPC error during balance fetch, retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            } else {
                console.error('❌ Balance fetch failed after all attempts:', error.message);
                return null;
            }
        }
    }
    
    return null;
}
  
  // Handle disconnection
  handleDisconnection() {
    console.log('🔌 Wallet disconnected');
    
    this.address = null;
    this.balance = null;
    this.signer = null;
    this.connectionState = 'disconnected';
    this.lastError = null;
    
    // Dispatch disconnection event
    window.dispatchEvent(new CustomEvent('walletDisconnected'));
  }
  
  // Dispatch connection event
  dispatchConnectionEvent() {
    window.dispatchEvent(new CustomEvent('walletConnected', {
      detail: { 
        address: this.address, 
        balance: this.balance || 0, 
        chainId: this.chainId 
      }
    }));
  }
  
  // Show network switch prompt
  showNetworkSwitchPrompt() {
    const shouldSwitch = confirm(
      'You are connected to the wrong network.\n\n' +
      'This app requires Monad Testnet.\n\n' +
      'Click OK to switch networks automatically.'
    );
    
    if (shouldSwitch) {
      this.switchToMonadTestnet().catch(error => {
        console.error('Network switch failed:', error);
        alert('Failed to switch to Monad Testnet. Please switch manually in MetaMask.');
      });
    }
  }
  
  // Disconnect wallet
  async disconnect() {
    try {
      console.log('🔌 Disconnecting wallet...');
      
      this.handleDisconnection();
      
      console.log('✅ Wallet disconnected');
      
    } catch (error) {
      console.error('❌ Disconnect failed:', error);
      this.lastError = error.message;
    }
  }
  
  // Check if wallet is connected
  isConnected() {
    return this.connectionState === 'connected' && this.address !== null;
  }
  
  // Get account information
  getAccount() {
    return {
      address: this.address,
      balance: this.balance,
      chainId: this.chainId,
      isConnected: this.isConnected(),
      connectionState: this.connectionState,
      lastError: this.lastError
    };
  }
  
  // Get current chain ID
  getChainId() {
    return this.chainId;
  }
  
  // Check if on correct network
  isCorrectNetwork() {
    return this.chainId === 10143;
  }
  
  // Get connection state for UI
  getConnectionState() {
    return {
      state: this.connectionState,
      isConnecting: this.isConnecting,
      isConnected: this.isConnected(),
      error: this.lastError,
      needsNetworkSwitch: !this.isCorrectNetwork() && this.isConnected()
    };
  }
  
  // Format address for display
  formatAddress(address = this.address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
  
  // Get provider for contract interactions
  getProvider() {
    return this.provider;
  }
  
  // Get signer for transactions
  getSigner() {
    return this.signer;
  }

  async forceBalanceUpdate() {
    if (!this.address || !this.provider) {
        return null;
    }
    
    try {
        console.log('💰 Force updating balance...');
        
        // Use 'latest' to get most recent balance
        const balance = await this.provider.getBalance(this.address, 'latest');
        const oldBalance = this.balance;
        this.balance = parseFloat(ethers.utils.formatEther(balance));
        
        console.log('💰 Balance updated:', oldBalance, '→', this.balance, 'MON');
        
        // Dispatch balance update event
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
            detail: { 
                oldBalance: oldBalance,
                newBalance: this.balance,
                address: this.address
            }
        }));
        
        return this.balance;
        
    } catch (error) {
        console.error('❌ Force balance update failed:', error);
        return null;
    }
  }
}

