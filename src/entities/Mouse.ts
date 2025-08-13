import * as createjs from '@thegraid/createjs-module';
import { GameObject, Position } from '@types';
import { calculateAngle, calculateDistance } from '@utils/math';

export class Mouse implements GameObject {
  private shape: createjs.Shape;
  private stage: createjs.Stage;
  private position: Position;
  private playerPosition: Position;
  private angle: number = 0;
  private distance: number = 0;

  constructor(stage: createjs.Stage) {
    this.stage = stage;
    this.position = { x: 0, y: 0 };
    this.playerPosition = { x: 0, y: 0 };
    
    // Create crosshair shape
    this.shape = new createjs.Shape();
    this.shape.graphics
      .beginFill("rgb(0, 232, 255)")
      .drawPolyStar(0, 0, 15, 4, 0.95, 0);
    
    stage.addChild(this.shape);
  }

  public update(): void {
    // Update crosshair position to follow mouse
    this.shape.x = this.position.x;
    this.shape.y = this.position.y;
    
    // Calculate angle and distance from player
    this.angle = calculateAngle(this.playerPosition, this.position);
    this.distance = calculateDistance(this.playerPosition, this.position);
  }

  public updateMousePosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }

  public updatePlayerPosition(position: Position): void {
    this.playerPosition = position;
  }

  public getAngle(): number {
    return this.angle * -1; // Invert for player rotation
  }

  public getDistance(): number {
    return this.distance;
  }

  public getPosition(): Position {
    return { ...this.position };
  }
}