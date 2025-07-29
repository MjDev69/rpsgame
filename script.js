// =============================================================================
// PHASE 1: CONNECTION QUEUE SYSTEM
// Replace the existing Web3 connection code in script.js
// =============================================================================

const MONAD_CONFIG = {
    chainId: 10143,
    chainName: 'Monad Testnet',
    nativeCurrency: {
        name: 'MON',
        symbol: 'MON',
        decimals: 18
    },
    rpcUrls: ['https://testnet-rpc.monad.xyz'],
    blockExplorerUrls: ['https://testnet-explorer.monad.xyz']
};

let connectionInProgress = false;

// =============================================================================
// CONNECTION QUEUE MANAGER - NEW
// =============================================================================
class WalletConnectionManager {
    constructor() {
        this.isConnecting = false;
        this.connectionQueue = [];
        this.connectionPromise = null;
        this.maxRetries = 3;
        this.retryDelay = 1000; // Start with 1 second
        this.maxRetryDelay = 5000; // Max 5 seconds
        
        console.log('🔗 WalletConnectionManager initialized');
    }
    
    /**
     * Main connection method - handles queuing and state management
     */
    async connect() {
        console.log('🔗 Connection requested, checking queue status...');
        
        // If already connecting, return the existing promise
        if (this.isConnecting && this.connectionPromise) {
            console.log('🔄 Connection already in progress, joining existing attempt');
            return this.connectionPromise;
        }
        
        // If not connecting, start new connection
        this.connectionPromise = this._performConnection();
        return this.connectionPromise;
    }
    
    /**
     * Internal connection logic with retry handling
     */
    async _performConnection() {
        this.isConnecting = true;
        
        try {
            console.log('🚀 Starting connection process...');
            
            // Step 1: Check MetaMask availability
            this._checkMetaMaskAvailability();
            
            // Step 2: Attempt connection with retry logic
            const accounts = await this._connectWithRetry();
            
            // Step 3: Set up Web3 provider
            await this._setupWeb3Provider(accounts[0]);
            
            // Step 4: Ensure correct network
            await this._ensureCorrectNetwork();
            
            // Step 5: Get balance
            await this._updateBalance();
            
            // Step 6: Set up event listeners
            this._setupEventListeners();
            
            // Step 7: Update application state
            this._updateApplicationState(true);
            
            console.log('✅ Connection completed successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Connection failed:', error);
            this._updateApplicationState(false);
            throw this._createUserFriendlyError(error);
            
        } finally {
            this.isConnecting = false;
            this.connectionPromise = null;
        }
    }
    
    /**
     * Connection with retry logic for -32002 errors
     */
    async _connectWithRetry() {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`🔄 Connection attempt ${attempt}/${this.maxRetries}`);
                
                const accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
                
                if (!accounts || accounts.length === 0) {
                    throw new Error('No accounts returned from wallet');
                }
                
                console.log('✅ Connection successful on attempt', attempt);
                return accounts;
                
            } catch (error) {
                lastError = error;
                console.log(`❌ Attempt ${attempt} failed:`, error.code, error.message);
                
                // Handle specific error types
                if (error.code === -32002) {
                    // "Already processing eth_requestAccounts" error
                    console.log('⏳ MetaMask is processing another request...');
                    
                    if (attempt < this.maxRetries) {
                        const delay = Math.min(this.retryDelay * attempt, this.maxRetryDelay);
                        console.log(`⏰ Waiting ${delay}ms before retry...`);
                        await this._delay(delay);
                        continue;
                    }
                } else if (error.code === 4001) {
                    // User rejected - don't retry
                    console.log('🚫 User rejected connection');
                    throw error;
                } else if (error.code === -32603) {
                    // Internal error - might be temporary
                    if (attempt < this.maxRetries) {
                        const delay = this.retryDelay * attempt;
                        console.log(`⏰ Internal error, waiting ${delay}ms before retry...`);
                        await this._delay(delay);
                        continue;
                    }
                }
                
                // For other errors or max retries reached, throw
                if (attempt === this.maxRetries) {
                    console.log('💥 All connection attempts failed');
                    throw lastError;
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * Check if MetaMask is available
     */
    _checkMetaMaskAvailability() {
        if (!window.ethereum) {
            throw new Error('METAMASK_NOT_FOUND');
        }
        
        if (!window.ethereum.isMetaMask) {
            console.warn('⚠️ Non-MetaMask wallet detected');
        }
        
        console.log('✅ MetaMask availability confirmed');
    }
    
    /**
     * Set up Web3 provider and signer
     */
    async _setupWeb3Provider(account) {
        console.log('🔧 Setting up Web3 provider...');
        
        web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = web3Provider.getSigner();
        connectedAccount = account;
        
        console.log('✅ Web3 provider configured for account:', account);
    }
    
    /**
     * Ensure we're on the correct network
     */
    async _ensureCorrectNetwork() {
        console.log('🌐 Checking network...');
        
        try {
            const network = await web3Provider.getNetwork();
            console.log('📡 Current network:', network.chainId);
            
            if (network.chainId === MONAD_CONFIG.chainId) {
                isCorrectNetwork = true;
                console.log('✅ Already on Monad Testnet');
                return;
            }
            
            console.log('🔄 Wrong network, switching to Monad Testnet...');
            await this._switchToMonadNetwork();
            
        } catch (error) {
            console.error('❌ Network check/switch failed:', error);
            isCorrectNetwork = false;
            throw error;
        }
    }
    
    /**
     * Switch to Monad Testnet
     */
    async _switchToMonadNetwork() {
        try {
            // Try to switch to Monad Testnet
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${MONAD_CONFIG.chainId.toString(16)}` }]
            });
            
            isCorrectNetwork = true;
            console.log('✅ Successfully switched to Monad Testnet');
            
        } catch (switchError) {
            console.log('📝 Network not found, adding Monad Testnet...');
            
            // If network doesn't exist, add it
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: `0x${MONAD_CONFIG.chainId.toString(16)}`,
                        chainName: MONAD_CONFIG.chainName,
                        nativeCurrency: MONAD_CONFIG.nativeCurrency,
                        rpcUrls: MONAD_CONFIG.rpcUrls,
                        blockExplorerUrls: MONAD_CONFIG.blockExplorerUrls
                    }]
                });
                
                isCorrectNetwork = true;
                console.log('✅ Successfully added and switched to Monad Testnet');
            } else {
                throw switchError;
            }
        }
    }
    
    /**
     * Update account balance
     */
    async _updateBalance() {
        try {
            console.log('💰 Fetching balance...');
            
            const balanceWei = await web3Provider.getBalance(connectedAccount);
            const balanceEth = ethers.utils.formatEther(balanceWei);
            accountBalance = parseFloat(balanceEth);
            
            console.log('💰 Balance updated:', accountBalance, 'MON');
            
        } catch (error) {
            console.error('❌ Failed to fetch balance:', error);
            accountBalance = 0;
        }
    }
    
    /**
     * Set up wallet event listeners
     */
    _setupEventListeners() {
        console.log('👂 Setting up wallet event listeners...');
        
        if (!window.ethereum) return;
        
        // Remove existing listeners first
        this._removeEventListeners();
        
        // Account changes
        window.ethereum.on('accountsChanged', this._handleAccountsChanged.bind(this));
        
        // Network changes  
        window.ethereum.on('chainChanged', this._handleChainChanged.bind(this));
        
        console.log('✅ Event listeners configured');
    }
    
    /**
     * Remove event listeners
     */
    _removeEventListeners() {
        if (window.ethereum && window.ethereum.removeListener) {
            window.ethereum.removeListener('accountsChanged', this._handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', this._handleChainChanged);
        }
    }
    
    /**
     * Handle account changes
     */
    async _handleAccountsChanged(accounts) {
        console.log('👤 Accounts changed:', accounts);
        
        if (accounts.length === 0) {
            // User disconnected
            await this.disconnect();
        } else if (accounts[0] !== connectedAccount) {
            // User switched accounts
            connectedAccount = accounts[0];
            await this._updateBalance();
            this._updateApplicationState(true);
            
            if (window.monadRPS) {
                window.monadRPS.showToast('Account switched', 'info');
            }
        }
    }
    
    /**
     * Handle network changes
     */
    async _handleChainChanged(chainId) {
        console.log('🌐 Chain changed:', chainId);
        
        const newChainId = parseInt(chainId, 16);
        isCorrectNetwork = newChainId === MONAD_CONFIG.chainId;
        
        if (isCorrectNetwork) {
            console.log('✅ Switched to Monad Testnet');
            await this._updateBalance();
            
            if (window.monadRPS) {
                window.monadRPS.showToast('Connected to Monad Testnet', 'success');
            }
        } else {
            console.log('⚠️ Switched to wrong network');
            
            if (window.monadRPS) {
                window.monadRPS.showToast('Please switch to Monad Testnet', 'warning');
            }
        }
        
        this._updateNetworkIndicator();
    }
    
    /**
     * Update application state
     */
    _updateApplicationState(connected) {
        if (!window.monadRPS) return;
        
        window.monadRPS.state.wallet = {
            connected: connected,
            address: connected ? connectedAccount : null,
            balance: connected ? accountBalance : 0
        };
        
        // Update displays
        window.monadRPS.updateWalletDisplay();
        
        // Navigate appropriately
        if (connected && isCorrectNetwork) {
            window.monadRPS.showScreen('gameMode');
        } else if (!connected) {
            window.monadRPS.showScreen('landing');
        }
    }
    
    /**
     * Update network indicator
     */
    _updateNetworkIndicator() {
        const networkText = document.getElementById('networkText');
        
        if (networkText) {
            networkText.textContent = isCorrectNetwork ? 'Monad Testnet' : 'Wrong Network';
        }
    }
    
    /**
     * Disconnect wallet
     */
    async disconnect() {
        console.log('🔌 Disconnecting wallet...');
        
        // Reset state
        web3Provider = null;
        signer = null;
        connectedAccount = null;
        accountBalance = null;
        isCorrectNetwork = false;
        
        // Remove event listeners
        this._removeEventListeners();
        
        // Update application state
        this._updateApplicationState(false);
        
        console.log('✅ Wallet disconnected');
    }
    
    /**
     * Create user-friendly error messages
     */
    _createUserFriendlyError(error) {
        console.log('🔄 Creating user-friendly error for:', error.code, error.message);
        
        // Map technical errors to user-friendly messages
        const errorMap = {
            'METAMASK_NOT_FOUND': 'Please install MetaMask to play',
            4001: 'Connection was cancelled',
            '-32002': 'Please check MetaMask for pending requests',
            '-32603': 'Connection failed. Please try again.',
            'No accounts returned': 'No accounts found. Please unlock your wallet.'
        };
        
        // Check for specific error codes
        if (error.code && errorMap[error.code]) {
            return new Error(errorMap[error.code]);
        }
        
        // Check for specific error messages
        if (error.message) {
            for (const [key, message] of Object.entries(errorMap)) {
                if (error.message.includes(key)) {
                    return new Error(message);
                }
            }
        }
        
        // Default fallback
        return new Error('Failed to connect wallet. Please try again.');
    }
    
    /**
     * Utility: Delay function
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get connection status
     */
    isConnected() {
        return !!(web3Provider && signer && connectedAccount && isCorrectNetwork);
    }
    
    /**
     * Get current account
     */
    getAccount() {
        return connectedAccount;
    }
    
    /**
     * Get Web3 provider
     */
    getProvider() {
        return web3Provider;
    }
    
    /**
     * Get signer
     */
    getSigner() {
        return signer;
    }
    
    /**
     * Get balance
     */
    async getBalance() {
        await this._updateBalance();
        return accountBalance;
    }
}

// =============================================================================
// UPDATED GLOBAL STATE AND FUNCTIONS
// =============================================================================

// Web3 State Management (keeping existing structure)
let web3Provider = null;
let signer = null;
let connectedAccount = null;
let accountBalance = null;
let isCorrectNetwork = false;

// Create global connection manager instance
const walletConnectionManager = new WalletConnectionManager();

// =============================================================================
// UPDATED PUBLIC API FUNCTIONS
// =============================================================================

async function connectWalletWithEthers() {
    console.log('🔗 Public connect function called');
    
    try {
        await walletConnectionManager.connect();
        updateWalletStatusIndicator();
        return true;
        
    } catch (error) {
        console.error('❌ Connection failed:', error);
        throw error; // Let the UI handle the user-friendly error
    }
}

async function disconnectWallet() {
    console.log('🔌 Public disconnect function called');
    
    try {
        await walletConnectionManager.disconnect();
        updateWalletStatusIndicator();
        
    } catch (error) {
        console.error('❌ Error disconnecting wallet:', error);
        throw new Error('Error disconnecting wallet');
    }
}

// =============================================================================
// UPDATED UTILITY FUNCTIONS (keeping existing structure)
// =============================================================================

function updateWalletStatusIndicator() {
    const connectBtn = document.getElementById('connectBtn');
    if (!connectBtn) return;
    
    if (!window.ethereum) {
        connectBtn.innerHTML = '<span class="btn-text">Install MetaMask</span>';
    } else if (walletConnectionManager.isConnected()) {
        connectBtn.innerHTML = '<span class="btn-text">Wallet Connected</span>';
    } else {
        connectBtn.innerHTML = '<span class="btn-text">Connect Wallet</span>';
    }
}

function formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function formatBalance(balance) {
    if (balance === null || balance === undefined) return '0.000';
    return Number(balance).toFixed(3);
}

function isWalletConnected() {
    return walletConnectionManager.isConnected();
}

// =============================================================================
// UPDATED INITIALIZATION
// =============================================================================

async function initializeWeb3() {
    console.log('🚀 Initializing Web3 with Connection Manager...');
    
    // Don't try to auto-connect, just check if wallet is available
    if (window.ethereum) {
        console.log('👛 MetaMask detected');
        
        // Set up listeners (the connection manager will handle these)
        // No auto-connection attempts here to avoid conflicts
        
    } else {
        console.log('❌ No wallet detected');
    }
    
    // Update button status
    updateWalletStatusIndicator();
}

// =============================================================================
// UPDATED GLOBAL API
// =============================================================================

window.monadWeb3 = {
    connect: connectWalletWithEthers,
    disconnect: disconnectWallet,
    getBalance: () => walletConnectionManager.getBalance(),
    switchNetwork: () => walletConnectionManager._switchToMonadNetwork(),
    isConnected: () => walletConnectionManager.isConnected(),
    getAccount: () => walletConnectionManager.getAccount(),
    getProvider: () => walletConnectionManager.getProvider(),
    getSigner: () => walletConnectionManager.getSigner()
};

// =============================================================================
// AUTO-INITIALIZE (keeping existing structure)
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎮 Initializing Monad RPS with Connection Manager...');
    
    // Initialize Web3
    await initializeWeb3();
    
    // Initialize the game
    const game = new MonadRPS();
    window.monadRPS = game;
    
    console.log('✅ Monad RPS with enhanced wallet connection ready!');
});




// =============================================================================
// EVENT MANAGER CLASS - NEW ADDITION
// =============================================================================
class EventManager {
    constructor() {
        this.listeners = new Map(); // Track all listeners
        this.boundMethods = new Map(); // Store bound method references
    }
    
    // Store bound method reference for cleanup
    bindMethod(instance, methodName) {
    const key = `${instance.constructor.name}_${methodName}`;
    
    // Check if method exists first
    if (typeof instance[methodName] !== 'function') {
        console.error(`❌ Method '${methodName}' does not exist on ${instance.constructor.name}`);
        return null;
    }
    
    if (!this.boundMethods.has(key)) {
        this.boundMethods.set(key, instance[methodName].bind(instance));
    }
    return this.boundMethods.get(key);
}
    
    // Add listener with tracking
    addListener(element, event, handler, identifier) {
        if (!element) return false;
        
        element.addEventListener(event, handler);
        
        // Track for cleanup
        const listenerKey = `${identifier}_${event}`;
        if (!this.listeners.has(listenerKey)) {
            this.listeners.set(listenerKey, []);
        }
        this.listeners.get(listenerKey).push({ element, event, handler });
        
        return true;
    }
    
    // Remove specific listeners
    removeListeners(identifier) {
        for (const [key, listeners] of this.listeners.entries()) {
            if (key.startsWith(identifier)) {
                listeners.forEach(({ element, event, handler }) => {
                    element.removeEventListener(event, handler);
                });
                this.listeners.delete(key);
            }
        }
    }
    
    // Clean up everything
    cleanup() {
        for (const [key, listeners] of this.listeners.entries()) {
            listeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
        }
        this.listeners.clear();
        this.boundMethods.clear();
    }
}

// =============================================================================
// MULTISYNQ CONFIGURATION
// =============================================================================
const MULTISYNQ_CONFIG = {
    apiKey: '277qeuC4t77iN8IT7QrsEeeZghlSMRVgcTC0H0T7A0',
    appId: 'com.rpsmonad.rockpaperscissors',
    debug: ['session', 'messages']
};

// =============================================================================
// MULTISYNQ MODEL - Synchronized Game State (WITH PHASE 1 STATE VALIDATION)
// =============================================================================
class RockPaperScissorsModel extends Multisynq.Model {
    init() {
        console.log('🎮 RPS Model initialized');
        
        // Game Configuration
        this.config = {
            maxRounds: 3,
            roundTimer: 30,
            betAmounts: [0.01, 0.1, 1, 10]
        };
        
        // Session State
        this.sessionType = null; // 'random' or 'private'
        this.betAmount = null;
        this.isHost = false;
        this.gameCode = null;
        
        // Players
        this.players = new Map(); // viewId -> player data
        this.playerOrder = []; // Ordered list of viewIds
        this.maxPlayers = 2;
        
        // Game State
        this.gameState = 'waiting'; // 'waiting', 'playing', 'finished'
        this.currentRound = 1;
        this.roundTimer = 30;
        this.roundState = 'waiting'; // 'waiting', 'playing', 'revealing', 'complete'
        this.timerInterval = null;
        
        // Round Data
        this.choices = new Map(); // viewId -> choice
        this.scores = new Map(); // viewId -> score
        this.roundHistory = []; // Array of round results
        
        // =============================================================================
        // PHASE 1: REMATCH STATE MACHINE DEFINITIONS
        // =============================================================================
        
        // Define explicit rematch states
        this.REMATCH_STATES = {
            NONE: 'none',
            REQUESTED: 'requested', 
            PENDING: 'pending',
            ACCEPTED: 'accepted',
            DECLINED: 'declined',
            CANCELLED: 'cancelled'
        };
        
        // Define valid state transitions
        this.VALID_TRANSITIONS = {
            [this.REMATCH_STATES.NONE]: [this.REMATCH_STATES.REQUESTED],
            [this.REMATCH_STATES.REQUESTED]: [this.REMATCH_STATES.PENDING, this.REMATCH_STATES.CANCELLED],
            [this.REMATCH_STATES.PENDING]: [this.REMATCH_STATES.ACCEPTED, this.REMATCH_STATES.DECLINED, this.REMATCH_STATES.CANCELLED],
            [this.REMATCH_STATES.ACCEPTED]: [this.REMATCH_STATES.NONE],
            [this.REMATCH_STATES.DECLINED]: [this.REMATCH_STATES.NONE],
            [this.REMATCH_STATES.CANCELLED]: [this.REMATCH_STATES.NONE]
        };
        
        // Initialize rematch state using new enum
        this.rematchState = this.REMATCH_STATES.NONE;
        
        // Play Again (keeping existing structure but will add validation)
        this.playAgainRequests = new Map(); // viewId -> boolean

        // Request tracking for Phase 2
        this.activeRequests = new Map(); // requestId -> request data
        this.REQUEST_TIMEOUT = 30000; // 30 seconds in milliseconds
        
        console.log('🎮 Model ready with state machine validation and request tracking');
        
        // Event Subscriptions (unchanged)
        this.subscribe(this.sessionId, 'view-join', this.handlePlayerJoin);
        this.subscribe(this.sessionId, 'view-exit', this.handlePlayerLeave);
        this.subscribe(this.sessionId, 'player-ready', this.handlePlayerReady);
        this.subscribe(this.sessionId, 'player-choice', this.handlePlayerChoice);
        this.subscribe(this.sessionId, 'forfeit-game', this.handleForfeit);
        this.subscribe(this.sessionId, 'play-again-cancelled', this.handlePlayAgainCancelled);
        this.subscribe(this.sessionId, 'play-again-request', this.handlePlayAgainRequest);
        this.subscribe(this.sessionId, 'play-again-response', this.handlePlayAgainResponse);
        
        console.log('🎮 Model ready with state machine validation');
    }
    
    // =============================================================================
    // PHASE 1: STATE VALIDATION METHODS
    // =============================================================================
    
    /**
     * Check if transition to new state is valid
     */
    canTransitionTo(newState) {
        const validStates = this.VALID_TRANSITIONS[this.rematchState] || [];
        return validStates.includes(newState);
    }
    
    /**
     * Validate state transition and log result
     */
    validateTransition(newState, action = 'unknown') {
        if (!this.canTransitionTo(newState)) {
            console.warn(`❌ Invalid rematch transition: ${this.rematchState} → ${newState} (${action})`);
            console.warn(`❌ Valid transitions from ${this.rematchState}:`, this.VALID_TRANSITIONS[this.rematchState] || 'none');
            return false;
        }
        console.log(`✅ Valid rematch transition: ${this.rematchState} → ${newState} (${action})`);
        return true;
    }
    
    /**
     * Safely transition to new state with validation
     */
    safeTransitionTo(newState, action = 'unknown') {
        if (this.validateTransition(newState, action)) {
            const oldState = this.rematchState;
            this.rematchState = newState;
            console.log(`🔄 Rematch state: ${oldState} → ${newState}`);
            return true;
        }
        console.warn(`🚫 Blocked invalid rematch transition: ${this.rematchState} → ${newState}`);
        return false;
    }
    
    /**
     * Validate game state for rematch operations
     */
    validateGameStateForRematch(action = 'unknown') {
        if (this.gameState !== 'finished') {
            console.warn(`❌ Invalid rematch action '${action}': game state is '${this.gameState}', expected 'finished'`);
            return false;
        }
        return true;
    }
    
    /**
     * Validate player for rematch operations
     */
    validatePlayerForRematch(viewId, action = 'unknown') {
        if (!this.players.has(viewId)) {
            console.warn(`❌ Invalid rematch action '${action}': unknown player ${viewId}`);
            return false;
        }
        
        if (!this.players.get(viewId).connected) {
            console.warn(`❌ Invalid rematch action '${action}': player ${viewId} is disconnected`);
            return false;
        }
        
        return true;
    }

    // =============================================================================
    // PHASE 2A: REQUEST MANAGEMENT METHODS
    // =============================================================================
    
    /**
     * Generate deterministic request ID using Multisynq's synchronized random
     */
    generateRequestId() {
        // Use Multisynq's deterministic random to ensure same ID across all clients
        const timestamp = this.now();
        const randomPart = this.random().toString(36).substring(2, 15);
        const requestId = `req_${timestamp}_${randomPart}`;
        
        console.log('🆔 Generated request ID:', requestId);
        return requestId;
    }
    
    /**
     * Add a new request to tracking system
     */
    addRequest(requestId, requestData) {
        if (this.activeRequests.has(requestId)) {
            console.warn(`❌ Request ID ${requestId} already exists`);
            return false;
        }
        
        const request = {
            id: requestId,
            ...requestData,
            timestamp: this.now(),
            status: 'active',
            timeoutScheduled: false
        };
        
        this.activeRequests.set(requestId, request);
        console.log(`📝 Added request ${requestId}:`, request);
        
        // Schedule automatic cleanup
        this.scheduleRequestTimeout(requestId);
        
        return true;
    }
    
    /**
     * Remove request from tracking system
     */
    removeRequest(requestId) {
        if (!this.activeRequests.has(requestId)) {
            console.warn(`❌ Request ID ${requestId} not found for removal`);
            return false;
        }
        
        const request = this.activeRequests.get(requestId);
        this.activeRequests.delete(requestId);
        console.log(`🗑️ Removed request ${requestId}`);
        
        return true;
    }
    
    /**
     * Get request data by ID
     */
    getRequest(requestId) {
        return this.activeRequests.get(requestId) || null;
    }
    
    /**
     * Check if request exists and is still active
     */
    isRequestActive(requestId) {
        const request = this.activeRequests.get(requestId);
        return request && request.status === 'active';
    }
    
    /**
     * Schedule automatic request timeout using Multisynq future()
     */
    scheduleRequestTimeout(requestId) {
        const request = this.activeRequests.get(requestId);
        if (!request) {
            console.warn(`❌ Cannot schedule timeout for non-existent request ${requestId}`);
            return;
        }
        
        if (request.timeoutScheduled) {
            console.log(`⏰ Timeout already scheduled for request ${requestId}`);
            return;
        }
        
        // Mark as scheduled
        request.timeoutScheduled = true;
        
        // Schedule cleanup using Multisynq's future() for synchronization
        console.log(`⏰ Scheduling timeout for request ${requestId} in ${this.REQUEST_TIMEOUT}ms`);
        this.future(this.REQUEST_TIMEOUT).cleanupRequest(requestId);
    }
    
    /**
     * Clean up expired request (called by scheduled future)
     */
    cleanupRequest(requestId) {
        console.log(`⏰ Cleaning up request ${requestId} due to timeout`);
        
        const request = this.activeRequests.get(requestId);
        if (!request) {
            console.log(`⏰ Request ${requestId} already cleaned up`);
            return;
        }
        
        // Mark as expired
        request.status = 'expired';
        
        // Handle timeout based on request type
        this.handleRequestTimeout(request);
        
        // Remove from active requests
        this.removeRequest(requestId);
    }
    
    /**
     * Handle different types of request timeouts
     */
    handleRequestTimeout(request) {
        console.log(`⏰ Handling timeout for ${request.type} request:`, request.id);
        
        switch(request.type) {
            case 'play-again':
                this.handlePlayAgainTimeout(request);
                break;
            
            default:
                console.warn(`❌ Unknown request type for timeout: ${request.type}`);
        }
    }
    
    /**
     * Handle play-again request timeout specifically
     */
    handlePlayAgainTimeout(request) {
        console.log(`⏰ Play-again request ${request.id} timed out`);
        
        // Reset rematch state if this was the active request
        if (this.rematchState !== this.REMATCH_STATES.NONE) {
            console.log('🔄 Resetting rematch state due to timeout');
            this.safeTransitionTo(this.REMATCH_STATES.CANCELLED, 'request-timeout');
            
            // Clear play again requests
            this.playAgainRequests.clear();
            
            // Reset to NONE after timeout
            this.safeTransitionTo(this.REMATCH_STATES.NONE, 'timeout-cleanup');
        }
        
        // Notify all players about the timeout
        this.publish(this.sessionId, 'play-again-timeout', {
            requestId: request.id,
            requester: request.requester,
            reason: 'timeout',
            message: 'Rematch request timed out after 30 seconds'
        });
        
        this.broadcastGameState();
    }
    
    /**
     * Get all active requests (for debugging)
     */
    getActiveRequests() {
        return Array.from(this.activeRequests.entries()).map(([id, request]) => ({
            id,
            type: request.type,
            requester: request.requester,
            timestamp: request.timestamp,
            status: request.status,
            age: this.now() - request.timestamp
        }));
    }
    
    /**
     * Clean up all requests (for session cleanup)
     */
    cleanupAllRequests() {
        console.log(`🧹 Cleaning up ${this.activeRequests.size} active requests`);
        
        for (const [requestId, request] of this.activeRequests.entries()) {
            console.log(`🧹 Cleaning up request ${requestId}`);
            request.status = 'cancelled';
        }
        
        this.activeRequests.clear();
    }

    // =============================================================================
    // PHASE 3A: CONFLICT DETECTION METHODS
    // =============================================================================
    
    /**
     * Detect if there are conflicting play-again requests
     * @param {string} newRequesterViewId - The player trying to make a new request
     * @param {string} requestType - Type of request (e.g., 'play-again')
     * @returns {Object} Conflict analysis result
     */
    detectRequestConflict(newRequesterViewId, requestType = 'play-again') {
        console.log(`🔍 Checking for conflicts: ${newRequesterViewId} requesting ${requestType}`);
        
        const conflictAnalysis = {
            hasConflict: false,
            conflictType: null,
            existingRequests: [],
            winningRequest: null,
            losingRequests: [],
            resolutionAction: 'proceed'
        };
        
        // Find all active requests of the same type
        const activeRequests = this.getActiveRequestsByType(requestType);
        
        if (activeRequests.length === 0) {
            console.log(`✅ No conflicts: No existing ${requestType} requests`);
            return conflictAnalysis;
        }
        
        // Check if the new requester already has an active request
        const existingRequestFromSamePlayer = activeRequests.find(req => req.requester === newRequesterViewId);
        
        if (existingRequestFromSamePlayer) {
            console.log(`❌ Duplicate request detected: ${newRequesterViewId} already has active request ${existingRequestFromSamePlayer.id}`);
            
            conflictAnalysis.hasConflict = true;
            conflictAnalysis.conflictType = 'duplicate-request';
            conflictAnalysis.existingRequests = [existingRequestFromSamePlayer];
            conflictAnalysis.resolutionAction = 'reject-duplicate';
            
            return conflictAnalysis;
        }
        
        // Check for simultaneous requests from different players
        const requestsFromOtherPlayers = activeRequests.filter(req => req.requester !== newRequesterViewId);
        
        if (requestsFromOtherPlayers.length > 0) {
            console.log(`⚡ Simultaneous requests detected: ${requestsFromOtherPlayers.length} existing requests from other players`);
            
            // Determine winner using conflict resolution rules
            const resolutionResult = this.resolveRequestConflict(requestsFromOtherPlayers, {
                requester: newRequesterViewId,
                timestamp: this.now(),
                type: requestType
            });
            
            conflictAnalysis.hasConflict = true;
            conflictAnalysis.conflictType = 'simultaneous-requests';
            conflictAnalysis.existingRequests = requestsFromOtherPlayers;
            conflictAnalysis.winningRequest = resolutionResult.winner;
            conflictAnalysis.losingRequests = resolutionResult.losers;
            conflictAnalysis.resolutionAction = resolutionResult.action;
            
            return conflictAnalysis;
        }
        
        console.log(`✅ No conflicts detected for ${newRequesterViewId}`);
        return conflictAnalysis;
    }
    
    /**
     * Get all active requests of a specific type
     * @param {string} requestType - Type of request to filter by
     * @returns {Array} Array of active requests of the specified type
     */
    getActiveRequestsByType(requestType) {
        const activeRequests = [];
        
        for (const [requestId, request] of this.activeRequests.entries()) {
            if (request.type === requestType && request.status === 'active') {
                activeRequests.push({
                    id: requestId,
                    ...request
                });
            }
        }
        
        console.log(`📋 Found ${activeRequests.length} active ${requestType} requests`);
        return activeRequests;
    }
    
    /**
     * Resolve conflict between multiple simultaneous requests
     * @param {Array} existingRequests - Array of existing requests
     * @param {Object} newRequest - New request attempting to be created
     * @returns {Object} Resolution result with winner/losers
     */
    resolveRequestConflict(existingRequests, newRequest) {
        console.log(`⚖️ Resolving conflict between ${existingRequests.length} existing requests and new request from ${newRequest.requester}`);
        
        // Create array of all requests (existing + new) for comparison
        const allRequests = [...existingRequests, newRequest];
        
        // Sort requests by resolution priority
        const sortedRequests = this.sortRequestsByPriority(allRequests);
        
        const winner = sortedRequests[0];
        const losers = sortedRequests.slice(1);
        
        console.log(`🏆 Conflict resolution winner: ${winner.requester} (${winner.id || 'new-request'})`);
        console.log(`📝 Conflict resolution losers: ${losers.map(r => `${r.requester} (${r.id || 'new-request'})`).join(', ')}`);
        
        // Determine action based on who won
        let action;
        if (winner.requester === newRequest.requester) {
            action = 'proceed-cancel-others';
        } else {
            action = 'reject-offer-alternative';
        }
        
        return {
            winner: winner,
            losers: losers,
            action: action,
            resolutionRule: 'priority-order'
        };
    }
    
    /**
     * Sort requests by priority for conflict resolution
     * Priority rules:
     * 1. Player order (first player in session has priority)
     * 2. Timestamp (earlier request wins)
     * 3. Request ID (deterministic fallback)
     */
    sortRequestsByPriority(requests) {
        return requests.sort((a, b) => {
            // Rule 1: Player order priority
            const aPlayerIndex = this.playerOrder.indexOf(a.requester);
            const bPlayerIndex = this.playerOrder.indexOf(b.requester);
            
            if (aPlayerIndex !== bPlayerIndex) {
                // Lower index = higher priority (first player wins)
                if (aPlayerIndex === -1) return 1; // Unknown player has lowest priority
                if (bPlayerIndex === -1) return -1; // Unknown player has lowest priority
                return aPlayerIndex - bPlayerIndex;
            }
            
            // Rule 2: Timestamp priority (earlier request wins)
            const aTimestamp = a.timestamp || this.now();
            const bTimestamp = b.timestamp || this.now();
            
            if (aTimestamp !== bTimestamp) {
                return aTimestamp - bTimestamp;
            }
            
            // Rule 3: Request ID priority (deterministic fallback)
            const aId = a.id || 'new-request';
            const bId = b.id || 'new-request';
            
            return aId.localeCompare(bId);
        });
    }
    
    /**
     * Get detailed conflict analysis for debugging
     * @param {Object} conflictAnalysis - Result from detectRequestConflict
     * @returns {Object} Detailed analysis for logging/debugging
     */
    getConflictAnalysisDetails(conflictAnalysis) {
        return {
            hasConflict: conflictAnalysis.hasConflict,
            conflictType: conflictAnalysis.conflictType,
            totalExistingRequests: conflictAnalysis.existingRequests.length,
            existingRequesters: conflictAnalysis.existingRequests.map(r => r.requester),
            winningRequester: conflictAnalysis.winningRequest?.requester || null,
            losingRequesters: conflictAnalysis.losingRequests.map(r => r.requester),
            recommendedAction: conflictAnalysis.resolutionAction,
            currentGameState: this.gameState,
            currentRematchState: this.rematchState,
            playerOrder: this.playerOrder
        };
    }
    
    /**
     * Clean up conflicting requests (prepare for Phase 3B)
     * @param {Array} requestsToCleanup - Array of request objects to remove
     * @returns {number} Number of requests cleaned up
     */
    cleanupConflictingRequests(requestsToCleanup) {
        let cleanedCount = 0;
        
        for (const request of requestsToCleanup) {
            if (request.id && this.activeRequests.has(request.id)) {
                console.log(`🧹 Cleaning up conflicting request: ${request.id} from ${request.requester}`);
                
                // Mark as superseded before removing
                const existingRequest = this.activeRequests.get(request.id);
                existingRequest.status = 'superseded';
                
                // Remove the request
                this.removeRequest(request.id);
                cleanedCount++;
            }
        }
        
        console.log(`🧹 Cleaned up ${cleanedCount} conflicting requests`);
        return cleanedCount;
    }
    
    /**
     * Validate that conflict detection is working correctly
     * @returns {Object} Validation results
     */
    validateConflictDetection() {
        const validation = {
            isWorking: true,
            issues: [],
            activeRequestCount: this.activeRequests.size,
            playerOrderValid: this.playerOrder.length === 2,
            rematchStateValid: Object.values(this.REMATCH_STATES).includes(this.rematchState)
        };
        
        // Check player order
        if (this.playerOrder.length !== 2) {
            validation.isWorking = false;
            validation.issues.push('Invalid player order - expected 2 players');
        }
        
        // Check active requests consistency
        const playAgainRequests = this.getActiveRequestsByType('play-again');
        if (playAgainRequests.length > 2) {
            validation.isWorking = false;
            validation.issues.push(`Too many active play-again requests: ${playAgainRequests.length}`);
        }
        
        // Check rematch state consistency
        if (!validation.rematchStateValid) {
            validation.isWorking = false;
            validation.issues.push(`Invalid rematch state: ${this.rematchState}`);
        }
        
        return validation;
    }


    // =============================================================================
    // UTILITY METHODS
    // PLAYER MANAGEMENT
    // =============================================================================
    
    handlePlayerJoin(viewId) {
        console.log('👤 Player joined:', viewId);
        
        if (this.players.size >= this.maxPlayers) {
            console.log('❌ Session full, rejecting player');
            this.publish(this.sessionId, 'session-full', { viewId });
            return;
        }
        
        // Add player
        const player = {
            viewId: viewId,
            joinTime: this.now(),
            isReady: false,
            address: this.generateAddress(),
            connected: true
        };
        
        this.players.set(viewId, player);
        this.playerOrder.push(viewId);
        this.scores.set(viewId, 0);
        
        // Notify all players
        this.broadcastGameState();
        
        // Auto-start if 2 players and both ready
        if (this.players.size === 2 && this.gameState === 'waiting') {
            this.checkGameStart();
        }
    }
    
    handlePlayerLeave(viewId) {
        console.log('👤 Player left:', viewId);
        
        if (!this.players.has(viewId)) return;
        
        const player = this.players.get(viewId);
        player.connected = false;
        
        // PHASE 1 + 2A: Enhanced rematch cleanup on player disconnect
        if (this.rematchState !== this.REMATCH_STATES.NONE) {
            console.log(`🔄 Player ${viewId} left during rematch state ${this.rematchState}`);
            
            // PHASE 2A: Clean up any requests from this player
            let hadActiveRequest = false;
            for (const [requestId, request] of this.activeRequests.entries()) {
                if (request.requester === viewId) {
                    console.log(`🧹 Cleaning up request ${requestId} from disconnected player ${viewId}`);
                    request.status = 'cancelled';
                    this.removeRequest(requestId);
                    hadActiveRequest = true;
                }
            }
            
            // Check if the leaving player had an active rematch request (Phase 1 logic)
            if (this.playAgainRequests.has(viewId) || hadActiveRequest) {
                console.log(`🔄 Cancelling rematch due to player ${viewId} leaving`);
                this.safeTransitionTo(this.REMATCH_STATES.CANCELLED, 'player-disconnect');
                this.playAgainRequests.clear();
                
                // Notify remaining players
                this.publish(this.sessionId, 'play-again-cancelled', {
                    viewId: viewId,
                    reason: 'player-disconnect'
                });
            }
        }
        
        // If game is active, handle disconnection
        if (this.gameState === 'playing') {
            this.handlePlayerDisconnection(viewId);
        } else {
            // Remove player from waiting room
            this.players.delete(viewId);
            this.playerOrder = this.playerOrder.filter(id => id !== viewId);
            this.scores.delete(viewId);
        }
        
        this.broadcastGameState();
    }
    
    handlePlayerReady(data) {
    const { viewId, betAmount, sessionType, gameCode } = data;
    console.log('✅ Player ready:', viewId, 'Internal bet:', betAmount);
    
    if (!this.players.has(viewId)) return;
    
    const player = this.players.get(viewId);
    player.isReady = true;
    player.betAmount = betAmount || 1; // Use fixed amount or default to 1
    
    // Set session details from first ready player
    if (!this.betAmount) {
        this.betAmount = betAmount || 1; // Fixed internal value
        this.sessionType = sessionType;
        this.gameCode = gameCode;
        this.isHost = (this.playerOrder[0] === viewId);
    }
    
    this.broadcastGameState();
    this.checkGameStart();
}
    
    checkGameStart() {
        if (this.players.size === 2) {
            const allReady = Array.from(this.players.values()).every(p => p.isReady);
            if (allReady && this.gameState === 'waiting') {
                this.startGame();
            }
        }
    }
    
    // =============================================================================
    // GAME LOGIC
    // =============================================================================
    
    startGame() {
        console.log('🎮 Starting game!');
        this.gameState = 'playing';
        this.currentRound = 1;
        this.roundState = 'playing';
        this.choices.clear();
        
        // Reset scores
        for (const viewId of this.playerOrder) {
            this.scores.set(viewId, 0);
        }
        
        this.startRoundTimer();
        this.broadcastGameState();
        
        // Notify game started
        this.publish(this.sessionId, 'game-started', {
            players: Array.from(this.players.values()),
            betAmount: this.betAmount,
            currentRound: this.currentRound
        });
    }
    
    handlePlayerChoice(data) {
        const { viewId, choice } = data;
        console.log('🎯 Player choice:', viewId, choice);
        
        if (this.gameState !== 'playing' || this.roundState !== 'playing') {
            console.log('❌ Invalid game state for choice');
            return;
        }
        
        if (!this.players.has(viewId)) {
            console.log('❌ Unknown player making choice');
            return;
        }
        
        if (this.choices.has(viewId)) {
            console.log('❌ Player already made choice');
            return;
        }
        
        // Record choice
        this.choices.set(viewId, choice);
        
        // Check if all players have chosen
        if (this.choices.size === this.players.size) {
            this.evaluateRound();
        }
        
        this.broadcastGameState();
    }
    
    evaluateRound() {
        console.log('⚖️ Evaluating round', this.currentRound);
        
        this.roundState = 'revealing';
        this.stopRoundTimer();
        
        // Get choices
        const playerChoices = Array.from(this.choices.entries());
        const [player1Id, choice1] = playerChoices[0];
        const [player2Id, choice2] = playerChoices[1];
        
        // Determine winner
        const result = this.determineWinner(choice1, choice2);
        let roundWinner = null;
        
        if (result === 'player1') {
            roundWinner = player1Id;
            this.scores.set(player1Id, this.scores.get(player1Id) + 1);
        } else if (result === 'player2') {
            roundWinner = player2Id;
            this.scores.set(player2Id, this.scores.get(player2Id) + 1);
        }
        
        // Record round history
        this.roundHistory.push({
            round: this.currentRound,
            choices: Object.fromEntries(this.choices),
            winner: roundWinner,
            timestamp: this.now()
        });
        
        // Broadcast round result
        this.publish(this.sessionId, 'round-result', {
            round: this.currentRound,
            choices: Object.fromEntries(this.choices),
            winner: roundWinner,
            scores: Object.fromEntries(this.scores)
        });
        
        // Wait 3 seconds then continue - using proper Multisynq future syntax
        this.future(3000).continueGame();
    }
    
    nextRound() {
        console.log('➡️ Next round');
        this.currentRound++;
        this.roundState = 'playing';
        this.choices.clear();
        this.startRoundTimer();
        this.broadcastGameState();
        
        this.publish(this.sessionId, 'next-round', {
            round: this.currentRound
        });
    }
    
    endGame() {
        console.log('🏁 Game ended');
        this.gameState = 'finished';
        this.roundState = 'complete';
        this.stopRoundTimer();
        
        // Determine game winner
        const finalScores = Array.from(this.scores.entries());
        const [player1Id, score1] = finalScores[0];
        const [player2Id, score2] = finalScores[1];
        
        let gameWinner = null;
        if (score1 > score2) gameWinner = player1Id;
        else if (score2 > score1) gameWinner = player2Id;
        
        const prizeAmount = this.betAmount * 2 * 0.95; // 5% platform fee
        
        this.publish(this.sessionId, 'game-ended', {
            winner: gameWinner,
            finalScores: Object.fromEntries(this.scores),
            prizeAmount: prizeAmount,
            history: this.roundHistory
        });
        
        this.broadcastGameState();
    }
    
    continueGame() {
        console.log('⏰ Continue game after 3 seconds');
        if (this.currentRound >= this.config.maxRounds) {
            this.endGame();
        } else {
            this.nextRound();
        }
    }
    
    // =============================================================================
    // TIMER MANAGEMENT
    // =============================================================================
    
    startRoundTimer() {
        this.stopRoundTimer();
        this.roundTimer = this.config.roundTimer;
        this.timerRunning = true;
        console.log('⏰ Starting round timer at:', this.roundTimer);
        
        // Use Multisynq's future() for timer instead of setInterval
        this.scheduleTimerTick();
    }
    
    scheduleTimerTick() {
        if (this.timerRunning && this.roundTimer > 0) {
            // Broadcast current timer value
            this.publish(this.sessionId, 'timer-update', {
                timer: this.roundTimer
            });
            
            // Schedule next tick using future()
            this.future(1000).timerTick();
        } else if (this.timerRunning && this.roundTimer <= 0) {
            this.handleTimeout();
        }
    }
    
    timerTick() {
        if (!this.timerRunning) {
            console.log('⏰ Timer tick cancelled - timer stopped');
            return;
        }
        
        this.roundTimer--;
        console.log('⏰ Timer tick:', this.roundTimer);
        this.scheduleTimerTick();
    }
    
    stopRoundTimer() {
        // Stop the timer by setting the flag
        this.timerRunning = false;
        this.roundTimer = 0;
        console.log('⏰ Round timer stopped');
    }
    
    handleTimeout() {
        console.log('⏰ Round timeout');
        this.stopRoundTimer();
        
        // Auto-assign random choices for players who didn't choose
        const choices = ['rock', 'paper', 'scissors'];
        for (const viewId of this.playerOrder) {
            if (!this.choices.has(viewId)) {
                const randomChoice = choices[Math.floor(Math.random() * choices.length)];
                this.choices.set(viewId, randomChoice);
                console.log('🎲 Auto-assigned', randomChoice, 'to', viewId);
            }
        }
        
        if (this.choices.size > 0) {
            this.evaluateRound();
        }
    }
    
    // =============================================================================
    // PHASE 1: PLAY AGAIN SYSTEM WITH STATE VALIDATION
    // =============================================================================
    
    handlePlayAgainRequest(data) {
    const { viewId } = data;
    console.log('🔄 Play again request from:', viewId);
    
    // PHASE 1: VALIDATION - Check if transition to REQUESTED is valid
    if (!this.safeTransitionTo(this.REMATCH_STATES.REQUESTED, 'play-again-request')) {
        console.warn('❌ Play again request blocked - invalid state transition');
        
        // Notify the requester that their request was invalid
        this.publish(viewId, 'play-again-invalid', {
            reason: 'invalid-state',
            currentState: this.rematchState,
            message: 'Cannot request rematch in current state'
        });
        return;
    }
    
    // PHASE 1: VALIDATION - Check game state
    if (!this.validateGameStateForRematch('play-again-request')) {
        this.safeTransitionTo(this.REMATCH_STATES.NONE, 'invalid-game-state');
        
        this.publish(viewId, 'play-again-invalid', {
            reason: 'invalid-game-state',
            gameState: this.gameState,
            message: 'Game must be finished to request rematch'
        });
        return;
    }
    
    // PHASE 1: VALIDATION - Check player validity
    if (!this.validatePlayerForRematch(viewId, 'play-again-request')) {
        this.safeTransitionTo(this.REMATCH_STATES.NONE, 'invalid-player');
        
        this.publish(viewId, 'play-again-invalid', {
            reason: 'invalid-player',
            message: 'Player not found or disconnected'
        });
        return;
    }
    
    // PHASE 1: VALIDATION - Check for duplicate requests
    if (this.playAgainRequests.has(viewId)) {
        console.warn(`❌ Duplicate play again request from ${viewId}`);
        
        this.publish(viewId, 'play-again-invalid', {
            reason: 'duplicate-request',
            message: 'You have already requested a rematch'
        });
        return;
    }
    
    console.log('✅ Play again request validation passed');

    // PHASE 3A: CONFLICT DETECTION (LOGGING ONLY - NO BEHAVIOR CHANGE YET)
        const conflictAnalysis = this.detectRequestConflict(viewId, 'play-again');
        const conflictDetails = this.getConflictAnalysisDetails(conflictAnalysis);
        
        console.log('🔍 PHASE 3A: Conflict detection analysis:', conflictDetails);
        
        if (conflictAnalysis.hasConflict) {
            console.log(`⚡ PHASE 3A: Conflict detected - Type: ${conflictAnalysis.conflictType}`);
            console.log(`⚡ PHASE 3A: Recommended action: ${conflictAnalysis.resolutionAction}`);
            
            // Phase 3A: Just log the conflict, don't act on it yet
            // Phase 3B will implement the actual conflict resolution behavior
        } else {
            console.log('✅ PHASE 3A: No conflicts detected, proceeding normally');
        }
    
    // PHASE 2B: GENERATE REQUEST ID AND STORE REQUEST
    const requestId = this.generateRequestId();
    
    // Store request with full metadata
    const requestAdded = this.addRequest(requestId, {
        type: 'play-again',
        requester: viewId,
        betAmount: this.betAmount,
        sessionType: this.sessionType,
        timestamp: this.now()
    });
    
    if (!requestAdded) {
        console.error('❌ Failed to add request - possible duplicate ID');
        this.safeTransitionTo(this.REMATCH_STATES.NONE, 'request-creation-failed');
        
        this.publish(viewId, 'play-again-invalid', {
            reason: 'request-creation-failed',
            message: 'Failed to create rematch request'
        });
        return;
    }
    
    // Store the request (existing logic)
    this.playAgainRequests.set(viewId, true);
    
    // Transition to PENDING when notifying other players
    this.safeTransitionTo(this.REMATCH_STATES.PENDING, 'notifying-players');
    
    // PHASE 2B: NOTIFY OTHER PLAYERS WITH REQUEST ID
    const otherPlayers = this.playerOrder.filter(id => id !== viewId);
    console.log('🔄 Notifying other players:', otherPlayers, 'with request ID:', requestId);
    
    for (const otherId of otherPlayers) {
        console.log('🔄 Sending play-again-requested to:', otherId);
        this.publish(otherId, 'play-again-requested', {
            requestId: requestId,  // PHASE 2B: Include request ID
            fromPlayer: viewId,
            betAmount: this.betAmount,
            expiresAt: this.now() + this.REQUEST_TIMEOUT // Let client know when it expires
        });
    }
    
    this.broadcastGameState();
}
    
    handlePlayAgainResponse(data) {
    const { viewId, accepted, requestId } = data; // PHASE 2B: Extract requestId
    console.log('🔄 Play again response from:', viewId, 'accepted:', accepted, 'requestId:', requestId);
    
    // PHASE 2B: VALIDATE REQUEST ID FIRST
    if (requestId) {
        // New flow with request ID validation
        if (!this.isRequestActive(requestId)) {
            console.warn(`❌ Play again response for invalid/expired request: ${requestId}`);
            
            this.publish(viewId, 'play-again-invalid', {
                reason: 'invalid-request-id',
                requestId: requestId,
                message: 'Rematch request has expired or is invalid'
            });
            return;
        }
        
        const request = this.getRequest(requestId);
        if (!request || request.type !== 'play-again') {
            console.warn(`❌ Play again response for wrong request type: ${requestId}`);
            
            this.publish(viewId, 'play-again-invalid', {
                reason: 'invalid-request-type',
                requestId: requestId,
                message: 'Invalid request type'
            });
            return;
        }
        
        console.log('✅ Request ID validation passed for:', requestId);
    } else {
        // BACKWARD COMPATIBILITY: Handle responses without request ID (fallback to Phase 1 logic)
        console.log('⚠️ Play again response without request ID - using fallback validation');
    }
    
    // PHASE 1: VALIDATION - Check if we're in the right state to receive responses
    if (this.rematchState !== this.REMATCH_STATES.PENDING) {
        console.warn(`❌ Play again response ignored - invalid state: ${this.rematchState}`);
        
        this.publish(viewId, 'play-again-invalid', {
            reason: 'invalid-response-state',
            currentState: this.rematchState,
            message: 'No active rematch request to respond to'
        });
        return;
    }
    
    // PHASE 1: VALIDATION - Check player validity
    if (!this.validatePlayerForRematch(viewId, 'play-again-response')) {
        this.publish(viewId, 'play-again-invalid', {
            reason: 'invalid-player',
            message: 'Player not found or disconnected'
        });
        return;
    }
    
    // PHASE 1: VALIDATION - Check if player already responded
    if (this.playAgainRequests.has(viewId)) {
        console.warn(`❌ Duplicate play again response from ${viewId}`);
        
        this.publish(viewId, 'play-again-invalid', {
            reason: 'duplicate-response',
            message: 'You have already responded to this rematch request'
        });
        return;
    }
    
    console.log('✅ Play again response validation passed');
    
    if (accepted) {
        // Store acceptance
        this.playAgainRequests.set(viewId, true);
        
        // Check if all players accepted
        const allAccepted = this.playerOrder.every(id => this.playAgainRequests.get(id));
        
        if (allAccepted) {
            // PHASE 2B: CLEAN UP REQUEST BEFORE STARTING REMATCH
            if (requestId) {
                console.log(`🧹 Cleaning up completed request: ${requestId}`);
                this.removeRequest(requestId);
            }
            
            // Transition to ACCEPTED
            this.safeTransitionTo(this.REMATCH_STATES.ACCEPTED, 'all-players-accepted');
            this.resetGameForRematch();
        } else {
            console.log('🔄 Waiting for more players to accept rematch');
        }
    } else {
        // PHASE 2B: CLEAN UP REQUEST ON DECLINE
        if (requestId) {
            console.log(`🧹 Cleaning up declined request: ${requestId}`);
            this.removeRequest(requestId);
        }
        
        // Transition to DECLINED
        this.safeTransitionTo(this.REMATCH_STATES.DECLINED, 'player-declined');
        this.playAgainRequests.clear();
        
        this.publish(this.sessionId, 'play-again-declined', {
            fromPlayer: viewId,
            requestId: requestId // Include request ID for tracking
        });
        
        // Reset to NONE after decline
        this.safeTransitionTo(this.REMATCH_STATES.NONE, 'decline-cleanup');
    }
    
    this.broadcastGameState();
}
    
    handlePlayAgainCancelled(data) {
    const { viewId, requestId } = data; // PHASE 2B: Extract requestId if present
    console.log('🔄 Play again cancelled by:', viewId, 'requestId:', requestId);
    
    // PHASE 1: VALIDATION - Check if we're in a cancellable state
    if (this.rematchState === this.REMATCH_STATES.NONE) {
        console.warn(`❌ Play again cancellation ignored - already in NONE state`);
        return;
    }
    
    // PHASE 1: VALIDATION - Check player validity
    if (!this.validatePlayerForRematch(viewId, 'play-again-cancel')) {
        console.warn('❌ Invalid player trying to cancel rematch');
        return;
    }
    
    // PHASE 1: VALIDATION - Check if player has the right to cancel
    if (!this.playAgainRequests.has(viewId)) {
        console.warn(`❌ Player ${viewId} trying to cancel but has no active request`);
        return;
    }
    
    console.log('✅ Play again cancellation validation passed');
    
    // PHASE 2B: CLEAN UP REQUEST IF PROVIDED
    if (requestId && this.activeRequests.has(requestId)) {
        console.log(`🧹 Cleaning up cancelled request: ${requestId}`);
        this.removeRequest(requestId);
    }
    
    // Transition to CANCELLED
    this.safeTransitionTo(this.REMATCH_STATES.CANCELLED, 'player-cancelled');
    
    // Clear all requests
    this.playAgainRequests.clear();
    
    // Notify all players
    this.publish(this.sessionId, 'play-again-cancelled', {
        viewId: viewId,
        requestId: requestId // Include request ID for tracking
    });
    
    // Reset to NONE after cancellation
    this.safeTransitionTo(this.REMATCH_STATES.NONE, 'cancel-cleanup');
    
    this.broadcastGameState();
}

    resetGameForRematch() {
        console.log('🔄 Starting rematch');
        
        // PHASE 1: VALIDATION - Should only reset from ACCEPTED state
        if (this.rematchState !== this.REMATCH_STATES.ACCEPTED) {
            console.warn(`❌ Attempting to reset game from invalid state: ${this.rematchState}`);
            // Force reset anyway but log the issue
        }
        
        // Reset game state
        this.gameState = 'playing';
        this.currentRound = 1;
        this.roundState = 'playing';
        this.choices.clear();
        this.roundHistory = [];
        this.playAgainRequests.clear();
        
        // Reset rematch state to NONE (new game starting)
        this.safeTransitionTo(this.REMATCH_STATES.NONE, 'rematch-started');
        
        // Reset scores
        for (const viewId of this.playerOrder) {
            this.scores.set(viewId, 0);
        }
        
        this.startRoundTimer();
        this.broadcastGameState();
        
        this.publish(this.sessionId, 'rematch-started', {
            betAmount: this.betAmount
        });
    }
    
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    
    handleForfeit(data) {
        const { viewId } = data;
        console.log('🏳️ Player forfeited:', viewId);
        
        if (this.gameState === 'playing') {
            // Award win to other player
            const otherPlayer = this.playerOrder.find(id => id !== viewId);
            if (otherPlayer) {
                this.scores.set(otherPlayer, this.config.maxRounds);
                this.scores.set(viewId, 0);
                this.endGame();
            }
        }
    }
    
    handlePlayerDisconnection(viewId) {
        console.log('🔌 Player disconnected during game:', viewId);
        
        // Give other player automatic win after 30 seconds
        // FIXED: Use Multisynq future() instead of setTimeout
        this.future(30000).handleDisconnectionTimeout(viewId);
    }
    
    handleDisconnectionTimeout(viewId) {
        if (!this.players.get(viewId)?.connected) {
            const otherPlayer = this.playerOrder.find(id => id !== viewId);
            if (otherPlayer) {
                this.scores.set(otherPlayer, this.config.maxRounds);
                this.scores.set(viewId, 0);
                this.endGame();
            }
        }
    }
    
    determineWinner(choice1, choice2) {
        if (choice1 === choice2) return 'tie';
        
        const winConditions = {
            rock: 'scissors',
            paper: 'rock',
            scissors: 'paper'
        };
        
        return winConditions[choice1] === choice2 ? 'player1' : 'player2';
    }
    
    generateAddress() {
        const chars = '0123456789abcdef';
        let address = '0x';
        for (let i = 0; i < 40; i++) {
            address += chars[Math.floor(Math.random() * chars.length)];
        }
        return address;
    }
    
    broadcastGameState() {
        this.publish(this.sessionId, 'game-state-update', {
            gameState: this.gameState,
            roundState: this.roundState,
            currentRound: this.currentRound,
            roundTimer: this.roundTimer,
            players: Object.fromEntries(this.players),
            playerOrder: this.playerOrder,
            scores: Object.fromEntries(this.scores),
            choices: Object.fromEntries(this.choices),
            betAmount: this.betAmount,
            sessionType: this.sessionType,
            gameCode: this.gameCode,
            rematchState: this.rematchState
        });
    }
}

// Register the model
RockPaperScissorsModel.register('RockPaperScissorsModel');

// =============================================================================
// MULTISYNQ VIEW - Local UI Management
// =============================================================================
class RockPaperScissorsView extends Multisynq.View {
    constructor(model) {
        super(model);
        console.log('🎨 RPS View initialized');
        
        // Add EventManager
        this.eventManager = new EventManager();
        
        // Local state (not synchronized)
        this.localState = {
            wallet: {
                connected: false,
                address: null,
                balance: 0
            },
            currentScreen: 'landing',
            selectedBet: null,
            myViewId: this.viewId,
            opponentViewId: null,
            pendingChoice: null,
            uiLocked: false
        };
        
        // Event subscriptions - bind methods to preserve 'this' context
        this.subscribe(this.sessionId, 'game-state-update', (data) => this.handleGameStateUpdate(data));
        this.subscribe(this.sessionId, 'game-started', (data) => this.handleGameStarted(data));
        this.subscribe(this.sessionId, 'round-result', (data) => this.handleRoundResult(data));
        this.subscribe(this.sessionId, 'next-round', (data) => this.handleNextRound(data));
        this.subscribe(this.sessionId, 'game-ended', (data) => this.handleGameEnded(data));
        this.subscribe(this.sessionId, 'timer-update', (data) => this.handleTimerUpdate(data));
        this.subscribe(this.sessionId, 'session-full', (data) => this.handleSessionFull(data));
        this.subscribe(this.viewId, 'play-again-requested', (data) => this.handlePlayAgainRequested(data));
        this.subscribe(this.sessionId, 'play-again-declined', (data) => this.handlePlayAgainDeclined(data));
        this.subscribe(this.sessionId, 'rematch-started', (data) => this.handleRematchStarted(data));
        this.subscribe(this.sessionId, 'play-again-cancelled', (data) => this.handlePlayAgainCancelled(data));
        this.subscribe(this.viewId, 'play-again-invalid', (data) => this.handlePlayAgainInvalid(data));
        this.subscribe(this.sessionId, 'play-again-timeout', (data) => this.handlePlayAgainTimeout(data));

        console.log('📡 View subscribed to all game events with proper binding');
        
        // Initialize UI
        this.initializeUI();
    }

    // =============================================================================
    // UI INITIALIZATION
    // =============================================================================
    
    initializeUI() {
        // Bind all UI events
        this.bindEvents();
        
        // Update network status
        this.updateNetworkStatus('connected');
        
        // Don't show landing screen - the MonadRPS class handles pre-game
        // This view only activates when a Multisynq session starts
        console.log('🎨 View ready for multiplayer gameplay');
        
        // Automatically send player-ready signal when view initializes
        setTimeout(() => {
            this.sendPlayerReadySignal();
        }, 500);
    }
    
    sendPlayerReadySignal() {
        // Send player-ready signal to start the game
        this.publish(this.sessionId, 'player-ready', {
            viewId: this.viewId,
            betAmount: this.localState.selectedBet || 1,
            sessionType: 'private', // Will be updated by model if needed
            gameCode: null // Will be updated by model if needed
        });

        // Force reset UI for new session
        this.forceResetChoiceButtons(); // ADD THIS LINE

        console.log('📤 View sent player-ready signal');
    }
    
    bindEvents() {
        // Store bound method references for game actions
        const forfeitHandler = this.eventManager.bindMethod(this, 'forfeitGame');
        const playAgainHandler = this.eventManager.bindMethod(this, 'requestPlayAgain');
        const backToMenuHandler = this.eventManager.bindMethod(this, 'backToMenu');
        const cancelPlayAgainHandler = this.eventManager.bindMethod(this, 'cancelPlayAgain');
        const copyCodeHandler = this.eventManager.bindMethod(this, 'copySessionCode');
        const cancelSessionHandler = this.eventManager.bindMethod(this, 'cancelPrivateSession');
        const cancelSearchHandler = this.eventManager.bindMethod(this, 'cancelMatchmaking');
        
        // Bind all static elements once
        this.eventManager.addListener(
            document.getElementById('forfeitBtn'), 
            'click', 
            forfeitHandler, 
            'view_game'
        );
        
        this.eventManager.addListener(
            document.getElementById('playAgainBtn'), 
            'click', 
            playAgainHandler, 
            'view_results'
        );
        
        this.eventManager.addListener(
            document.getElementById('backToMenuBtn'), 
            'click', 
            backToMenuHandler, 
            'view_results'
        );
        
        this.eventManager.addListener(
            document.getElementById('cancelPlayAgainBtn'), 
            'click', 
            cancelPlayAgainHandler, 
            'view_playagain'
        );
        
        this.eventManager.addListener(
            document.getElementById('copyCodeBtn'), 
            'click', 
            copyCodeHandler, 
            'view_session'
        );
        
        this.eventManager.addListener(
            document.getElementById('cancelSessionBtn'), 
            'click', 
            cancelSessionHandler, 
            'view_session'
        );
        
        this.eventManager.addListener(
            document.getElementById('cancelSearch'), 
            'click', 
            cancelSearchHandler, 
            'view_search'
        );
        
        // Choice buttons - use event delegation
        this.setupChoiceButtonDelegation();
    }
    
    // =============================================================================
    // PHASE 1: NEW EVENT HANDLERS FOR STATE VALIDATION
    // =============================================================================

    /**
     * Handle invalid play again attempts with user-friendly messages
     */
    handlePlayAgainInvalid(data) {
        const { reason, message, currentState, gameState } = data;
        console.log('❌ Play again invalid:', reason, message);
        
        // Show appropriate error message based on reason
        switch(reason) {
            case 'invalid-state':
                this.showToast(`Cannot request rematch right now (${currentState})`, 'error');
                break;
                
            case 'invalid-game-state':
                this.showToast(`Game must be finished to request rematch (currently ${gameState})`, 'error');
                break;
                
            case 'invalid-player':
                this.showToast('You cannot request a rematch at this time', 'error');
                break;
                
            case 'duplicate-request':
                this.showToast('You have already requested a rematch', 'warning');
                break;
                
            case 'duplicate-response':
                this.showToast('You have already responded to this rematch request', 'warning');
                break;
                
            case 'invalid-response-state':
                this.showToast('No active rematch request to respond to', 'error');
                break;
                
            default:
                this.showToast(message || 'Invalid rematch action', 'error');
        }
        
        // If we're on a play again screen and got an invalid response, return to results
        if (this.localState.currentScreen === 'playAgainWaiting' || 
            this.localState.currentScreen === 'playAgainRequest') {
            console.log('🔄 Returning to results screen due to invalid play again action');
            setTimeout(() => {
                this.showScreen('results');
            }, 2000); // Give user time to read the error message
        }
    }

    /**
 * Handle play again request timeouts
 */
handlePlayAgainTimeout(data) {
    const { requestId, requester, reason, message } = data;
    console.log('⏰ Play again timeout:', requestId, 'from:', requester);
    
    // Show timeout message
    if (requester === this.viewId) {
        // Our request timed out
        this.showToast('Your rematch request timed out after 30 seconds', 'warning');
    } else {
        // Someone else's request timed out
        this.showToast('Rematch request timed out', 'info');
    }
    
    // Clear any pending request state
    this.localState.pendingPlayAgainRequest = null;
    
    // If we're on any play again screen, return to results
    if (this.localState.currentScreen === 'playAgainRequest' || 
    this.localState.currentScreen === 'playAgainWaiting') {
    
    console.log('🔄 Returning to wallet screen due to timeout - session ended');
    setTimeout(() => {
        if (this.localState.currentScreen === 'playAgainRequest' || 
            this.localState.currentScreen === 'playAgainWaiting') {
            this.backToMenu(); // ✅ CORRECT - ends session and goes to wallet
        }
    }, 2000); // Give user time to read timeout message
    }
}

    /**
 * Force reset all choice button states (for new sessions)
 */
forceResetChoiceButtons() {
    console.log('🔄 Force resetting choice buttons for new session');
    
    const choiceButtons = document.querySelectorAll('.choice-btn');
    choiceButtons.forEach(btn => {
        btn.classList.remove('selected', 'disabled');
        btn.style.opacity = '1'; // In case opacity was changed
        btn.style.pointerEvents = 'auto'; // In case pointer events were disabled
    });
    
    // Also reset choice displays
    const choiceDisplays = document.querySelectorAll('.player-choice .choice-icon');
    choiceDisplays.forEach(display => {
        display.textContent = '?';
    });
    
    console.log('✅ Choice buttons force reset complete');
}

    setupChoiceButtonDelegation() {
        const choicesSection = document.querySelector('.choices-section');
        if (choicesSection) {
            const choiceHandler = (event) => {
                const choiceBtn = event.target.closest('.choice-btn');
                if (choiceBtn && choiceBtn.dataset.choice) {
                    this.makeChoice(choiceBtn.dataset.choice);
                }
            };
            
            this.eventManager.addListener(
                choicesSection, 
                'click', 
                choiceHandler, 
                'view_choices'
            );
        }
    }
    
    setupPlayAgainButtons() {
        // Clean any existing handlers
        this.eventManager.removeListeners('view_playagain_dynamic');
        
        // Bind accept/decline with proper cleanup
        const acceptHandler = this.eventManager.bindMethod(this, 'acceptRematch');
        const declineHandler = this.eventManager.bindMethod(this, 'declineRematch');
        
        this.eventManager.addListener(
            document.getElementById('acceptRematchBtn'), 
            'click', 
            acceptHandler, 
            'view_playagain_dynamic'
        );
        
        this.eventManager.addListener(
            document.getElementById('declineRematchBtn'), 
            'click', 
            declineHandler, 
            'view_playagain_dynamic'
        );
    }
    
    setupScreenHandlers(screenName) {
        // Handle special screen setups
        switch(screenName) {
            case 'playAgainRequest':
                this.setupPlayAgainButtons();
                break;
            // Add other special cases as needed
        }
    }
    
    // =============================================================================
    // WALLET MANAGEMENT (MOCK)
    // =============================================================================
    /*
    async connectWallet() {
    const connectBtn = document.getElementById('connectBtn');
    this.setLoading(connectBtn, true);
    
    try {
        await this.delay(1500);
        
        this.state.wallet = {
            connected: true,
            address: this.generateAddress(),
            balance: this.generateBalance() // Keep for now, will remove later
        };
        
        // Set fixed internal bet amount (no user selection)
        this.state.selectedBet = 1; // Fixed value for internal use
        
        this.updateWalletDisplay();
        // CHANGED: Skip wallet screen, go directly to game mode
        this.showGameModeSelection(); 
        this.showToast('Wallet connected successfully', 'success');
        
    } catch (error) {
        this.showToast('Failed to connect wallet', 'error');
    } finally {
        this.setLoading(connectBtn, false);
    }
}
    
    disconnectWallet() {
    this.state.wallet = {
        connected: false,
        address: null,
        balance: 0
    };
    
    // Reset selected bet
    this.state.selectedBet = null;
    
    this.showScreen('landing');
    this.showToast('Wallet disconnected', 'success');
}
    */

    updateWalletDisplay() {
    // Update main wallet display (if wallet screen is shown)
    const addressEl = document.getElementById('walletAddress');
    const balanceEl = document.getElementById('balanceValue');
    
    if (addressEl && this.localState.wallet.address) {  // FIXED: this.localState.wallet
        addressEl.textContent = this.formatAddress(this.localState.wallet.address);
    }
    
    if (balanceEl) {
        balanceEl.textContent = this.localState.wallet.balance.toFixed(3);  // FIXED: this.localState.wallet
    }
    
    // Update header wallet display
    this.updateHeaderWalletDisplay();
}
    
    // New method to update header wallet info
updateHeaderWalletDisplay() {
    const headerWalletInfo = document.getElementById('headerWalletInfo');
    const headerWalletAddress = document.getElementById('headerWalletAddress');
    
    if (this.localState.wallet.connected && this.localState.wallet.address) {  // FIXED: this.localState.wallet
        if (headerWalletAddress) {
            headerWalletAddress.textContent = this.formatAddress(this.localState.wallet.address);
        }
        if (headerWalletInfo) {
            headerWalletInfo.classList.remove('hidden');
        }
    } else {
        if (headerWalletInfo) {
            headerWalletInfo.classList.add('hidden');
        }
    }
}

    
    updateBetOptions() {
        const betOptions = document.querySelectorAll('.bet-option');
        betOptions.forEach(option => {
            const amount = parseFloat(option.dataset.amount);
            if (this.localState.wallet.balance < amount) {
                option.classList.add('disabled');
            } else {
                option.classList.remove('disabled');
            }
        });
    }
    
    // =============================================================================
    // BETTING & GAME MODE SELECTION
    // =============================================================================
    
    
    
    showGameModeSelection() {
    // Remove bet amount display logic since we don't show it anymore
    this.showScreen('gameMode');
}

// 3. Remove selectBet() method entirely (no longer needed)
// DELETE the entire selectBet() method

        handleJoinFriendSession() {
        console.log('🚪 handleJoinFriendSession called');
        
        if (!this.state.wallet.connected) {
            this.showToast('Please connect wallet first', 'error');
            return;
        }
        
        this.showJoinSession();
    }

    handleJoinFromWallet() {
    this.showJoinSession();
}


    
    // =============================================================================
    // SESSION MANAGEMENT
    // =============================================================================
    
    async createPrivateSession() {
        console.log('🏠 Creating private session');
        
        const gameCode = this.generateSessionCode();
        const sessionName = `private-${gameCode}`;
        
        try {
            // Join Multisynq session with private room name
            const session = await Multisynq.Session.join({
                apiKey: MULTISYNQ_CONFIG.apiKey,
                appId: MULTISYNQ_CONFIG.appId,
                name: sessionName,
                password: gameCode,
                model: RockPaperScissorsModel,
                view: RockPaperScissorsView,
                debug: MULTISYNQ_CONFIG.debug
            });
            
            this.multisynqSession = session;
            
            // Show private session screen
            this.showPrivateSessionScreen(gameCode);
            
            // Send ready signal to model
            this.publish(this.sessionId, 'player-ready', {
                viewId: this.viewId,
                betAmount: this.localState.selectedBet,
                sessionType: 'private',
                gameCode: gameCode
            });
            
        } catch (error) {
            console.error('Failed to create private session:', error);
            this.showToast('Failed to create session', 'error');
        }
    }
    
    showPrivateSessionScreen(gameCode) {
        const codeEl = document.getElementById('sessionCode');
        
        if (codeEl) {
            codeEl.textContent = gameCode;
        }
        
        this.showScreen('privateSession');
        console.log('📺 Showing private session screen with code:', gameCode);
    }
    
    async copySessionCode() {
    const codeEl = document.getElementById('sessionCode');
    const gameCode = codeEl?.textContent || '';
    
    try {
        const shareText = `Join my Rock Paper Scissors game! Code: ${gameCode}`;
        
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareText);
            this.showToast('Invite copied to clipboard!', 'success');
        } else {
            this.showToast(`Share this: ${shareText}`, 'success');
        }
    } catch (error) {
        this.showToast(`Code: ${gameCode}`, 'success');
    }
}
    
    showJoinSession() {
        this.showScreen('joinSession');
    }
    
    async joinSession() {
        const codeInput = document.getElementById('sessionCodeInput');
        const code = codeInput?.value?.trim().toUpperCase();
        
        if (!code || code.length !== 6) {
            this.showToast('Please enter a valid 6-character code', 'error');
            return;
        }
        
        const joinBtn = document.getElementById('joinCodeBtn');
        this.setLoading(joinBtn, true);
        
        try {
            const sessionName = `private-${code}`;
            
            // Join Multisynq session
            const session = await Multisynq.Session.join({
                apiKey: MULTISYNQ_CONFIG.apiKey,
                appId: MULTISYNQ_CONFIG.appId,
                name: sessionName,
                password: code,
                model: RockPaperScissorsModel,
                view: RockPaperScissorsView,
                debug: MULTISYNQ_CONFIG.debug
            });
            
            this.multisynqSession = session;
            
            this.showToast('Joined session successfully!', 'success');
            
            // Send ready signal to model
            this.publish(this.sessionId, 'player-ready', {
                viewId: this.viewId,
                betAmount: this.localState.selectedBet,
                sessionType: 'private',
                gameCode: code
            });
            
        } catch (error) {
            console.error('Failed to join session:', error);
            this.showToast('Session not found or expired', 'error');
        } finally {
            this.setLoading(joinBtn, false);
        }
    }
    
    async startRandomMatchmaking() {
        console.log('🎲 Starting random matchmaking');
        
        try {
            // Use bet amount to create matchmaking pools
            const sessionName = `random-${this.localState.selectedBet}`;
            
            const session = await Multisynq.Session.join({
                apiKey: MULTISYNQ_CONFIG.apiKey,
                appId: MULTISYNQ_CONFIG.appId,
                name: sessionName,
                password: Multisynq.App.autoPassword(),
                model: RockPaperScissorsModel,
                view: RockPaperScissorsView,
                debug: MULTISYNQ_CONFIG.debug
            });
            
            this.multisynqSession = session;
            
            this.showMatchmakingScreen();
            
            // Send ready signal to model
            this.publish(this.sessionId, 'player-ready', {
                viewId: this.viewId,
                betAmount: this.localState.selectedBet,
                sessionType: 'random',
                gameCode: null
            });
            
        } catch (error) {
            console.error('Failed to start matchmaking:', error);
            this.showToast('Failed to start matchmaking', 'error');
        }
    }
    
    showMatchmakingScreen() {
        const selectedBetEl = document.getElementById('selectedBet');
        const prizePoolEl = document.getElementById('prizePool');
        
        if (selectedBetEl) {
            selectedBetEl.textContent = `${this.localState.selectedBet} MONAD`;
        }
        
        if (prizePoolEl) {
            const prize = (this.localState.selectedBet * 2 * 0.95).toFixed(3);
            prizePoolEl.textContent = `${prize} MONAD prize`;
        }
        
        this.showScreen('matchmaking');
    }
    
    cancelPrivateSession() {
        this.leaveSession();
        this.showScreen('gameMode');
        this.showToast('Session cancelled', 'success');
    }
    
    cancelMatchmaking() {
        this.leaveSession();
        this.showScreen('gameMode');
        this.showToast('Matchmaking cancelled', 'success');
    }
    
    // =============================================================================
    // GAME EVENT HANDLERS
    // =============================================================================
    
    handleGameStateUpdate(data) {
        // Update opponent info when players join
        if (data.playerOrder && data.playerOrder.length === 2) {
            this.localState.opponentViewId = data.playerOrder.find(id => id !== this.viewId);
        }
    }
    
    handleGameStarted(data) {
        console.log('🎮 Game started event received');
        this.forceResetChoiceButtons(); // ADD THIS LINE
        this.startGame(data);
    }
    
    startGame(data) {
        this.updateGameDisplay(data);
        this.showScreen('game');
        this.showToast('Game started! Good luck!', 'success');
    }
    
    updateGameDisplay(data = {}) {
    const elements = {
        currentRound: document.getElementById('currentRound'),
        gamePrize: document.getElementById('gamePrize'),
        playerYouAddr: document.getElementById('playerYouAddr'),
        playerOppAddr: document.getElementById('playerOppAddr'),
        playerYouScore: document.getElementById('playerYouScore'),
        playerOppScore: document.getElementById('playerOppScore')
    };
    
    // Always reset to round 1 for new games/rematches
    if (elements.currentRound) {
        elements.currentRound.textContent = data.currentRound || '1';
    }
    
    if (elements.gamePrize && (data.betAmount || this.localState.selectedBet)) {
        const betAmount = data.betAmount || this.localState.selectedBet;
        const prize = (betAmount * 2 * 0.95).toFixed(3);
        elements.gamePrize.textContent = `${prize} MONAD`;
    }
    
    if (elements.playerYouAddr) {
        elements.playerYouAddr.textContent = this.formatAddress(this.localState.wallet.address);
    }
    
    // Reset scores to 0 for new games
    if (elements.playerYouScore) {
        elements.playerYouScore.textContent = '0';
    }
    if (elements.playerOppScore) {
        elements.playerOppScore.textContent = '0';
    }
    
    if (elements.playerOppAddr && data.players) {
        const opponent = data.players.find(p => p.viewId !== this.viewId);
        if (opponent) {
            elements.playerOppAddr.textContent = this.formatAddress(opponent.address);
            this.localState.opponentViewId = opponent.viewId;
        }
        }
    }
    
    makeChoice(choice) {
        if (this.localState.uiLocked || this.localState.pendingChoice) {
            console.log('🚫 Choice blocked - UI locked or already chosen');
            return;
        }
        
        this.localState.pendingChoice = choice;
        console.log('🎯 Making choice:', choice);
        
        // Update UI immediately
        document.querySelectorAll('.choice-btn').forEach(btn => {
            if (btn.dataset.choice === choice) {
                btn.classList.add('selected');
            } else {
                btn.classList.add('disabled');
            }
        });
        
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) {
            statusEl.textContent = 'Waiting for opponent...';
        }
        
        const yourChoiceEl = document.querySelector('#playerYouChoice .choice-icon');
        if (yourChoiceEl) {
            yourChoiceEl.textContent = this.getChoiceEmoji(choice);
        }
        
        // Send choice to model - this is the ONLY event the View should publish
        this.publish(this.sessionId, 'player-choice', {
            viewId: this.viewId,
            choice: choice
        });
        
        console.log('📤 Sent player choice to model');
    }
    
    handleRoundResult(data) {
        console.log('⚖️ Round result received:', data);
        
        const { choices, winner, scores } = data;
        
        // Show opponent choice
        const oppChoice = choices[this.localState.opponentViewId];
        const oppChoiceEl = document.querySelector('#playerOppChoice .choice-icon');
        if (oppChoiceEl && oppChoice) {
            oppChoiceEl.textContent = this.getChoiceEmoji(oppChoice);
        }
        
        // Update scores
        this.updateScores(scores);
        
        // Update status message
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) {
            if (winner === this.viewId) {
                statusEl.textContent = 'You won this round!';
            } else if (winner === this.localState.opponentViewId) {
                statusEl.textContent = 'Opponent won this round';
            } else {
                statusEl.textContent = 'Round tied!';
            }
        }
    }
    
    handleNextRound(data) {
        console.log('➡️ View received next round event:', data.round);
        
        // Reset UI for next round
        this.localState.pendingChoice = null;
        this.localState.uiLocked = false;
        
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) {
            statusEl.textContent = 'Choose your move';
            console.log('✅ Status message reset');
        }
        
        const choiceDisplays = document.querySelectorAll('.player-choice .choice-icon');
        choiceDisplays.forEach(display => {
            display.textContent = '?';
        });
        console.log('✅ Choice displays reset');
        
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected', 'disabled');
        });
        console.log('✅ Choice buttons reset');
        
        const roundEl = document.getElementById('currentRound');
        if (roundEl) {
            roundEl.textContent = data.round;
            console.log('✅ Round display updated to:', data.round);
        } else {
            console.log('❌ Round element not found');
        }
        
        console.log('🔄 UI completely reset for round', data.round);
    }
    
    handleGameEnded(data) {
    console.log('🏁 Game ended:', data);
    
    const { winner, finalScores } = data;  // REMOVED: prizeAmount since we don't show it
    
    let title = 'You Lost';
    let titleClass = 'lose';
    
    if (winner === this.viewId) {
        title = 'You Won!';
        titleClass = 'win';
        // REMOVED: Balance updates since we don't track prizes
    } else if (winner === null) {
        title = 'Tie Game';
        titleClass = '';
        // REMOVED: Balance updates since we don't track prizes
    }
    
    // FIXED: Remove prizeAmount parameter
    this.showResults(title, titleClass, finalScores);
}
    
    showResults(title, titleClass, finalScores) {  // REMOVED: prizeAmount parameter
    const elements = {
        resultTitle: document.getElementById('resultTitle'),
        finalYouScore: document.getElementById('finalYouScore'),
        finalOppScore: document.getElementById('finalOppScore')
        // REMOVED: prizeWon element reference since we removed prize display
    };
    
    if (elements.resultTitle) {
        elements.resultTitle.textContent = title;
        elements.resultTitle.className = `result-title ${titleClass}`;
    }
    
    if (elements.finalYouScore && finalScores) {
        elements.finalYouScore.textContent = finalScores[this.viewId] || 0;
    }
    
    if (elements.finalOppScore && finalScores) {
        elements.finalOppScore.textContent = finalScores[this.localState.opponentViewId] || 0;
    }
    
    // REMOVED: Prize display and wallet balance update since we don't show prizes
    
    this.showScreen('results');
}
    
    handleTimerUpdate(data) {
        console.log('⏰ View received timer update:', data.timer);
        const timerEl = document.getElementById('timerValue');
        if (timerEl) {
            timerEl.textContent = data.timer;
            console.log('✅ Timer UI updated to:', data.timer);
        } else {
            console.log('❌ Timer element not found');
        }
    }
    
    handleSessionFull(data) {
        if (data.viewId === this.viewId) {
            this.showToast('Session is full', 'error');
            this.showScreen('wallet');
        }
    }
    
    // =============================================================================
    // PLAY AGAIN SYSTEM
    // =============================================================================
    
    requestPlayAgain() {
    console.log('🔄 Requesting play again...');
    
    // Client-side validation before sending request
    if (this.localState.currentScreen !== 'results') {
        this.showToast('Can only request rematch from results screen', 'error');
        return;
    }
    
    // Check if we already have a pending request (local state check)
    if (this.localState.currentScreen === 'playAgainWaiting') {
        this.showToast('Rematch request already pending', 'warning');
        return;
    }
    
    // Show waiting screen optimistically
    this.showScreen('playAgainWaiting');
    
    // Send play again request
    this.publish(this.sessionId, 'play-again-request', {
        viewId: this.viewId
    });
    
    console.log('📤 Play again request sent');
}
    
    handlePlayAgainRequested(data) {
    // Don't respond to your own play again request (safety check)
    if (data.fromPlayer === this.viewId) {
        console.log('🔄 Ignoring own play again request');
        return;
    }
    
    console.log('🔄 Received play again request from:', data.fromPlayer);
    
    // Validation: Should only receive this on results screen
    if (this.localState.currentScreen !== 'results') {
        console.warn('🔄 Received play again request but not on results screen:', this.localState.currentScreen);
        // Don't show the request if we're not in the right state
        return;
    }
    
    // Store the request data
    this.localState.pendingPlayAgainRequest = data;
    
    // Show proper in-game UI for play again request
    this.showPlayAgainRequestScreen(data);
}

showPlayAgainRequestScreen(data) {
    // No bet amount to display anymore
    
    // Show the request screen
    this.showScreen('playAgainRequest');
    
    // Visual effect to get player's attention
    if (document.body) {
        document.body.style.animation = 'flash 0.5s ease-in-out';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 500);
    }
}

    
    handlePlayAgainCancelled(data) {
    console.log('🔄 Play again cancelled by:', data.viewId);
    
    // Handle different cancellation scenarios
    if (data.reason === 'player-disconnect') {
        this.showToast('Rematch cancelled - opponent disconnected', 'info');
    } else {
        this.showToast('Rematch request cancelled', 'info');
    }
    
    // Clear any pending request state
    this.localState.pendingPlayAgainRequest = null;
    
    // If we're on any play again screen, return to results
    if (this.localState.currentScreen === 'playAgainRequest' || 
        this.localState.currentScreen === 'playAgainWaiting') {
        
        setTimeout(() => {
            if (this.localState.currentScreen === 'playAgainRequest' || 
                this.localState.currentScreen === 'playAgainWaiting') {
                this.showScreen('results');
            }
        }, 1500); // Give user time to read the message
    }
}
    
    
    handleRematchStarted(data) {
    console.log('🔄 Rematch started event received');
    
    // Clear any play again state
    this.localState.pendingPlayAgainRequest = null;
    
    // Reset ALL local UI state for new game
    this.localState.pendingChoice = null;
    this.localState.uiLocked = false;
    this.localState.opponentViewId = null; // Will be reset when game state updates
    
    // Reset the game UI completely
    this.resetGameUI();
    this.forceResetChoiceButtons(); // ADD THIS LINE TOO
    
    // Show game screen and update display
    this.updateGameDisplay(data);
    this.showScreen('game');
    this.showToast('Rematch starting!', 'success');
}
    
    resetGameUI() {
    console.log('🔄 Completely resetting game UI for rematch');
    
    // Reset choice buttons
    document.querySelectorAll('.choice-btn').forEach(btn => {
        btn.classList.remove('selected', 'disabled');
    });
    
    // Reset choice displays
    const choiceDisplays = document.querySelectorAll('.player-choice .choice-icon');
    choiceDisplays.forEach(display => {
        display.textContent = '?';
    });
    
    // Reset scores to 0
    const youScoreEl = document.getElementById('playerYouScore');
    const oppScoreEl = document.getElementById('playerOppScore');
    if (youScoreEl) youScoreEl.textContent = '0';
    if (oppScoreEl) oppScoreEl.textContent = '0';
    
    // Reset round counter
    const roundEl = document.getElementById('currentRound');
    if (roundEl) roundEl.textContent = '1';
    
    // Reset status message
    const statusEl = document.getElementById('statusMessage');
    if (statusEl) {
        statusEl.textContent = 'Choose your move';
    }
    
    // Reset timer display
    const timerEl = document.getElementById('timerValue');
    if (timerEl) {
        timerEl.textContent = '30';
    }
    
    console.log('✅ Game UI completely reset for rematch');
    }

    handlePlayAgainDeclined(data) {
        console.log('🔄 Play again declined by:', data.fromPlayer);
        this.showToast('Opponent declined rematch', 'info');
        setTimeout(() => {
            this.backToMenu();
        }, 1500);
    }
     
    cancelPlayAgain() {
    console.log('🔄 Cancelling play again request...');
    
    // Client-side validation
    if (this.localState.currentScreen !== 'playAgainWaiting') {
        this.showToast('No active rematch request to cancel', 'error');
        return;
    }
    
    // PHASE 2B: Try to get request ID (we don't store it locally, so it will be null)
    // The Model will clean up based on player ID
    const requestId = null; // Could enhance this in future to store request ID locally
    
    // Notify others that play again was cancelled
    this.publish(this.sessionId, 'play-again-cancelled', {
        viewId: this.viewId,
        requestId: requestId // PHASE 2B: Include request ID if available
    });
    
    // Return to menu
    this.backToMenu();
    
    console.log('📤 Play again cancellation sent');
}

    acceptRematch() {
    console.log('🔄 Accepting rematch request');
    
    // Client-side validation
    if (this.localState.currentScreen !== 'playAgainRequest') {
        this.showToast('No rematch request to accept', 'error');
        return;
    }
    
    // PHASE 2B: Include request ID from pending request
    const requestId = this.localState.pendingPlayAgainRequest?.requestId || null;
    
    // Send acceptance response with request ID
    this.publish(this.sessionId, 'play-again-response', {
        viewId: this.viewId,
        accepted: true,
        requestId: requestId // PHASE 2B: Include request ID
    });
    
    // Show waiting screen while game resets
    this.showScreen('playAgainWaiting');
    
    console.log('📤 Rematch acceptance sent with request ID:', requestId);
}
    
    declineRematch() {
    console.log('🔄 Declining rematch request');
    
    // Client-side validation
    if (this.localState.currentScreen !== 'playAgainRequest') {
        this.showToast('No rematch request to decline', 'error');
        return;
    }
    
    // PHASE 2B: Include request ID from pending request
    const requestId = this.localState.pendingPlayAgainRequest?.requestId || null;
    
    // Send decline response with request ID
    this.publish(this.sessionId, 'play-again-response', {
        viewId: this.viewId,
        accepted: false,
        requestId: requestId // PHASE 2B: Include request ID
    });
    
    // Return to menu
    this.backToMenu();
    
    console.log('📤 Rematch decline sent with request ID:', requestId);
}
    
    backToMenu() {
    this.leaveSession();
    this.localState.opponentViewId = null;
    this.localState.pendingChoice = null;
    this.localState.uiLocked = false;
    this.showScreen('gameMode'); // CHANGED: Go to game mode instead of wallet
}
    
    forfeitGame() {
    console.log('🏳️ Forfeiting game');
    
    // Reset UI locks
    this.localState.uiLocked = false;
    this.localState.pendingChoice = null;
    
    this.publish(this.sessionId, 'forfeit-game', {
        viewId: this.viewId
    });
    
    // Don't immediately leave - wait for game-ended event
    this.showToast('Game forfeited', 'success');
    
    console.log('📤 Forfeit signal sent, waiting for game end');
}
    
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    
    async leaveSession() {
        if (this.multisynqSession) {
            try {
                await this.multisynqSession.leave();
                this.multisynqSession = null;
            } catch (error) {
                console.error('Error leaving session:', error);
            }
        }
        
        // Clean up event listeners
        this.cleanup();
    }
    
    cleanup() {
        this.eventManager.cleanup();
        // Clean up any other resources
    }
    
    updateNetworkStatus(status) {
        const statusDot = document.getElementById('multisynqStatus');
        const networkText = document.getElementById('networkText');
        
        if (statusDot) {
            statusDot.className = 'status-dot';
            if (status === 'connected') {
                statusDot.style.backgroundColor = 'var(--success)';
            } else {
                statusDot.style.backgroundColor = 'var(--error)';
            }
        }
        
        if (networkText) {
            networkText.textContent = status === 'connected' ? 'Multisynq Connected' : 'Monad Testnet';
        }
    }
    
    updateScores(scores) {
        const youScoreEl = document.getElementById('playerYouScore');
        const oppScoreEl = document.getElementById('playerOppScore');
        
        if (youScoreEl && scores) {
            youScoreEl.textContent = scores[this.viewId] || 0;
        }
        
        if (oppScoreEl && scores) {
            oppScoreEl.textContent = scores[this.localState.opponentViewId] || 0;
        }
    }
    
    getChoiceEmoji(choice) {
        const emojis = {
            rock: '🗿',
            paper: '📄',
            scissors: '✂️'
        };
        return emojis[choice] || '?';
    }
    
    showScreen(screenName) {
        // Clean up screen-specific listeners before transition
        this.eventManager.removeListeners(`screen_${this.localState.currentScreen}`);
        
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.add('hidden');
        });
        
        const targetScreen = document.getElementById(`${screenName}Screen`);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            this.localState.currentScreen = screenName;
            
            // Set up screen-specific handlers
            this.setupScreenHandlers(screenName);
        }
    }
    
    generateAddress() {
        const chars = '0123456789abcdef';
        let address = '0x';
        for (let i = 0; i < 40; i++) {
            address += chars[Math.floor(Math.random() * chars.length)];
        }
        return address;
    }
    
    generateBalance() {
        return Math.random() * 50 + 5;
    }
    
    generateSessionCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }
    
    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    setLoading(element, loading) {
        if (!element) return;
        
        if (loading) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }
    
    showToast(message, type = 'success') {
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Note: Views don't need to be registered in Multisynq, only Models do

// =============================================================================
// STANDALONE GAME CLASS (For non-Multisynq functionality)
// =============================================================================
class MonadRPS {
    constructor() {
        // Add EventManager
        this.eventManager = new EventManager();
        
        this.state = {
            wallet: {
                connected: false,
                address: null,
                balance: 0
            },
            currentScreen: 'landing',
            selectedBet: 1, // Fixed internal value
            multisynqEnabled: true
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.showScreen('landing');
        console.log('🟣 Monad RPS initialized');
        console.log('⚡ Ready to play on lightning-fast network');
    }

    
    
    bindEvents() {
    console.log('🔗 Binding main events...');
    
    // Store bound method references
    const connectWalletHandler = (event) => {
        event.preventDefault();
        this.connectWallet();
    };
    
    const disconnectWalletHandler = (event) => {
        event.preventDefault();
        this.disconnectWallet();
    };
    
    const joinFromWalletHandler = (event) => {
        event.preventDefault();
        this.handleJoinFromWallet();
    };
    
    // Bind main buttons
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const joinSessionBtn = document.getElementById('joinSessionBtn');
    
    if (connectBtn) {
        this.eventManager.addListener(connectBtn, 'click', connectWalletHandler, 'monad_wallet');
        console.log('✅ Connect button bound');
    }
    
    if (disconnectBtn) {
        this.eventManager.addListener(disconnectBtn, 'click', disconnectWalletHandler, 'monad_wallet');
    }
    
    if (joinSessionBtn) {
        this.eventManager.addListener(joinSessionBtn, 'click', joinFromWalletHandler, 'monad_navigation');
    }
    
    // Back buttons
    const backToGameModeBtn = document.getElementById('backToGameModeBtn');
    if (backToGameModeBtn) {
        const backHandler = (event) => {
            event.preventDefault();
            this.showScreen('gameMode');
        };
        this.eventManager.addListener(backToGameModeBtn, 'click', backHandler, 'monad_navigation');
    }
    
    // Optional: Add balance refresh on double-click
    const balanceEl = document.getElementById('balanceValue');
    if (balanceEl) {
        const refreshHandler = () => {
            this.refreshBalance();
            this.showToast('Refreshing balance...', 'info');
        };
        this.eventManager.addListener(balanceEl, 'dblclick', refreshHandler, 'monad_balance');
    }
}
    
    bindGameModeEvents() {
        console.log('🔗 Binding game mode events...');
        
        // Clean up existing listeners
        this.eventManager.removeListeners('monad_gamemode');
        
        // Get the buttons
        const joinFriendBtn = document.getElementById('findRandomBtn'); 
        const createSessionBtn = document.getElementById('createSessionBtn');
        
        console.log('🔍 Button check:', {
            joinFriendBtn: !!joinFriendBtn,
            createSessionBtn: !!createSessionBtn
        });
        
        if (createSessionBtn) {
            const createHandler = (event) => {
                event.preventDefault();
                console.log('🏠 Create session clicked');
                this.handleCreateSession();
            };
            
            this.eventManager.addListener(createSessionBtn, 'click', createHandler, 'monad_gamemode');
            console.log('✅ Create session handler bound');
        } else {
            console.error('❌ createSessionBtn not found');
        }
        
        if (joinFriendBtn) {
            const joinHandler = (event) => {
                event.preventDefault();
                console.log('🚪 Join friend clicked');
                this.handleJoinFriendSession();
            };
            
            this.eventManager.addListener(joinFriendBtn, 'click', joinHandler, 'monad_gamemode');
            console.log('✅ Join friend handler bound');
        } else {
            console.error('❌ findRandomBtn not found');
        }
    }
    
    setupScreenHandlers(screenName) {
        console.log(`🔧 Setting up handlers for screen: ${screenName}`);
        
        switch(screenName) {
            case 'gameMode':
                this.bindGameModeEvents();
                break;
            case 'joinSession':
                this.setupJoinSessionHandlers();
                break;
        }
    }
    
    setupJoinSessionHandlers() {
        console.log('🔗 Binding join session events...');
        
        this.eventManager.removeListeners('monad_join');
        
        const joinCodeBtn = document.getElementById('joinCodeBtn');
        const backBtn = document.getElementById('backToGameModeBtn');
        
        if (joinCodeBtn) {
            const joinHandler = (event) => {
                event.preventDefault();
                this.handleJoinSession();
            };
            this.eventManager.addListener(joinCodeBtn, 'click', joinHandler, 'monad_join');
            console.log('✅ Join code button bound');
        }
        
        if (backBtn) {
            const backHandler = (event) => {
                event.preventDefault();
                console.log('🔙 Back to game mode clicked');
                this.showScreen('gameMode');
            };
            this.eventManager.addListener(backBtn, 'click', backHandler, 'monad_join');
            console.log('✅ Back button bound');
        }
    }
    
    // =============================================================================
    // WALLET MANAGEMENT (MOCK)
    // =============================================================================
    

    
    // NEW connectWallet method
async connectWallet() {
    console.log('🔗 Connect wallet clicked');
    
    // Prevent multiple simultaneous connection attempts
    if (connectionInProgress) {
        console.log('🔄 Connection already in progress, ignoring click');
        this.showToast('Connection in progress...', 'info');
        return;
    }
    
    const connectBtn = document.getElementById('connectBtn');
    this.setLoading(connectBtn, true);
    connectionInProgress = true;
    
    try {
        // Check if MetaMask is available
        if (!window.ethereum) {
            this.showToast('Please install MetaMask to play', 'error');
            return;
        }
        
        // Connect using our ethers integration
        await window.monadWeb3.connect();
        
        console.log('✅ Wallet connected successfully');
        updateWalletStatusIndicator();
        
    } catch (error) {
        console.error('❌ Connection failed:', error);
        
        // Show user-friendly error messages
        let errorMessage;
        
        if (error.message.includes('install')) {
            errorMessage = 'Please install MetaMask to play';
        } else if (error.message.includes('rejected')) {
            errorMessage = 'Connection was cancelled';
        } else if (error.message.includes('pending')) {
            errorMessage = 'Please check MetaMask for pending requests';
        } else {
            errorMessage = 'Failed to connect wallet. Please try again.';
        }
        
        this.showToast(errorMessage, 'error');
        
    } finally {
        this.setLoading(connectBtn, false);
        connectionInProgress = false;
    }
}


// NEW disconnectWallet method
async disconnectWallet() {
    console.log('🔌 Disconnect wallet clicked');
    
    try {
        await window.monadWeb3.disconnect();
        console.log('✅ Wallet disconnected successfully');
        
    } catch (error) {
        console.error('❌ Error disconnecting wallet:', error);
        this.showToast('Error disconnecting wallet', 'error');
    }
}

// UPDATED updateWalletDisplay method
updateWalletDisplay() {
    // Update main wallet screen
    const addressEl = document.getElementById('walletAddress');
    const balanceEl = document.getElementById('balanceValue');
    
    if (addressEl && this.state.wallet.address) {
        addressEl.textContent = this.formatAddress(this.state.wallet.address);
    }
    
    if (balanceEl && this.state.wallet.balance !== null) {
        balanceEl.textContent = this.formatBalance(this.state.wallet.balance);
    }
    
    // Update header wallet display
    this.updateHeaderWalletDisplay();
}

// UPDATED updateHeaderWalletDisplay method
updateHeaderWalletDisplay() {
    const headerWalletInfo = document.getElementById('headerWalletInfo');
    const headerWalletAddress = document.getElementById('headerWalletAddress');
    
    if (this.state.wallet.connected && this.state.wallet.address) {
        if (headerWalletAddress) {
            headerWalletAddress.textContent = this.formatAddress(this.state.wallet.address);
        }
        if (headerWalletInfo) {
            headerWalletInfo.classList.remove('hidden');
        }
    } else {
        if (headerWalletInfo) {
            headerWalletInfo.classList.add('hidden');
        }
    }
}
    
    
    // =============================================================================
    // BET SELECTION & GAME MODE
    // =============================================================================
    
    
    
    showGameModeSelection() {
        const selectedBetEl = document.getElementById('selectedBetMode');
        if (selectedBetEl) {
            selectedBetEl.textContent = `${this.state.selectedBet} MONAD`;
        }
        
        this.showScreen('gameMode');
    }
    
    showPrivateSessionScreen(gameCode) {
        const codeEl = document.getElementById('sessionCode');
        const betAmountEl = document.getElementById('sessionBetAmount');
        
        if (codeEl) {
            codeEl.textContent = gameCode;
        }
        
        if (betAmountEl) {
            betAmountEl.textContent = `${this.state.selectedBet} MONAD`;
        }
        
        this.showScreen('privateSession');
        console.log('📺 Showing private session screen with code:', gameCode);
    }
    
    showMatchmakingScreen() {
        const selectedBetEl = document.getElementById('selectedBet');
        const prizePoolEl = document.getElementById('prizePool');
        
        if (selectedBetEl) {
            selectedBetEl.textContent = `${this.state.selectedBet} MONAD`;
        }
        
        if (prizePoolEl) {
            const prize = (this.state.selectedBet * 2 * 0.95).toFixed(3);
            prizePoolEl.textContent = `${prize} MONAD prize`;
        }
        
        this.showScreen('matchmaking');
        console.log('📺 Showing matchmaking screen');
    }
    
    showJoinSession() {
        this.showScreen('joinSession');
    }
    
    // =============================================================================
    // MULTISYNQ INTEGRATION TRIGGERS
    // =============================================================================
    
    async handleRandomMatchmaking() {
        if (!this.state.selectedBet || !this.state.wallet.connected) {
            this.showToast('Please select a bet amount first', 'error');
            return;
        }
        
        try {
            console.log('🎲 Starting random matchmaking with Multisynq');
            
            const sessionName = `random-${this.state.selectedBet}`;
            
            const session = await Multisynq.Session.join({
                apiKey: MULTISYNQ_CONFIG.apiKey,
                appId: MULTISYNQ_CONFIG.appId,
                name: sessionName,
                password: Multisynq.App.autoPassword(),
                model: RockPaperScissorsModel,
                view: RockPaperScissorsView,
                debug: MULTISYNQ_CONFIG.debug
            });
            
            this.multisynqSession = session;
            
            // Pass wallet state to the view
            if (session.view) {
                session.view.localState.wallet = { ...this.state.wallet };
                session.view.localState.selectedBet = this.state.selectedBet;
            }
            
            this.showMatchmakingScreen();
            
            console.log('✅ Multisynq session created:', session.id);
            console.log('🎯 View will automatically send player-ready signal');
            
        } catch (error) {
            console.error('❌ Failed to start matchmaking:', error);
            this.showToast('Failed to start matchmaking', 'error');
        }
    }

    handleJoinFriendSession() {
        console.log('🚪 handleJoinFriendSession called');
        
        if (!this.state.wallet.connected) {
            this.showToast('Please connect wallet first', 'error');
            return;
        }
        
        this.showJoinSession();
    }
    
    handleJoinFromWallet() {
    console.log('🚪 Join from wallet clicked');
    
    if (!this.state.wallet.connected) {
        this.showToast('Please connect wallet first', 'error');
        return;
    }
    
    this.showJoinSession();
}
    
    async handleCreateSession() {
    console.log('🏠 handleCreateSession called');
    
    // Check wallet connection
    if (!window.monadWeb3?.isConnected()) {
        this.showToast('Please connect your wallet first', 'error');
        return;
    }
    
    try {
        console.log('🏠 Creating private session...');
        
        const gameCode = this.generateSessionCode();
        const sessionName = `private-${gameCode}`;
        
        console.log('🔑 Generated code:', gameCode);
        
        const session = await Multisynq.Session.join({
            apiKey: MULTISYNQ_CONFIG.apiKey,
            appId: MULTISYNQ_CONFIG.appId,
            name: sessionName,
            password: gameCode,
            model: RockPaperScissorsModel,
            view: RockPaperScissorsView,
            debug: MULTISYNQ_CONFIG.debug
        });
        
        this.multisynqSession = session;
        
        // Pass wallet state to the view
        if (session.view) {
            session.view.localState.wallet = { ...this.state.wallet };
            session.view.localState.selectedBet = this.state.selectedBet;
        }
        
        // Show the private session screen
        this.showPrivateSessionScreen(gameCode);
        
        console.log('✅ Private session created:', gameCode);
        
    } catch (error) {
        console.error('❌ Failed to create private session:', error);
        this.showToast('Failed to create session: ' + error.message, 'error');
    }
}
    
    async handleJoinSession() {
    const codeInput = document.getElementById('sessionCodeInput');
    const code = codeInput?.value?.trim().toUpperCase();
    
    if (!code || code.length !== 6) {
        this.showToast('Please enter a valid 6-character code', 'error');
        return;
    }
    
    // Check wallet connection
    if (!window.monadWeb3?.isConnected()) {
        this.showToast('Please connect your wallet first', 'error');
        return;
    }
    
    const joinBtn = document.getElementById('joinCodeBtn');
    this.setLoading(joinBtn, true);
    
    try {
        console.log('🚪 Joining session with code:', code);
        
        const sessionName = `private-${code}`;
        
        const session = await Multisynq.Session.join({
            apiKey: MULTISYNQ_CONFIG.apiKey,
            appId: MULTISYNQ_CONFIG.appId,
            name: sessionName,
            password: code,
            model: RockPaperScissorsModel,
            view: RockPaperScissorsView,
            debug: MULTISYNQ_CONFIG.debug
        });
        
        this.multisynqSession = session;
        
        // Pass wallet state to the view
        if (session.view) {
            session.view.localState.wallet = { ...this.state.wallet };
            session.view.localState.selectedBet = this.state.selectedBet;
        }
        
        this.showToast('Joined session successfully!', 'success');
        console.log('✅ Joined session:', session.id);
        
    } catch (error) {
        console.error('❌ Failed to join session:', error);
        this.showToast('Session not found or expired', 'error');
    } finally {
        this.setLoading(joinBtn, false);
    }
}
    async refreshBalance() {
    if (!window.monadWeb3?.isConnected()) {
        console.log('⚠️ No wallet connected for balance refresh');
        return;
    }
    
    try {
        console.log('🔄 Refreshing balance...');
        const newBalance = await window.monadWeb3.getBalance();
        
        if (this.state.wallet.connected) {
            this.state.wallet.balance = newBalance;
            this.updateWalletDisplay();
        }
        
        console.log('✅ Balance refreshed:', newBalance, 'MON');
        
    } catch (error) {
        console.error('❌ Failed to refresh balance:', error);
    }
}

    updateLivePlayerCounts() {
        const playerCountElements = document.querySelectorAll('.live-players');
        playerCountElements.forEach(el => {
            const betAmount = el.dataset.amount;
            // Mock live player count based on bet amount
            let playerCount;
            switch(betAmount) {
                case '0.01': playerCount = Math.floor(Math.random() * 20) + 10; break;
                case '0.1': playerCount = Math.floor(Math.random() * 15) + 5; break;
                case '1': playerCount = Math.floor(Math.random() * 10) + 2; break;
                case '10': playerCount = Math.floor(Math.random() * 5) + 1; break;
                default: playerCount = Math.floor(Math.random() * 10) + 1;
            }
            el.textContent = playerCount;
        });
    }
    
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    
    cleanup() {
        this.eventManager.cleanup();
    }
    
    generateAddress() {
        const chars = '0123456789abcdef';
        let address = '0x';
        for (let i = 0; i < 40; i++) {
            address += chars[Math.floor(Math.random() * chars.length)];
        }
        return address;
    }
    
    generateBalance() {
        return Math.random() * 50 + 5;
    }
    
    generateSessionCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }
    
    formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
    

    checkWalletStatus() {
    return {
        hasWallet: !!window.ethereum,
        isConnected: window.monadWeb3?.isConnected() || false,
        account: window.monadWeb3?.getAccount() || null
    };
}

   

    formatBalance(balance) {
    if (balance === null || balance === undefined) return '0.000';
    return Number(balance).toFixed(3);
}
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    setLoading(element, loading) {
        if (!element) return;
        
        if (loading) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }
    
    showScreen(screenName) {
        console.log(`📺 Switching to screen: ${screenName}`);
        
        // Clean up current screen listeners
        this.eventManager.removeListeners(`screen_${this.state.currentScreen}`);
        
        // Hide all screens
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(`${screenName}Screen`);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            this.state.currentScreen = screenName;
            
            // Set up screen-specific handlers
            this.setupScreenHandlers(screenName);
            
            console.log(`✅ Screen switched to: ${screenName}`);
        } else {
            console.error(`❌ Screen not found: ${screenName}Screen`);
        }
    }
    
    showToast(message, type = 'success') {
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Check if Multisynq is loaded
    if (typeof Multisynq === 'undefined') {
        console.error('❌ Multisynq is not loaded! Check the CDN link.');
        return;
    }
    
    console.log('✅ Multisynq loaded:', Multisynq);
    console.log('📋 Available Multisynq methods:', Object.keys(Multisynq));
    
    // Test API key format
    const apiKey = MULTISYNQ_CONFIG.apiKey;
    console.log('🔑 API Key length:', apiKey.length);
    console.log('🔑 API Key format valid:', /^[a-zA-Z0-9]+$/.test(apiKey));
    
    // Initialize the standalone game class for basic functionality
    const game = new MonadRPS();
    window.monadRPS = game;
    
    // Note: Multisynq sessions are created dynamically when users join/create games
    // The RockPaperScissorsModel and RockPaperScissorsView classes are registered
    // and will be instantiated when Session.join() is called
    
    console.log('🎮 Monad RPS with Multisynq ready!');
    console.log('🌐 Real-time multiplayer enabled');
    console.log('⚡ Join or create sessions to start playing');
});