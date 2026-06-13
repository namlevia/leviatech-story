// Configure base URL correctly. Use absolute URL to bypass Next.js proxy and prevent SSE buffering.
const API_BASE_URL = 'http://127.0.0.1:1997/api';

export interface ProjectCreateReq {
  title: string;
  genre: string;
  sub_genres: string[];
  character_setting?: string;
  world_setting?: string;
  plot_idea?: string;
}

export interface Project {
  id: string;
  title: string;
  genre: string;
  sub_genres: string[];
  character_setting: string;
  world_setting: string;
  plot_idea: string;
  created_at: string;
  updated_at: string;
  chapters?: any[];
}

export interface LoreEntry {
  id: number;
  project_id: string;
  name: string;
  category: string;
  keywords: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface OutlineReq {
  title: string;
  genre: string;
  sub_genres: string[];
  total_chapters: number;
  character_setting: string;
  world_setting: string;
  plot_idea: string;
  custom_outline_prompt?: string;
}

export const api = {
  // Check health
  async checkHealth() {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('Network error');
    return res.json();
  },

  // Projects
  async listProjects() {
    const res = await fetch(`${API_BASE_URL}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async getProject(id: string) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`);
    if (!res.ok) throw new Error('Failed to fetch project');
    return res.json();
  },

  async deleteProject(id: string) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete project');
    return res.json();
  },

  async exportProject(id: string, format: string) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}/export?format=${encodeURIComponent(format)}`, {
      method: 'POST',
    });
    
    if (!res.ok) {
      throw new Error('Failed to export project');
    }

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return res.json();
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    let filename = `export_${id}.${format}`;
    const xFilename = res.headers.get('X-Filename');
    
    if (xFilename) {
      try {
        filename = decodeURIComponent(xFilename);
      } catch (e) {
        filename = xFilename;
      }
    } else {
      const disposition = res.headers.get('content-disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    return { success: true, file_path: filename };
  },

  // Get/Set Prompts
  async getPrompts() {
    const res = await fetch(`${API_BASE_URL}/config/prompts`);
    if (!res.ok) throw new Error('Failed to fetch prompts');
    return res.json();
  },

  async updatePrompts(prompts: any) {
    const res = await fetch(`${API_BASE_URL}/config/prompts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prompts),
    });
    if (!res.ok) throw new Error('Failed to update prompts');
    return res.json();
  },

  // Get genres
  async getGenres() {
    const res = await fetch(`${API_BASE_URL}/genres`);
    if (!res.ok) throw new Error('Failed to fetch genres');
    return res.json();
  },

  // Generate outline
  async generateOutline(data: OutlineReq) {
    const res = await fetch(`${API_BASE_URL}/generator/outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Outline generation failed');
    return res.json();
  },

  async suggestTitle(data: { genre: string; sub_genres: string[]; custom_prompt?: string }) {
    const res = await fetch(`${API_BASE_URL}/generator/suggest-title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Suggest title failed');
    return res.json();
  },

  async suggestContent(data: { 
    content_type: string; 
    title: string; 
    genre: string; 
    sub_genres: string[]; 
    character_setting?: string; 
    world_setting?: string; 
    custom_prompt?: string; 
    num_main_chars?: number; 
    num_sub_chars?: number; 
  }) {
    const res = await fetch(`${API_BASE_URL}/generator/suggest-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Suggest ${data.content_type} failed`);
    return res.json();
  },

  async suggestStyleTone(data: { genre: string; sub_genres: string[] }) {
    const res = await fetch(`${API_BASE_URL}/generator/suggest-style-tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Suggest style tone failed');
    return res.json();
  },

  // Create project
  async createProject(data: ProjectCreateReq) {
    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Create project failed');
    return res.json();
  },

  // Update project
  async updateProject(id: string, data: any) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Update project failed');
    return res.json();
  },

  async getGenerationCache(projectId: string) {
    const res = await fetch(`${API_BASE_URL}/generator/cache/generation/${projectId}`);
    if (!res.ok) return null;
    return res.json();
  },
  async saveGenerationCache(projectId: string, data: any) {
    const res = await fetch(`${API_BASE_URL}/generator/cache/generation/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Save cache failed');
    return res.json();
  },
  async clearGenerationCache(projectId: string) {
    const res = await fetch(`${API_BASE_URL}/generator/cache/generation/${projectId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Clear cache failed');
    return res.json();
  },

  // --- LOREBOOK APIs ---
  async getLoreEntries(projectId: string): Promise<LoreEntry[]> {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/lore`);
    if (!res.ok) throw new Error('Failed to fetch lore entries');
    return res.json();
  },
  async createLoreEntry(projectId: string, data: Omit<LoreEntry, 'id' | 'project_id' | 'created_at' | 'updated_at'>): Promise<LoreEntry> {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/lore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create lore entry');
    return res.json();
  },
  async updateLoreEntry(id: number, data: Omit<LoreEntry, 'id' | 'project_id' | 'created_at' | 'updated_at'>): Promise<LoreEntry> {
    const res = await fetch(`${API_BASE_URL}/lore/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update lore entry');
    return res.json();
  },
  async deleteLoreEntry(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/lore/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete lore entry');
  },

  // Get generic config
  async getGenerationConfig() {
    const res = await fetch(`${API_BASE_URL}/config/generation`);
    if (!res.ok) throw new Error('Failed to fetch config');
    return res.json();
  },

  async updateGenerationConfig(data: any) {
    const res = await fetch(`${API_BASE_URL}/config/generation`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update config');
    return res.json();
  },

  async getBackends() {
    const res = await fetch(`${API_BASE_URL}/config/backends`);
    if (!res.ok) throw new Error('Failed to fetch backends');
    const json = await res.json();
    return json.data || [];
  },

  async addBackend(data: any) {
    const res = await fetch(`${API_BASE_URL}/config/backends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add backend');
    return res.json();
  },

  async updateBackend(name: string, data: any) {
    const res = await fetch(`${API_BASE_URL}/config/backends/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update backend');
    return res.json();
  },

  async fetchModels(data: { type: string, base_url: string, api_key: string }) {
    const res = await fetch(`${API_BASE_URL}/config/backends/fetch-models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to fetch models');
    return json;
  },

  async testConnection(data: { type: string, base_url: string, api_key: string, model: string }) {
    const res = await fetch(`${API_BASE_URL}/config/backends/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to test connection');
    return json;
  },

  async deleteBackend(name: string) {
    const res = await fetch(`${API_BASE_URL}/config/backends/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete backend');
    return res.json();
  },

  async toggleBackend(name: string) {
    const res = await fetch(`${API_BASE_URL}/config/backends/${encodeURIComponent(name)}/toggle`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to toggle backend');
    return res.json();
  },

  async setDefaultBackend(name: string) {
    const res = await fetch(`${API_BASE_URL}/config/backends/${encodeURIComponent(name)}/default`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to set default backend');
    return res.json();
  },

  async testBackend(name: string) {
    const res = await fetch(`${API_BASE_URL}/config/backends/${encodeURIComponent(name)}/test`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to test backend');
    return data;
  },

  async getLogs() {
    const res = await fetch(`${API_BASE_URL}/logs`);
    if (!res.ok) throw new Error('Failed to fetch logs');
    return res.json();
  },

  // Task Management
  async listTasks() {
    const res = await fetch(`${API_BASE_URL}/tasks`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async startBulkGen(data: { project_id: string, chapter_nums: number[], use_reflection?: boolean }) {
    const res = await fetch(`${API_BASE_URL}/tasks/generate-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to start bulk generation');
    return res.json();
  },

  async cancelTask(taskId: string) {
    const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Data Management (Genres, Sub-genres, Styles)
  async getDataItems(type: 'genres' | 'sub_genres' | 'styles' | 'tones') {
    const res = await fetch(`${API_BASE_URL}/data/${type}`);
    if (!res.ok) throw new Error(`Failed to fetch ${type}`);
    return res.json();
  },

  async addDataItem(type: 'genres' | 'sub_genres' | 'styles' | 'tones', data: { name: string, description: string }) {
    const res = await fetch(`${API_BASE_URL}/data/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to add ${type}`);
    return res.json();
  },

  async updateDataItem(type: 'genres' | 'sub_genres' | 'styles' | 'tones', oldName: string, data: { name: string, description: string }) {
    const res = await fetch(`${API_BASE_URL}/data/${type}/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update ${type}`);
    return res.json();
  },

  async deleteDataItem(type: 'genres' | 'sub_genres' | 'styles' | 'tones', name: string) {
    const res = await fetch(`${API_BASE_URL}/data/${type}/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete ${type}`);
    return res.json();
  }
};
