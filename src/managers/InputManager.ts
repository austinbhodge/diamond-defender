export class InputManager {
  private pressedKeys: Set<string> = new Set();
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private mouseDown: boolean = false;
  private stage: createjs.Stage;

  constructor(stage: createjs.Stage) {
    this.stage = stage;
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Mouse events
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    
    // Handle mouse leaving the window
    document.addEventListener('mouseleave', () => {
      this.mouseDown = false;
    });
    
    // Prevent right-click context menu in game
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.pressedKeys.add(event.code);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.pressedKeys.delete(event.code);
  }

  private handleMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // Left click only
      this.mouseDown = true;
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.mouseDown = false;
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const canvas = this.stage.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    
    this.mousePosition.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    this.mousePosition.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  }

  public isKeyPressed(key: string): boolean {
    return this.pressedKeys.has(key);
  }

  public isAnyKeyPressed(keys: string[]): boolean {
    return keys.some(key => this.pressedKeys.has(key));
  }

  public getPressedKeys(): Set<string> {
    return new Set(this.pressedKeys);
  }

  public isMouseDown(): boolean {
    return this.mouseDown && this.isMouseInBounds();
  }

  public getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }

  private isMouseInBounds(): boolean {
    const canvas = this.stage.canvas as HTMLCanvasElement;
    return this.mousePosition.x >= 0 && 
           this.mousePosition.x <= canvas.width &&
           this.mousePosition.y >= 0 && 
           this.mousePosition.y <= canvas.height;
  }

  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
  }
}