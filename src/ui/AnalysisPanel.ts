import { AnalysisPanelConfig, RetroStyle } from '../types/UITypes';
import { CombatAnalysis, TacticalSuggestion } from '../types/AITypes';
import { GameState } from '../types/GameTypes';
import { VisualAdaptationEngine } from '../ai/VisualAdaptationEngine';
import { GameCanvas } from './GameCanvas';
import { handleError } from '../utils/ErrorHandling';

/**
 * Analysis panel for displaying combat analysis and tactical suggestions
 * Adapts complexity based on player skill level
 */
export class AnalysisPanel {
  private canvas: GameCanvas;
  private visualAdapter: VisualAdaptationEngine;
  private config: AnalysisPanelConfig;
  private retroStyle: RetroStyle;
  private isVisible: boolean = false;
  private currentAnalysis: CombatAnalysis | null = null;
  private suggestions: TacticalSuggestion[] = [];
  private scrollOffset: number = 0;

  constructor(canvas: GameCanvas, visualAdapter: VisualAdaptationEngine) {
    this.canvas = canvas;
    this.visualAdapter = visualAdapter;
    this.config = this.visualAdapter.getAnalysisPanelConfig();
    this.retroStyle = this.canvas.getRetroStyle();
  }

  /**
   * Show the analysis panel with combat data
   */
  public show(analysis?: CombatAnalysis, suggestions?: TacticalSuggestion[]): void {
    try {
      this.isVisible = true;
      
      if (analysis) {
        this.currentAnalysis = analysis;
      }
      
      if (suggestions) {
        this.suggestions = suggestions;
      }

      // Update configuration based on current UI complexity
      this.updateConfiguration();

    } catch (error) {
      handleError(error, 'Failed to show analysis panel', { 
        context: 'AnalysisPanel.show' 
      });
    }
  }

  /**
   * Hide the analysis panel
   */
  public hide(): void {
    this.isVisible = false;
    this.scrollOffset = 0;
  }

  /**
   * Toggle panel visibility
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Render the analysis panel
   */
  public render(_gameState: GameState): void {
    try {
      if (!this.isVisible) return;

      const uiComplexity = this.visualAdapter.getCurrentUIComplexity();
      
      // Auto-hide for minimal complexity
      if (uiComplexity === 'minimal' && this.config.autoHide) {
        return;
      }

      // Calculate panel position
      const canvasWidth = this.canvas.getCanvas().width;
      const canvasHeight = this.canvas.getCanvas().height;
      
      let panelX: number;
      switch (this.config.position) {
        case 'left':
          panelX = 10;
          break;
        case 'right':
          panelX = canvasWidth - this.config.width - 10;
          break;
        case 'bottom':
          panelX = (canvasWidth - this.config.width) / 2;
          break;
        default:
          panelX = canvasWidth - this.config.width - 10;
      }

      const panelY = this.config.position === 'bottom' ? 
        canvasHeight - this.config.height - 10 : 10;

      // Render panel background
      this.renderBackground(panelX, panelY);

      // Render content based on UI complexity
      switch (uiComplexity) {
        case 'standard':
          this.renderBasicContent(panelX, panelY);
          break;
        case 'detailed':
          this.renderDetailedContent(panelX, panelY);
          break;
        case 'comprehensive':
          this.renderComprehensiveContent(panelX, panelY);
          break;
      }

    } catch (error) {
      handleError(error, 'Failed to render analysis panel', { 
        context: 'AnalysisPanel.render' 
      });
    }
  }

  /**
   * Render panel background with retro styling
   */
  private renderBackground(x: number, y: number): void {
    try {
      const colors = this.retroStyle.colorPalette;
      
      // Semi-transparent background
      const context = this.canvas.getContext();
      context.save();
      context.globalAlpha = this.config.transparency;
      
      this.canvas.renderRectangle(
        x, y, 
        this.config.width, this.config.height,
        colors[0] || '#000000',
        colors[1] || '#FFFFFF'
      );
      
      context.restore();

      // Title bar
      this.canvas.renderRectangle(
        x, y, 
        this.config.width, 20,
        colors[7] || '#CCCCCC',
        colors[0] || '#000000'
      );

      this.canvas.renderText('Analysis', x + 5, y + 5, colors[0], 12);

    } catch (error) {
      handleError(error, 'Failed to render panel background', { 
        context: 'AnalysisPanel.renderBackground' 
      });
    }
  }

  /**
   * Render basic content for standard UI complexity
   */
  private renderBasicContent(x: number, y: number): void {
    try {
      const colors = this.retroStyle.colorPalette;
      let currentY = y + 25;

      // Show basic combat efficiency if available
      if (this.currentAnalysis) {
        const efficiency = Math.round(this.currentAnalysis.playerEfficiency * 100);
        this.canvas.renderText(
          `Efficiency: ${efficiency}%`, 
          x + 5, currentY, 
          colors[1], 10
        );
        currentY += 15;

        // Show outcome
        const outcomeColor = this.currentAnalysis.outcome === 'victory' ? 
          colors[3] : colors[2]; // Green for victory, red for defeat
        this.canvas.renderText(
          `Result: ${this.currentAnalysis.outcome}`, 
          x + 5, currentY, 
          outcomeColor, 10
        );
        currentY += 15;
      }

      // Show most important suggestion
      if (this.suggestions.length > 0) {
        const topSuggestion = this.suggestions
          .filter(s => s.priority === 'high' || s.priority === 'critical')[0] ||
          this.suggestions[0];

        if (topSuggestion) {
          this.canvas.renderText('Tip:', x + 5, currentY, colors[5], 10);
          currentY += 12;
          
          const wrappedText = this.wrapText(topSuggestion.message, this.config.width - 10);
          wrappedText.forEach(line => {
            this.canvas.renderText(line, x + 5, currentY, colors[1], 9);
            currentY += 11;
          });
        }
      }

    } catch (error) {
      handleError(error, 'Failed to render basic content', { 
        context: 'AnalysisPanel.renderBasicContent' 
      });
    }
  }

  /**
   * Render detailed content for detailed UI complexity
   */
  private renderDetailedContent(x: number, y: number): void {
    try {
      const colors = this.retroStyle.colorPalette;
      let currentY = y + 25;

      if (this.currentAnalysis) {
        // Combat statistics
        this.canvas.renderText('Combat Stats:', x + 5, currentY, colors[5], 10);
        currentY += 15;

        const efficiency = Math.round(this.currentAnalysis.playerEfficiency * 100);
        this.canvas.renderText(`Efficiency: ${efficiency}%`, x + 10, currentY, colors[1], 9);
        currentY += 12;

        this.canvas.renderText(`Duration: ${Math.round(this.currentAnalysis.duration / 1000)}s`, x + 10, currentY, colors[1], 9);
        currentY += 12;

        this.canvas.renderText(`Turns: ${this.currentAnalysis.turns.length}`, x + 10, currentY, colors[1], 9);
        currentY += 15;

        // Damage analysis
        if (this.currentAnalysis.damageAnalysis) {
          this.canvas.renderText('Damage:', x + 5, currentY, colors[5], 10);
          currentY += 15;

          this.canvas.renderText(`Dealt: ${this.currentAnalysis.damageAnalysis.totalDamageDealt}`, x + 10, currentY, colors[1], 9);
          currentY += 12;

          this.canvas.renderText(`Taken: ${this.currentAnalysis.damageAnalysis.totalDamageTaken}`, x + 10, currentY, colors[1], 9);
          currentY += 15;
        }
      }

      // Show top suggestions
      if (this.suggestions.length > 0) {
        this.canvas.renderText('Suggestions:', x + 5, currentY, colors[5], 10);
        currentY += 15;

        const topSuggestions = this.suggestions
          .sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority))
          .slice(0, 3);

        topSuggestions.forEach(suggestion => {
          const priorityColor = this.getPriorityColor(suggestion.priority, colors);
          this.canvas.renderText(`• ${suggestion.type}`, x + 10, currentY, priorityColor, 9);
          currentY += 11;

          const wrappedText = this.wrapText(suggestion.message, this.config.width - 20);
          wrappedText.slice(0, 2).forEach(line => { // Limit to 2 lines
            this.canvas.renderText(line, x + 15, currentY, colors[1], 8);
            currentY += 10;
          });
          currentY += 5;
        });
      }

    } catch (error) {
      handleError(error, 'Failed to render detailed content', { 
        context: 'AnalysisPanel.renderDetailedContent' 
      });
    }
  }

  /**
   * Render comprehensive content for comprehensive UI complexity
   */
  private renderComprehensiveContent(x: number, y: number): void {
    try {
      const colors = this.retroStyle.colorPalette;
      let currentY = y + 25;
      const maxY = y + this.config.height - 10;

      if (this.currentAnalysis) {
        // Detailed combat analysis
        this.canvas.renderText('Combat Analysis:', x + 5, currentY, colors[5], 10);
        currentY += 15;

        // Efficiency with color coding
        const efficiency = Math.round(this.currentAnalysis.playerEfficiency * 100);
        const efficiencyColor = efficiency >= 80 ? colors[3] : efficiency >= 60 ? colors[5] : colors[2];
        this.canvas.renderText(`Efficiency: ${efficiency}%`, x + 10, currentY, efficiencyColor, 9);
        currentY += 12;

        // Detailed stats
        this.canvas.renderText(`Duration: ${Math.round(this.currentAnalysis.duration / 1000)}s`, x + 10, currentY, colors[1], 9);
        currentY += 12;

        this.canvas.renderText(`Turns: ${this.currentAnalysis.turns.length}`, x + 10, currentY, colors[1], 9);
        currentY += 12;

        this.canvas.renderText(`Outcome: ${this.currentAnalysis.outcome}`, x + 10, currentY, colors[1], 9);
        currentY += 15;

        // Damage breakdown
        if (this.currentAnalysis.damageAnalysis) {
          this.canvas.renderText('Damage Analysis:', x + 5, currentY, colors[5], 10);
          currentY += 15;

          const dmg = this.currentAnalysis.damageAnalysis;
          this.canvas.renderText(`Dealt: ${dmg.totalDamageDealt} (Optimal: ${dmg.optimalDamageDealt})`, x + 10, currentY, colors[1], 8);
          currentY += 10;

          this.canvas.renderText(`Taken: ${dmg.totalDamageTaken} (Optimal: ${dmg.optimalDamageTaken})`, x + 10, currentY, colors[1], 8);
          currentY += 10;

          this.canvas.renderText(`Wasted Actions: ${dmg.wastedActions}`, x + 10, currentY, colors[2], 8);
          currentY += 15;
        }

        // Turn-by-turn efficiency graph (simplified)
        if (this.currentAnalysis.turns.length > 0) {
          this.canvas.renderText('Turn Efficiency:', x + 5, currentY, colors[5], 10);
          currentY += 15;

          this.renderEfficiencyGraph(x + 10, currentY, this.config.width - 20, 30, this.currentAnalysis.turns, colors);
          currentY += 40;
        }
      }

      // Comprehensive suggestions with scrolling
      if (this.suggestions.length > 0 && currentY < maxY) {
        this.canvas.renderText('All Suggestions:', x + 5, currentY, colors[5], 10);
        currentY += 15;

        const visibleSuggestions = this.suggestions.slice(this.scrollOffset);
        
        for (const suggestion of visibleSuggestions) {
          if (currentY >= maxY - 30) break; // Leave space for scroll indicator

          const priorityColor = this.getPriorityColor(suggestion.priority, colors);
          this.canvas.renderText(`[${suggestion.priority.toUpperCase()}] ${suggestion.type}`, x + 10, currentY, priorityColor, 8);
          currentY += 10;

          const wrappedText = this.wrapText(suggestion.message, this.config.width - 20);
          for (const line of wrappedText) {
            if (currentY >= maxY - 20) break;
            this.canvas.renderText(line, x + 15, currentY, colors[1], 8);
            currentY += 9;
          }

          if (suggestion.reasoning && currentY < maxY - 20) {
            this.canvas.renderText(`Reason: ${suggestion.reasoning}`, x + 15, currentY, colors[7], 7);
            currentY += 8;
          }
          
          currentY += 5;
        }

        // Scroll indicator
        if (this.suggestions.length > visibleSuggestions.length) {
          this.canvas.renderText('...more (scroll)', x + 10, maxY - 15, colors[6], 8);
        }
      }

    } catch (error) {
      handleError(error, 'Failed to render comprehensive content', { 
        context: 'AnalysisPanel.renderComprehensiveContent' 
      });
    }
  }

  /**
   * Render efficiency graph for comprehensive view
   */
  private renderEfficiencyGraph(x: number, y: number, width: number, height: number, turns: any[], colors: string[]): void {
    try {
      // Background
      this.canvas.renderRectangle(x, y, width, height, colors[0], colors[1]);

      if (turns.length === 0) return;

      const stepWidth = width / turns.length;
      
      // Draw efficiency line
      const context = this.canvas.getContext();
      context.strokeStyle = colors[3] || '#00FF00';
      context.lineWidth = 1;
      context.beginPath();

      turns.forEach((turn, index) => {
        const turnX = x + index * stepWidth + stepWidth / 2;
        const turnY = y + height - (turn.efficiency * height);
        
        if (index === 0) {
          context.moveTo(turnX, turnY);
        } else {
          context.lineTo(turnX, turnY);
        }
      });

      context.stroke();

      // Draw average line
      const avgEfficiency = turns.reduce((sum, turn) => sum + turn.efficiency, 0) / turns.length;
      const avgY = y + height - (avgEfficiency * height);
      
      context.strokeStyle = colors[5] || '#FFFF00';
      context.setLineDash([2, 2]);
      context.beginPath();
      context.moveTo(x, avgY);
      context.lineTo(x + width, avgY);
      context.stroke();
      context.setLineDash([]);

    } catch (error) {
      handleError(error, 'Failed to render efficiency graph', { 
        context: 'AnalysisPanel.renderEfficiencyGraph' 
      });
    }
  }

  /**
   * Update configuration based on visual adapter
   */
  private updateConfiguration(): void {
    try {
      this.config = this.visualAdapter.getAnalysisPanelConfig();
      this.retroStyle = this.canvas.getRetroStyle();
    } catch (error) {
      handleError(error, 'Failed to update configuration', { 
        context: 'AnalysisPanel.updateConfiguration' 
      });
    }
  }

  /**
   * Wrap text to fit within specified width
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    // Approximate character width (this is simplified)
    const charWidth = 6;
    const maxChars = Math.floor(maxWidth / charWidth);

    for (const word of words) {
      if ((currentLine + word).length <= maxChars) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Get priority value for sorting
   */
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * Get color for priority level
   */
  private getPriorityColor(priority: string, colors: string[]): string {
    switch (priority) {
      case 'critical': return colors[2] || '#FF0000'; // Red
      case 'high': return colors[5] || '#FFFF00'; // Yellow
      case 'medium': return colors[1] || '#FFFFFF'; // White
      case 'low': return colors[7] || '#CCCCCC'; // Gray
      default: return colors[1] || '#FFFFFF';
    }
  }

  /**
   * Scroll suggestions up
   */
  public scrollUp(): void {
    this.scrollOffset = Math.max(0, this.scrollOffset - 1);
  }

  /**
   * Scroll suggestions down
   */
  public scrollDown(): void {
    this.scrollOffset = Math.min(this.suggestions.length - 1, this.scrollOffset + 1);
  }

  /**
   * Set combat analysis data
   */
  public setCombatAnalysis(analysis: CombatAnalysis): void {
    this.currentAnalysis = analysis;
  }

  /**
   * Set tactical suggestions
   */
  public setSuggestions(suggestions: TacticalSuggestion[]): void {
    this.suggestions = suggestions;
  }

  /**
   * Check if panel is visible
   */
  public isShown(): boolean {
    return this.isVisible;
  }

  /**
   * Get current configuration
   */
  public getConfig(): AnalysisPanelConfig {
    return { ...this.config };
  }
}