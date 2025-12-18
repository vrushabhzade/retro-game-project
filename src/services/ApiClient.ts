import { GameState, PlayerProfile, AIResponse, APIResponse } from '../types/GameTypes';

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage(): void {
    this.token = localStorage.getItem('auth_token');
  }

  private saveTokenToStorage(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  private removeTokenFromStorage(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const data: APIResponse<T> = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  public async register(
    username: string,
    email: string,
    password: string
  ): Promise<{ player: PlayerProfile; token: string }> {
    const response = await this.request<{ player: PlayerProfile; token: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      }
    );

    if (response.data) {
      this.saveTokenToStorage(response.data.token);
    }

    return response.data!;
  }

  public async login(
    username: string,
    password: string
  ): Promise<{ player: PlayerProfile; token: string }> {
    const response = await this.request<{ player: PlayerProfile; token: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );

    if (response.data) {
      this.saveTokenToStorage(response.data.token);
    }

    return response.data!;
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.removeTokenFromStorage();
    }
  }

  public async getProfile(): Promise<PlayerProfile> {
    const response = await this.request<{ player: PlayerProfile }>('/auth/profile');
    return response.data!.player;
  }

  public async updateProfile(updates: Partial<PlayerProfile>): Promise<PlayerProfile> {
    const response = await this.request<{ player: PlayerProfile }>(
      '/auth/profile',
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
    return response.data!.player;
  }

  public async updateVisualPreferences(preferences: any): Promise<void> {
    await this.request('/auth/visual-preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  // Game methods
  public async createNewGame(): Promise<GameState> {
    const response = await this.request<{ gameState: GameState }>('/game/new', {
      method: 'POST',
    });
    return response.data!.gameState;
  }

  public async loadGame(gameId: string): Promise<GameState> {
    const response = await this.request<{ gameState: GameState }>(`/game/${gameId}`);
    return response.data!.gameState;
  }

  public async getPlayerGames(): Promise<GameState[]> {
    const response = await this.request<{ games: GameState[] }>('/game/player/games');
    return response.data!.games;
  }

  public async movePlayer(
    gameId: string,
    direction: { x: number; y: number }
  ): Promise<{
    moveResult: any;
    gameState: GameState;
    aiResponse?: AIResponse;
  }> {
    const response = await this.request<{
      moveResult: any;
      gameState: GameState;
      aiResponse?: AIResponse;
    }>(`/game/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
    return response.data!;
  }

  public async performCombatAction(
    gameId: string,
    action: string,
    target?: string,
    itemId?: string
  ): Promise<{ message: string; gameState: GameState }> {
    const response = await this.request<{ message: string; gameState: GameState }>(
      `/game/${gameId}/combat`,
      {
        method: 'POST',
        body: JSON.stringify({ action, target, itemId }),
      }
    );
    return response.data!;
  }

  public async saveGame(gameId: string): Promise<void> {
    await this.request(`/game/${gameId}/save`, { method: 'POST' });
  }

  public async getAIGuidance(gameId: string, context: string = 'general_guidance'): Promise<AIResponse> {
    const response = await this.request<{ aiResponse: AIResponse }>(
      `/game/${gameId}/ai-guidance?context=${encodeURIComponent(context)}`
    );
    return response.data!.aiResponse;
  }

  // Utility methods
  public isAuthenticated(): boolean {
    return this.token !== null;
  }

  public getToken(): string | null {
    return this.token;
  }
}

export const apiClient = new ApiClient();