"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface Block {
  type: 'BEGIN' | 'char';
  value: string;
  subscripts: string[];
  superscripts: string[];
  scriptWidth: number;
}

interface Cursor {
  blockIndex: number;
  mode: 'main' | 'super' | 'sub';
  scriptIndex: number;
}

interface Selection {
  start: number;
  end: number;
}

class FormulaSystem {
  blocks: Block[];
  cursor: Cursor;
  selection: Selection | null;

  constructor() {
    this.blocks = [{ type: 'BEGIN', value: '', subscripts: [], superscripts: [], scriptWidth: 0 }];
    this.cursor = {
      blockIndex: 0,
      mode: 'main',
      scriptIndex: 0
    };
    this.selection = null;
  }

  addChar(char: string): void {
    if (this.selection) {
      this.blocks.splice(this.selection.start, this.selection.end - this.selection.start);
      this.cursor.blockIndex = this.selection.start;
      this.cursor.mode = 'main';
      this.cursor.scriptIndex = 0;
      this.selection = null;
    }

    if (this.cursor.blockIndex >= this.blocks.length) {
      this.cursor.blockIndex = this.blocks.length - 1;
    }

    if (this.cursor.mode === 'main') {
      this.blocks.splice(this.cursor.blockIndex + 1, 0, {
        type: 'char',
        value: char,
        subscripts: [],
        superscripts: [],
        scriptWidth: 0  
      });
      this.cursor.blockIndex++;
    } else if (this.cursor.mode === 'super') {
      const block = this.blocks[this.cursor.blockIndex];
      if (block && block.type === 'char') {
        block.superscripts.splice(this.cursor.scriptIndex + 1, 0, char);
        this.cursor.scriptIndex++;
        this.updateScriptWidth(this.cursor.blockIndex);
      }
    } else if (this.cursor.mode === 'sub') {
      const block = this.blocks[this.cursor.blockIndex];
      if (block && block.type === 'char') {
        block.subscripts.splice(this.cursor.scriptIndex + 1, 0, char);
        this.cursor.scriptIndex++;
        this.updateScriptWidth(this.cursor.blockIndex);
      }
    }
  }

  updateScriptWidth(blockIndex: number): void {
    const block = this.blocks[blockIndex];
    const superWidth = block.superscripts.length * 10;
    const subWidth = block.subscripts.length * 10;
    block.scriptWidth = Math.max(superWidth, subWidth);
  }

  moveLeft() {
    if (this.cursor.mode === 'main' && this.cursor.blockIndex > 0) {
      this.cursor.blockIndex--;
      return true;
    } else if (this.cursor.mode !== 'main' && this.cursor.scriptIndex > 0) {
      this.cursor.scriptIndex--;
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.cursor.mode === 'main' && this.cursor.blockIndex < this.blocks.length - 1) {
      this.cursor.blockIndex++;
      return true;
    } else if (this.cursor.mode === 'super' && 
               this.cursor.scriptIndex < this.blocks[this.cursor.blockIndex].superscripts.length) {
      this.cursor.scriptIndex++;
      return true;
    } else if (this.cursor.mode === 'sub' && 
               this.cursor.scriptIndex < this.blocks[this.cursor.blockIndex].subscripts.length) {
      this.cursor.scriptIndex++;
      return true;
    }
    return false;
  }

  enterSuperscript() {
    if (this.cursor.mode === 'main' && this.blocks[this.cursor.blockIndex].type !== 'BEGIN') {
      this.cursor.mode = 'super';
      this.cursor.scriptIndex = this.blocks[this.cursor.blockIndex].superscripts.length;
      return true;
    }
    return false;
  }

  enterSubscript() {
    if (this.cursor.mode === 'main' && this.blocks[this.cursor.blockIndex].type !== 'BEGIN') {
      this.cursor.mode = 'sub';
      this.cursor.scriptIndex = this.blocks[this.cursor.blockIndex].subscripts.length;
      return true;
    }
    return false;
  }

  exitScript() {
    if (this.cursor.mode !== 'main') {
      this.cursor.mode = 'main';
      this.cursor.scriptIndex = 0;
      return true;
    }
    return false;
  }

  backspace(): void {
    if (this.cursor.mode === 'main') {
      if (this.cursor.blockIndex > 0) {
        this.blocks.splice(this.cursor.blockIndex, 1);
        this.cursor.blockIndex--;
      }
    } else if (this.cursor.mode === 'super') {
      const block = this.blocks[this.cursor.blockIndex];
      if (this.cursor.scriptIndex > 0) {
        block.superscripts.splice(this.cursor.scriptIndex - 1, 1);
        this.cursor.scriptIndex--;
        this.updateScriptWidth(this.cursor.blockIndex);
      }
    } else if (this.cursor.mode === 'sub') {
      const block = this.blocks[this.cursor.blockIndex];
      if (this.cursor.scriptIndex > 0) {
        block.subscripts.splice(this.cursor.scriptIndex - 1, 1);
        this.cursor.scriptIndex--;
        this.updateScriptWidth(this.cursor.blockIndex);
      }
    }
  }

  getFormula(isSelecting?: boolean): React.ReactNode {
    const result: React.ReactNode[] = [];
    let totalOffset = 0;

    this.blocks.forEach((block, i) => {
      if (block.type === 'char') {
        const blockWidth = Math.max(block.scriptWidth, 20);
        const isSelected = this.selection && i >= this.selection.start && i < this.selection.end;
        
        result.push(
          <span key={i} className="relative inline-block" style={{ marginRight: `${block.scriptWidth}px` }}>
            {/* 主字符 */}
            <span className={`relative ${isSelected ? 'bg-blue-200' : ''}`}>
              {block.value}
              {!isSelecting && this.cursor.mode === 'main' && this.cursor.blockIndex === i && (
                <span className="text-blue-500 absolute -right-2">|</span>
              )}
            </span>
            
            {/* 上标 */}
            {(block.superscripts.length > 0 || this.cursor.mode === 'super' && this.cursor.blockIndex === i) && (
              <span className="absolute -top-3 left-full text-sm">
                {block.superscripts.map((char, j) => (
                  <span key={`super-${i}-${j}`}>{char}</span>
                ))}
                {!isSelecting && this.cursor.mode === 'super' && this.cursor.blockIndex === i && (
                  <span className="text-blue-500">|</span>
                )}
              </span>
            )}
            
            {/* 下标 */}
            {(block.subscripts.length > 0 || this.cursor.mode === 'sub' && this.cursor.blockIndex === i) && (
              <span className="absolute -bottom-3 left-full text-sm">
                {block.subscripts.map((char, j) => (
                  <span key={`sub-${i}-${j}`}>{char}</span>
                ))}
                {!isSelecting && this.cursor.mode === 'sub' && this.cursor.blockIndex === i && (
                  <span className="text-blue-500">|</span>
                )}
              </span>
            )}
          </span>
        );

        totalOffset += blockWidth;
      }
    });

    return (
      <div className="relative whitespace-nowrap">
        {result}
      </div>
    );
  }

  hasSubscript(): boolean {
    if (this.cursor.mode === 'main' && this.blocks[this.cursor.blockIndex].type !== 'BEGIN') {
      return this.blocks[this.cursor.blockIndex].subscripts.length > 0;
    }
    return false;
  }

  hasSuperscript(): boolean {
    if (this.cursor.mode === 'main' && this.blocks[this.cursor.blockIndex].type !== 'BEGIN') {
      return this.blocks[this.cursor.blockIndex].superscripts.length > 0;
    }
    return false;
  }

  startSelection() {
    this.selection = {
      start: this.cursor.blockIndex,
      end: this.cursor.blockIndex + 1
    };
  }

  expandSelectionLeft() {
    if (this.selection && this.selection.start > 1) {
      this.selection.start--;
    }
  }

  expandSelectionRight() {
    if (this.selection && this.selection.end < this.blocks.length) {
      this.selection.end++;
    }
  }

  deleteSelection() {
    if (this.selection) {
      this.blocks.splice(this.selection.start, this.selection.end - this.selection.start);
      this.cursor.blockIndex = this.selection.start;
      this.selection = null;
    }
  }

  clearSelection() {
    this.selection = null;
  }
}

const FormulaEditor = () => {
  const [formula] = useState(new FormulaSystem());
  const [, forceUpdate] = useState({});
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [canMove, setCanMove] = useState(true);
  const [lastDirection, setLastDirection] = useState<'right' | 'rightDown' | 'down' | 'leftDown' | 'left' | 'leftUp' | 'up' | 'rightUp' | null>(null);

  // 添加防抖控制
  const [lastMoveTime, setLastMoveTime] = useState(0);
  const MOVE_THROTTLE = 16; // 约60fps

  const [pressProgress, setPressProgress] = useState(0);
  const PRESS_DURATION = 500; // 与长按计时器时间相同

  const [isSelecting, setIsSelecting] = useState(false);

  // 添加长按进度动画
  useEffect(() => {
    let animationFrame: number;
    let startTime: number;

    if (longPressTimer) {
      startTime = Date.now();
      const animate = () => {
        const progress = Math.min((Date.now() - startTime) / PRESS_DURATION, 1);
        setPressProgress(progress);
        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };
      animationFrame = requestAnimationFrame(animate);
    } else {
      setPressProgress(0);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [longPressTimer]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key.match(/^[a-zA-Z0-9+\-=]$/)) {
      formula.addChar(e.key);
      forceUpdate({});
    }
  }, [formula]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isSelecting) {
      if (e.key === 'Escape') {
        formula.clearSelection();
        setIsSelecting(false);
        forceUpdate({});
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        formula.deleteSelection();
        setIsSelecting(false);
        forceUpdate({});
      }
    } else {
      if (e.key === 'Backspace') {
        formula.backspace();
        forceUpdate({});
      }
    }
  }, [isSelecting, formula]);

  useEffect(() => {
    window.addEventListener('keypress', handleKeyPress);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyPress, handleKeyDown]);

  const handleJoystickMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const currentTime = Date.now();
    if (currentTime - lastMoveTime < MOVE_THROTTLE) return;
    setLastMoveTime(currentTime);

    const joystickRect = e.currentTarget.getBoundingClientRect();
    const centerX = joystickRect.width / 2;
    const centerY = joystickRect.height / 2;
    
    let x = e.clientX - joystickRect.left - centerX;
    let y = e.clientY - joystickRect.top - centerY;
    
    const radius = joystickRect.width / 4;
    const distance = Math.sqrt(x * x + y * y);
    
    if (distance > radius) {
      x = (x / distance) * radius;
      y = (y / distance) * radius;
    }

    setJoystickPos({ x, y });

    if (isSelecting) {
      if (distance > radius * 0.3) {
        const angle = Math.atan2(y, x) * 180 / Math.PI;
        if (angle > 0) {
          formula.expandSelectionLeft();
        } else {
          formula.expandSelectionRight();
        }
        forceUpdate({});
      }
    } else if (distance > radius * 0.15) {
      const angle = Math.atan2(y, x) * 180 / Math.PI;
      let direction: 'right' | 'rightDown' | 'down' | 'leftDown' | 'left' | 'leftUp' | 'up' | 'rightUp';

      if (angle >= -22.5 && angle <= 22.5) direction = 'right';
      else if (angle > 22.5 && angle < 67.5) direction = 'rightDown';
      else if (angle >= 67.5 && angle <= 112.5) direction = 'down';
      else if (angle > 112.5 && angle < 157.5) direction = 'leftDown';
      else if (angle >= 157.5 || angle <= -157.5) direction = 'left';
      else if (angle > -157.5 && angle < -112.5) direction = 'leftUp';
      else if (angle >= -112.5 && angle <= -67.5) direction = 'up';
      else direction = 'rightUp';

      if (direction !== lastDirection) {
        setLastDirection(direction);
        setCanMove(false);

        if (longPressTimer) {
          clearTimeout(longPressTimer);
          setLongPressTimer(null);
        }

        switch (direction) {
          case 'left':
            formula.moveLeft();
            break;
          case 'right':
            formula.moveRight();
            break;
          case 'leftUp':
          case 'leftDown':
          case 'up':
          case 'down':
            formula.exitScript();
            break;
          case 'rightUp':
            if (formula.hasSuperscript()) {
              formula.enterSuperscript();
            } else {
              setLongPressTimer(setTimeout(() => {
                formula.enterSuperscript();
                forceUpdate({});
              }, 500));
            }
            break;
          case 'rightDown':
            if (formula.hasSubscript()) {
              formula.enterSubscript();
            } else {
              setLongPressTimer(setTimeout(() => {
                formula.enterSubscript();
                forceUpdate({});
              }, 500));
            }
            break;
        }
        forceUpdate({});
      }
    } else {
      setLastDirection(null);
      setCanMove(true);
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }
  }, [isDragging, canMove, lastDirection, formula, longPressTimer, lastMoveTime, isSelecting]);

  const handleJoystickEnd = useCallback(() => {
    setIsDragging(false);
    setJoystickPos({ x: 0, y: 0 });
    setLastDirection(null);
    setCanMove(true);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  const handleSymbolClick = useCallback((symbol: string) => {
    formula.addChar(symbol);
    forceUpdate({});
  }, [formula]);

  const handleJoystickStart = useCallback(() => {
    setIsDragging(true);
    const timer = setTimeout(() => {
      setIsSelecting(true);
      formula.startSelection();
      forceUpdate({});
    }, 500);
    setLongPressTimer(timer);
  }, [formula]);

  // 修改长按处理
  useEffect(() => {
    let pressTimer: NodeJS.Timeout;
    
    const startLongPress = () => {
      pressTimer = setTimeout(() => {
        setIsSelecting(true);
        formula.startSelection();
        forceUpdate({});
      }, 500);
    };
    
    const endLongPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
      }
    };

    return () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
      }
    };
  }, [formula]);

  return (
    <Card className="w-full max-w-4xl">
      <CardContent className="p-4">
        {/* 公式显示区域 */}
        <div className="mb-8 p-4 border rounded bg-white text-2xl text-center font-mono min-h-[100px] overflow-x-auto">
          {formula.getFormula(isSelecting)}
        </div>

        {/* 控制区域 - 使用 Grid 布局 */}
        <div className="grid grid-cols-2 gap-8">
          {/* 左侧：虚拟摇杆 */}
          <div className="flex flex-col items-center">
            <h3 className="text-sm font-medium mb-4">Navigation Control</h3>
            <div 
              className="relative w-40 h-40 bg-gray-100 rounded-full cursor-pointer select-none touch-none"
              onMouseDown={handleJoystickStart}
              onMouseMove={handleJoystickMove}
              onMouseUp={handleJoystickEnd}
              onMouseLeave={handleJoystickEnd}
              onTouchStart={(e) => {
                e.preventDefault();
                handleJoystickStart();
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                handleJoystickMove({
                  clientX: touch.clientX,
                  clientY: touch.clientY,
                  currentTarget: e.currentTarget,
                } as React.MouseEvent<HTMLDivElement>);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleJoystickEnd();
              }}
            >
              {/* 进度环 */}
              {pressProgress > 0 && (
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(rgb(59 130 246 / 0.2) ${pressProgress * 360}deg, transparent ${pressProgress * 360}deg)`,
                  }}
                />
              )}
              
              {/* 摇杆手柄 */}
              <div 
                className={`absolute w-16 h-16 rounded-full transition-all duration-75 ease-out ${
                  longPressTimer ? 'bg-blue-600 shadow-lg scale-110' : 'bg-blue-500'
                }`}
                style={{
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                  top: 'calc(50% - 32px)',
                  left: 'calc(50% - 32px)',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                {/* 方向指示器 */}
                {lastDirection && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                    {lastDirection === 'rightUp' && '↗'}
                    {lastDirection === 'rightDown' && '↘'}
                  </div>
                )}
              </div>
              
              <div className="absolute w-2 h-2 bg-gray-400 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* 右侧：数学符号键盘 */}
          <div className="flex flex-col">
            <h3 className="text-sm font-medium mb-4">Math Symbols</h3>
            <div className="grid grid-cols-4 gap-2">
              {/* 基础运算符 */}
              <button onClick={() => handleSymbolClick('+')} className="p-2 border rounded hover:bg-gray-100">+</button>
              <button onClick={() => handleSymbolClick('-')} className="p-2 border rounded hover:bg-gray-100">−</button>
              <button onClick={() => handleSymbolClick('×')} className="p-2 border rounded hover:bg-gray-100">×</button>
              <button onClick={() => handleSymbolClick('÷')} className="p-2 border rounded hover:bg-gray-100">÷</button>
              
              {/* 数字 */}
              {[7, 8, 9, '='].map((num: number | string) => (
                <button 
                  key={num} 
                  onClick={() => handleSymbolClick(num.toString())}
                  className="p-2 border rounded hover:bg-gray-100"
                >
                  {num}
                </button>
              ))}
              {[4, 5, 6, '('].map((num: number | string) => (
                <button 
                  key={num} 
                  onClick={() => handleSymbolClick(num.toString())}
                  className="p-2 border rounded hover:bg-gray-100"
                >
                  {num}
                </button>
              ))}
              {[1, 2, 3, ')'].map((num: number | string) => (
                <button 
                  key={num} 
                  onClick={() => handleSymbolClick(num.toString())}
                  className="p-2 border rounded hover:bg-gray-100"
                >
                  {num}
                </button>
              ))}
              {['0', '.', '⌫', ','].map((num: string) => (
                <button 
                  key={num} 
                  onClick={() => num === '⌫' ? formula.backspace() : handleSymbolClick(num)}
                  className="p-2 border rounded hover:bg-gray-100"
                >
                  {num}
                </button>
              ))}

              {/* 高级数学符号 */}
              <button onClick={() => handleSymbolClick('∫')} className="p-2 border rounded hover:bg-gray-100">∫</button>
              <button onClick={() => handleSymbolClick('d')} className="p-2 border rounded hover:bg-gray-100">d</button>
              <button onClick={() => handleSymbolClick('∂')} className="p-2 border rounded hover:bg-gray-100">∂</button>
              <button onClick={() => handleSymbolClick('∞')} className="p-2 border rounded hover:bg-gray-100">∞</button>
              
              <button onClick={() => handleSymbolClick('√')} className="p-2 border rounded hover:bg-gray-100">√</button>
              <button onClick={() => handleSymbolClick('∑')} className="p-2 border rounded hover:bg-gray-100">∑</button>
              <button onClick={() => handleSymbolClick('∏')} className="p-2 border rounded hover:bg-gray-100">∏</button>
              <button onClick={() => handleSymbolClick('π')} className="p-2 border rounded hover:bg-gray-100">π</button>

              <button onClick={() => handleSymbolClick('α')} className="p-2 border rounded hover:bg-gray-100">α</button>
              <button onClick={() => handleSymbolClick('β')} className="p-2 border rounded hover:bg-gray-100">β</button>
              <button onClick={() => handleSymbolClick('θ')} className="p-2 border rounded hover:bg-gray-100">θ</button>
              <button onClick={() => handleSymbolClick('λ')} className="p-2 border rounded hover:bg-gray-100">λ</button>
            </div>
          </div>
        </div>

        {/* 操作说明 */}
        <div className="mt-8 text-sm text-center text-gray-500">
          <div>← → : Move cursor left/right</div>
          <div>↗ Hold: Add superscript</div>
          <div>↘ Hold: Add subscript</div>
          <div>↖ ↙ ↑ ↓: Return to main text</div>
          <div className="mt-2">
            Click symbols or use keyboard for input
            <span className="ml-2">⌫: Delete</span>
          </div>
        </div>

        {/* 添加选择模式提示 */}
        {isSelecting && (
          <div className="mt-4 text-sm text-blue-600 text-center">
            Selection Mode: Rotate clockwise/counterclockwise to select text
            <br />
            Press ESC to cancel, Delete to remove selection
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FormulaEditor;