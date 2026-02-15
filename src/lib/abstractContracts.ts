// Abstract Chain Contract Address Mapping
// Used to identify apps/contracts by their addresses

export const ABSTRACT_CONTRACTS: Record<string, { name: string; category: string; icon?: string }> = {
  // Core Infrastructure
  '0x3439153eb7af838ad19d56e1571fbd09333c2809': { name: 'WETH', category: 'token', icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  '0x84a71ccd554cc1b02749b35d22f684cc8ec987e1': { name: 'USDC', category: 'token' },
  '0x0709f39376deee2a2dfc94a58edeb2eb9df012bd': { name: 'USDT', category: 'token' },

  // DEX
  '0xad1eca41e6f772be3cb5a48a6141f9bcc1af9f7c': { name: 'Uniswap V2 Router', category: 'dex' },
  '0x566d7510dee58360a64c9827257cf6d0dc43985e': { name: 'Uniswap V2 Factory', category: 'dex' },
  '0x7712fa47387542819d4e35a23f8116c90c18767c': { name: 'Uniswap SwapRouter', category: 'dex' },
  '0xa1160e73b63f322ae88cc2d8e700833e71d0b2a1': { name: 'Uniswap V3 Factory', category: 'dex' },
  '0xe1b076ea612db28a0d768660e4d81346c02ed75e': { name: 'Universal Router', category: 'dex' },

  // NFT & Marketplace
  '0xdf3969a315e3fc15b89a2752d0915cc76a5bd82d': { name: 'Seaport (OpenSea)', category: 'marketplace', icon: '/apps/opensea.png' },
  '0xbc176ac2373614f9858a118917d83b139bcb3f8c': { name: 'Abstract Badges', category: 'nft' },
  '0xec27d2237432d06981e1f18581494661517e1bd3': { name: 'Xeet Cards', category: 'nft', icon: '/apps/xeet.png' },

  // Gaming - Top contracts by usage
  '0x27edd16ee56958fddcba08947f12c43ddec2b20c': { name: 'Death Fun', category: 'gaming', icon: '/apps/death-fun.png' },
  '0x1859072d67fdd26c8782c90a1e4f078901c0d763': { name: 'CommitReveal', category: 'gaming' },
  '0x980596ac24d0ca1e82a0a1d7ffaa6803acd2708c': { name: 'Gigaverse', category: 'gaming', icon: '/apps/gigaverse.png' },
  '0x3272596f776470d2d7c3f7dff3dc50888b7d8967': { name: 'Gacha', category: 'gaming', icon: '/apps/gacha.png' },
  '0x35ffe9d966e35bd1b0e79f0d91e438701ea1c644': { name: 'Moody Madness', category: 'gaming', icon: '/apps/moody-madness.png' },
  '0xdf70075737e9f96b078ab4461eee3e055e061223': { name: 'Bigcoin', category: 'gaming', icon: '/apps/bigcoin.png' },
  '0x09ee83d8fa0f3f03f2aefad6a82353c1e5de5705': { name: 'Bigcoin', category: 'gaming', icon: '/apps/bigcoin.png' },
  '0xa0f69095d2b31e9795e9923cd2a66fa911ccd3cf': { name: 'Roach Racing', category: 'gaming', icon: '/apps/roach-racing-club.png' },
  '0xee580828b426b6cc33817bce419daf65a516aa7e': { name: 'Cardex', category: 'gaming' },
  '0x7c47ea32fd27d1a74fc6e9f31ce8162e6ce070eb': { name: 'Onchain Heroes', category: 'gaming', icon: '/apps/onchain-heroes.png' },

  // NFT Collections
  '0x09bb4c785165915e66f4a645bc978a6c885a0319': { name: 'Web3 Playboys', category: 'nft' },
  '0x1e49b0d225c45b22f66bd660841d98e153c7abd5': { name: 'W3PB Traits', category: 'nft' },
  '0x821688558ba398b732731f37b3d39ea42016b1e3': { name: 'Pengs on Abs', category: 'nft' },
  '0x99bb83ae9bb0c0a6be865cacf67760947f91cb70': { name: 'Objekt', category: 'nft', icon: '/apps/cosmo-modhaus.png' },

  // Bridges
  '0xf70da97812cb96acdf810712aa562db8dfa3dbef': { name: 'Relay', category: 'bridge', icon: '/apps/relay.png' },
  '0xbbbfd134e9b44bfb5123898ba36b01de7ab93d98': { name: 'Relay', category: 'bridge', icon: '/apps/relay.png' },
  '0x3bdb03ad7363152dfbc185ee23ebc93f0cf93fd1': { name: 'Orbiter Bridge', category: 'bridge' },

  // Tokens
  '0x9ebe3a824ca958e4b3da772d2065518f009cba62': { name: 'PENGU', category: 'token' },
  '0x4c68e4102c0f120cce9f08625bd12079806b7c4d': { name: 'Aborean Finance', category: 'token', icon: '/apps/aborean-finance.png' },

  // Identity
  '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432': { name: 'Identity Registry', category: 'identity' },
  '0x8004baa17c55a88189ae136b182e5fda19de9b63': { name: 'Reputation Registry', category: 'identity' },

  // Safe/Multisig
  '0xc35f063962328ac65ced5d4c3fc5def8dec68dfa': { name: 'Safe', category: 'wallet' },
  '0x610fca2e0279fa1f8c00c8c2f71df522ad469380': { name: 'SafeL2', category: 'wallet' },
  '0xc329d02fd8cb2fc13aa919005af46320794a8629': { name: 'Safe Factory', category: 'wallet' },

  // Account Abstraction
  '0x0000000071727de22e5e9d8baf0edac6f37da032': { name: 'Entry Point v0.7', category: 'aa' },
  '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789': { name: 'Entry Point Legacy', category: 'aa' },
};

// Get app name from contract address
export function getAppName(address: string): string | null {
  const normalized = address.toLowerCase();
  return ABSTRACT_CONTRACTS[normalized]?.name || null;
}

// Get app info from contract address
export function getAppInfo(address: string): { name: string; category: string; icon?: string } | null {
  const normalized = address.toLowerCase();
  return ABSTRACT_CONTRACTS[normalized] || null;
}

// Category colors for UI
export const CATEGORY_COLORS: Record<string, string> = {
  gaming: '#f59e0b',
  dex: '#3b82f6',
  nft: '#ec4899',
  bridge: '#8b5cf6',
  token: '#10b981',
  marketplace: '#06b6d4',
  wallet: '#6366f1',
  identity: '#14b8a6',
  aa: '#a855f7',
};
