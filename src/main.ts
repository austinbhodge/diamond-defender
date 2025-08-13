import { GameManager } from '@managers/GameManager';

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', () => {
  // Initialize game
  const game = new GameManager('canvas');
  
  // Handle window unload
  window.addEventListener('beforeunload', () => {
    game.destroy();
  });
});