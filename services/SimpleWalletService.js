// services/SimpleWalletService.js - Realistic Mock Following Reown Patterns
export class SimpleWalletService {
  constructor() {
    this.address = null;
    this.balance = null;
    this.isConnecting = false;
    this.chainId = 10143; // Monad Testnet
    
    console.log('🎮 SimpleWalletService initialized (Monad-ready)');
  }
  
  async connect() {
    if (this.isConnecting) {
      return { success: false, error: 'Connection already in progress' };
    }
    
    this.isConnecting = true;
    
    try {
      console.log('🔌 Opening wallet connection modal...');
      
      // Simulate the AppKit modal experience
      const userWantsToConnect = await this.showMockModal();
      
      if (userWantsToConnect) {
        // Simulate wallet connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.address = this.generateMonadAddress();
        this.balance = this.generateTestnetBalance();
        
        console.log('✅ Connected to Monad Testnet');
        console.log('👤 Address:', this.address);
        console.log('💰 Balance:', this.balance.toFixed(4), 'MON');
        console.log('🌐 Network: Monad Testnet (10143)');
        
        this.isConnecting = false;
        
        // Dispatch connection event (like real AppKit does)
        window.dispatchEvent(new CustomEvent('walletConnected', {
          detail: { address: this.address, balance: this.balance, chainId: this.chainId }
        }));
        
        return {
          success: true,
          address: this.address,
          balance: this.balance,
          chainId: this.chainId
        };
      } else {
        this.isConnecting = false;
        return { success: false, error: 'User cancelled connection' };
      }
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.isConnecting = false;
      return { success: false, error: error.message };
    }
  }
  
  async showMockModal() {
    // Simulate AppKit modal - in real version this would be the actual modal
    return new Promise((resolve) => {
      const userConfirm = confirm(
        '🎮 Connect to Monad RPS Game?\n\n' +
        '• Network: Monad Testnet\n' +
        '• This will connect your wallet\n' +
        '• You can disconnect anytime\n\n' +
        'Click OK to connect, Cancel to abort.'
      );
      resolve(userConfirm);
    });
  }
  
  async updateBalance() {
    if (!this.address) return null;
    
    try {
      // Simulate realistic balance changes (like getting testnet tokens or small transactions)
      const change = (Math.random() - 0.5) * 0.05; // Small changes
      this.balance = Math.max(0, this.balance + change);
      
      return this.balance;
      
    } catch (error) {
      console.error('❌ Balance update failed:', error);
      return null;
    }
  }
  
  async disconnect() {
    console.log('🔌 Disconnecting from Monad Testnet...');
    
    this.address = null;
    this.balance = null;
    this.isConnecting = false;
    
    // Dispatch disconnect event (like real AppKit does)
    window.dispatchEvent(new CustomEvent('walletDisconnected'));
    
    console.log('✅ Disconnected from wallet');
  }
  
  isConnected() {
    return this.address !== null;
  }
  
  getAccount() {
    return {
      address: this.address,
      balance: this.balance,
      chainId: this.chainId,
      isConnected: this.isConnected()
    };
  }
  
  getChainId() {
    return this.chainId; // Always Monad Testnet
  }
  
  // Generate realistic Monad testnet address
  generateMonadAddress() {
    const chars = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  }
  
  // Generate realistic testnet balance (0.1 to 10 MON)
  generateTestnetBalance() {
    return Math.random() * 9.9 + 0.1;
  }
  
  formatAddress(address = this.address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}