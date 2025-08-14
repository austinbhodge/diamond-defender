import { GameObject, WaveData, WaveState, WaveConfig } from '@types';
import { gameConfig } from '@config/gameConfig';

export interface EnemySpawnInfo {
  x: number;
  y: number;
  hp: number;
  speed: number;
}

export class WaveManager implements GameObject {
  private waveData: WaveData;
  private config: WaveConfig;
  private restTimer: number = 0;
  private spawnTimer: number = 0;
  private countdownTimer: number = 0;
  private countingDown: boolean = false;
  private onWaveStart: () => void;
  private onWaveComplete: () => void;
  private onEnemySpawn: (spawnInfo: EnemySpawnInfo) => void;

  constructor(
    onWaveStart: () => void,
    onWaveComplete: () => void,
    onEnemySpawn: (spawnInfo: EnemySpawnInfo) => void
  ) {
    this.config = gameConfig.waves;
    this.onWaveStart = onWaveStart;
    this.onWaveComplete = onWaveComplete;
    this.onEnemySpawn = onEnemySpawn;

    // Initialize first wave
    this.waveData = {
      number: 1,
      totalEnemies: this.calculateEnemiesForWave(1),
      enemiesRemaining: 0,
      enemiesSpawned: 0,
      state: WaveState.PREPARATION
    };

    this.waveData.enemiesRemaining = this.waveData.totalEnemies;
  }

  public update(): void {
    const deltaTime = 1 / gameConfig.fps; // Time per frame in seconds

    switch (this.waveData.state) {
      case WaveState.PREPARATION:
        this.handlePreparation();
        break;

      case WaveState.ACTIVE:
        this.handleActiveWave(deltaTime);
        break;

      case WaveState.REST:
        this.handleRestPeriod(deltaTime);
        break;

      case WaveState.COMPLETE:
        // Game complete state - could add end game logic here
        break;
    }
  }

  private handlePreparation(): void {
    // Start the wave immediately after preparation
    this.startWave();
  }

  private handleActiveWave(deltaTime: number): void {
    // Check if we need to spawn more enemies
    if (this.waveData.enemiesSpawned < this.waveData.totalEnemies) {
      this.spawnTimer -= deltaTime;
      
      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        this.spawnTimer = this.config.spawnDelay;
      }
    }
  }

  private handleRestPeriod(deltaTime: number): void {
    // Handle countdown if triggered manually
    if (this.countingDown) {
      this.countdownTimer -= deltaTime;
      
      if (this.countdownTimer <= 0) {
        this.countingDown = false;
        this.startNextWave();
      }
    }
    // No automatic progression - waves only start manually
  }

  private startWave(): void {
    this.waveData.state = WaveState.ACTIVE;
    this.spawnTimer = 0; // Start spawning immediately
    this.onWaveStart();
  }

  private spawnEnemy(): void {
    const spawnInfo = this.generateEnemySpawnInfo();
    this.onEnemySpawn(spawnInfo);
    this.waveData.enemiesSpawned++;
  }

  private generateEnemySpawnInfo(): EnemySpawnInfo {
    // Calculate enemy stats for current wave
    const baseHp = gameConfig.enemy.hp;
    const baseSpeed = gameConfig.enemy.baseSpeed;
    
    const hpMultiplier = Math.pow(this.config.difficultyScaling.hpMultiplier, this.waveData.number - 1);
    const speedMultiplier = Math.pow(this.config.difficultyScaling.speedMultiplier, this.waveData.number - 1);
    
    const hp = Math.floor(baseHp * hpMultiplier);
    const speed = baseSpeed * speedMultiplier;

    // Generate spawn position at random edge
    const { x, y } = this.generateSpawnPosition();

    return { x, y, hp, speed };
  }

  private generateSpawnPosition(): { x: number; y: number } {
    const { width, height } = gameConfig.canvas;
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    
    switch (side) {
      case 0: // Top
        x = Math.random() * width;
        y = -50;
        break;
      case 1: // Right
        x = width + 50;
        y = Math.random() * height;
        break;
      case 2: // Bottom
        x = Math.random() * width;
        y = height + 50;
        break;
      case 3: // Left
        x = -50;
        y = Math.random() * height;
        break;
    }
    
    return { x, y };
  }

  private calculateEnemiesForWave(waveNumber: number): number {
    return this.config.baseEnemyCount + (waveNumber - 1) * this.config.enemyScaling;
  }

  public onEnemyKilled(): void {
    this.waveData.enemiesRemaining--;
    
    if (this.waveData.enemiesRemaining <= 0) {
      this.completeWave();
    }
  }

  private completeWave(): void {
    this.waveData.state = WaveState.REST;
    this.restTimer = 0; // No automatic timer
    this.onWaveComplete();
  }

  private startNextWave(): void {
    this.waveData.number++;
    this.waveData.totalEnemies = this.calculateEnemiesForWave(this.waveData.number);
    this.waveData.enemiesRemaining = this.waveData.totalEnemies;
    this.waveData.enemiesSpawned = 0;
    this.waveData.state = WaveState.PREPARATION;
  }

  public getWaveData(): WaveData {
    return { ...this.waveData };
  }

  public getRestTimeRemaining(): number {
    return Math.max(0, this.restTimer);
  }

  public getCountdownTimeRemaining(): number {
    return Math.max(0, this.countdownTimer);
  }

  public isCountingDown(): boolean {
    return this.countingDown;
  }

  public isInRestPeriod(): boolean {
    return this.waveData.state === WaveState.REST;
  }

  public triggerWaveStart(): void {
    if (this.waveData.state === WaveState.REST && !this.countingDown) {
      this.countingDown = true;
      this.countdownTimer = 3; // 3 second countdown
    }
  }

  public getCurrentWave(): number {
    return this.waveData.number;
  }

  public getPointsPerKill(): number {
    return this.config.pointsPerKill;
  }
}