import * as createjs from '@thegraid/createjs-module';
import { GameObject, Position } from '@types';
import { calculateAngle, calculateDistance } from '@utils/math';
import { ShipRenderers } from '@rendering/ShipRenderers';

export class Mouse implements GameObject {
  private shape: createjs.Shape;
  private stage: createjs.Stage;
  private position: Position;
  private playerPosition: Position;
  private angle: number = 0;
  private distance: number = 0;
  private animPhase: number = 0;

  constructor(stage: createjs.Stage) {
    this.stage = stage;
    this.position = { x: 0, y: 0 };
    this.playerPosition = { x: 0, y: 0 };

    // Create sci-fi crosshair
    this.shape = new createjs.Shape();
    ShipRenderers.drawCrosshair(this.shape.graphics, 0);

    stage.addChild(this.shape);
  }

  public update(): void {
    // Animate crosshair spin
    this.animPhase += 0.03;

    // Redraw crosshair with updated animation
    this.shape.graphics.clear();
    ShipRenderers.drawCrosshair(this.shape.graphics, this.animPhase);

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
